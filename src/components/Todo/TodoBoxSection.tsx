// TodoBoxSection.tsx

import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";

import SortableItem from "./SortableItem";
import { useFirestoreHistory } from "./hooks/useFirestoreHistory";

// ⬇️ Firestore 추가
import {
  getFirestore,
  doc,
  runTransaction,
  serverTimestamp,
  onSnapshot,
  getDoc,
} from "firebase/firestore";

interface TodoItem {
  id: string;
  text: string;
  count?: string;
  unit?: string;
  status?: "none" | "blue" | "red";
}
interface TodoBox {
  id: string;
  title: string;
  items: TodoItem[];
  mode: "default" | "shopping";
}

// === 옵션 플래그 ===
const USE_REALTIME_SNAPSHOT = true;
const USE_FOCUS_REFRESH = true;

// === Firestore 트랜잭션 유틸들 ===
const boxesRef = () => {
  const db = getFirestore();
  return doc(db, "sharedData", "main");
};

// 박스 추가
async function txAddBox(mode: "default" | "shopping") {
  await runTransaction(getFirestore(), async (tx) => {
    const ref = boxesRef();
    const snap = await tx.get(ref);
    const data = snap.data() || {};
    const items: TodoBox[] = Array.isArray(data.items) ? data.items : [];
    const newBox: TodoBox = {
      id: uuidv4(),
      title: mode === "shopping" ? "장보기" : "제목 없음",
      items: [],
      mode,
    };
    tx.update(ref, {
      items: [...items, newBox],
      updatedAt: serverTimestamp(),
    });
  });
}

// 박스 삭제
async function txRemoveBox(boxId: string) {
  await runTransaction(getFirestore(), async (tx) => {
    const ref = boxesRef();
    const snap = await tx.get(ref);
    const data = snap.data() || {};
    const items: TodoBox[] = Array.isArray(data.items) ? data.items : [];
    const next = items.filter((b) => b.id !== boxId);
    tx.update(ref, { items: next, updatedAt: serverTimestamp() });
  });
}

// 박스 제목 변경
async function txChangeTitle(boxId: string, value: string) {
  await runTransaction(getFirestore(), async (tx) => {
    const ref = boxesRef();
    const snap = await tx.get(ref);
    const data = snap.data() || {};
    const items: TodoBox[] = Array.isArray(data.items) ? data.items : [];
    const next = items.map((b) =>
      b.id === boxId ? { ...b, title: value } : b
    );
    tx.update(ref, { items: next, updatedAt: serverTimestamp() });
  });
}

// 박스 순서 변경(activeId를 overId 위치로 이동)
async function txReorderBoxes(activeId: string, overId: string) {
  await runTransaction(getFirestore(), async (tx) => {
    const ref = boxesRef();
    const snap = await tx.get(ref);
    const data = snap.data() || {};
    const items: TodoBox[] = Array.isArray(data.items) ? data.items : [];
    const oldIdx = items.findIndex((b) => b.id === activeId);
    const newIdx = items.findIndex((b) => b.id === overId);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(items, oldIdx, newIdx);
    tx.update(ref, { items: next, updatedAt: serverTimestamp() });
  });
}

// 아이템 추가
async function txAddItem(boxId: string, item: TodoItem) {
  await runTransaction(getFirestore(), async (tx) => {
    const ref = boxesRef();
    const snap = await tx.get(ref);
    const data = snap.data() || {};
    const items: TodoBox[] = Array.isArray(data.items) ? data.items : [];
    const next = items.map((b) =>
      b.id === boxId ? { ...b, items: [...b.items, item] } : b
    );
    tx.update(ref, { items: next, updatedAt: serverTimestamp() });
  });
}

// 아이템 삭제
async function txRemoveItem(boxId: string, itemId: string) {
  await runTransaction(getFirestore(), async (tx) => {
    const ref = boxesRef();
    const snap = await tx.get(ref);
    const data = snap.data() || {};
    const items: TodoBox[] = Array.isArray(data.items) ? data.items : [];
    const next = items.map((b) =>
      b.id === boxId
        ? { ...b, items: b.items.filter((i) => i.id !== itemId) }
        : b
    );
    tx.update(ref, { items: next, updatedAt: serverTimestamp() });
  });
}

// 아이템 필드 변경
async function txChangeItemField(
  boxId: string,
  itemId: string,
  field: "text" | "count" | "unit" | "status",
  value: string
) {
  await runTransaction(getFirestore(), async (tx) => {
    const ref = boxesRef();
    const snap = await tx.get(ref);
    const data = snap.data() || {};
    const items: TodoBox[] = Array.isArray(data.items) ? data.items : [];
    const next = items.map((b) =>
      b.id === boxId
        ? {
            ...b,
            items: b.items.map((i) =>
              i.id === itemId ? { ...i, [field]: value } : i
            ),
          }
        : b
    );
    tx.update(ref, { items: next, updatedAt: serverTimestamp() });
  });
}

// 아이템 순서 변경 (newItems의 id 순서를 최신 스냅샷에 반영)
async function txReorderItems(boxId: string, newItems: TodoItem[]) {
  await runTransaction(getFirestore(), async (tx) => {
    const ref = boxesRef();
    const snap = await tx.get(ref);
    const data = snap.data() || {};
    const items: TodoBox[] = Array.isArray(data.items) ? data.items : [];

    const target = items.find((b) => b.id === boxId);
    if (!target) return;

    const byId = new Map(target.items.map((it) => [it.id, it]));
    const ordered = newItems
      .map((ni) => byId.get(ni.id))
      .filter(Boolean) as TodoItem[];

    // 혹시 스냅샷에만 있고 newItems에 없는 항목이 있다면(동시 편집),
    // 뒤에 그대로 붙여 보존
    const missing = target.items.filter(
      (it) => !newItems.some((ni) => ni.id === it.id)
    );

    const nextItems = [...ordered, ...missing];

    const next = items.map((b) =>
      b.id === boxId ? { ...b, items: nextItems } : b
    );

    tx.update(ref, { items: next, updatedAt: serverTimestamp() });
  });
}

// 박스 한 칸 내리기
async function txMoveBoxDown(boxId: string) {
  await runTransaction(getFirestore(), async (tx) => {
    const ref = boxesRef();
    const snap = await tx.get(ref);
    const data = snap.data() || {};
    const items: TodoBox[] = Array.isArray(data.items) ? data.items : [];
    const idx = items.findIndex((b) => b.id === boxId);
    if (idx < 0 || idx === items.length - 1) return;
    const next = arrayMove(items, idx, idx + 1);
    tx.update(ref, { items: next, updatedAt: serverTimestamp() });
  });
}

// =========================== SortableBox ===========================
function SortableBox({
  box,
  activeBox,
  isDragging,
  setActiveBox,
  onChangeTitle,
  onChangeItem,
  onAddItem,
  onRemoveItem,
  toggleItemSelection,
  onChangeItemOrder,
  selectedItemIds,
  moveBoxDown,
  isLastBox,
}: {
  box: TodoBox;
  activeBox: TodoBox | null;
  isDragging: boolean;
  setActiveBox: (b: TodoBox | null) => void;
  onChangeTitle: (id: string, value: string) => void;
  onChangeItem: (
    boxId: string,
    itemId: string,
    value: string,
    field?: "text" | "count" | "unit" | "status"
  ) => void;
  onAddItem: (boxId: string, item: TodoItem) => void;
  onRemoveItem: (boxId: string, itemId: string) => void;
  toggleItemSelection: (boxId: string, itemId: string) => void;
  onChangeItemOrder: (boxId: string, newItems: TodoItem[]) => void;
  selectedItemIds: { [boxId: string]: string[] };
  moveBoxDown: (id: string) => void;
  isLastBox: boolean;
}) {
  const { attributes, listeners, setNodeRef } = useSortable({ id: box.id });
  const [collapsed, setCollapsed] = useState(false);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [newText, setNewText] = useState("");
  const [newCount, setNewCount] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const countRef = useRef<HTMLInputElement>(null);
  const unitRef = useRef<HTMLInputElement>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingCountId, setEditingCountId] = useState<string | null>(null);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  const handleAddItem = () => {
    if (!newText.trim()) {
      nameRef.current?.focus();
      return;
    }
    if (box.mode === "shopping" && !newCount.trim()) {
      countRef.current?.focus();
      return;
    }
    if (box.mode === "shopping" && !newUnit.trim()) {
      unitRef.current?.focus();
      return;
    }

    onAddItem(
      box.id,
      {
        id: uuidv4(),
        text: newText.trim(),
        count: newCount.trim(),
        unit: newUnit.trim(),
        status: "none",
      }
    );

    setNewText("");
    setNewCount("");
    setNewUnit("");
    nameRef.current?.focus();
  };

  return (
    <div
      ref={setNodeRef}
      onClick={(e) => {
        if (isDragging) return;
        const tag = (e.target as HTMLElement).tagName.toLowerCase();
        if (["input", "textarea", "button", "select"].includes(tag)) return;
        setActiveBox(activeBox?.id === box.id ? null : box);
      }}
      style={{
        opacity: isDragging && activeBox?.id === box.id ? 0 : 1,
        visibility: "visible",
        height: "auto",
        touchAction: isDragging ? "none" : "auto",
      }}
      className="border border-gray-300 dark:border-zinc-700 p-2 rounded shadow bg-white dark:bg-zinc-900 text-black dark:text-white w-full transition-opacity"
    >
      {/* 제목 + 핸들러 */}
      <div className="flex items-center gap-1 mb-2">
        <button
          {...attributes}
          {...listeners}
          onMouseDown={(e) => {
            dragTimeoutRef.current = setTimeout(() => {
              listeners.onPointerDown?.(e as unknown as PointerEvent);
            }, 300);
          }}
          onMouseUp={() => {
            if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
          }}
          onMouseLeave={() => {
            if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
          }}
          onClick={(e) => {
            e.stopPropagation();
            setCollapsed((prev) => !prev);
          }}
          className="mx-1 text-zinc-300 cursor-pointer text-sm transition"
          title="길게 누르면 드래그 / 클릭하면 접기/펼치기"
        >
          {collapsed ? "▷" : "▽"}
        </button>

        <input
          className="flex-1 min-w-0 text-blue-700 dark:text-blue-300 bg-transparent outline-none truncate text-xs"
          value={box.title}
          onChange={(e) => onChangeTitle(box.id, e.target.value)}
        />
        <button
          onClick={() => onRemoveItem(box.id, "__box__")}
          className="ml-2 px-2 mr-1 text-zinc-400 rounded hover:bg-zinc-700 transition text-sm shrink-0"
          title="소주제 삭제"
        >
          X
        </button>
      </div>

      {/* 리스트/입력 */}
      {!collapsed && (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => {
              const { active, over } = event as DragEndEvent;
              if (!over || active.id === over.id) return;
              const oldIndex = box.items.findIndex((i) => i.id === active.id);
              const newIndex = box.items.findIndex((i) => i.id === over.id);
              if (oldIndex < 0 || newIndex < 0) return;
              // 로컬에서 순서 만든 뒤 → 트랜잭션에 id순서 반영
              const next = arrayMove(box.items, oldIndex, newIndex);
              onChangeItemOrder(box.id, next);
            }}
          >
            <SortableContext
              items={box.items.map((i) => i.id)}
              strategy={rectSortingStrategy}
            >
              <ul className="mb-2">
                {box.items.map((item) => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    boxId={box.id}
                    boxMode={box.mode}
                    isSelected={
                      selectedItemIds[box.id]?.includes(item.id) || false
                    }
                    isLowCount={
                      box.mode === "shopping" && Number(item.count || 0) <= 3
                    }
                    onToggle={toggleItemSelection}
                    onChangeItem={onChangeItem}
                    onRemoveItem={onRemoveItem}
                    editingItemId={editingItemId}
                    setEditingItemId={setEditingItemId}
                    editingCountId={editingCountId}
                    setEditingCountId={setEditingCountId}
                    editingUnitId={editingUnitId}
                    setEditingUnitId={setEditingUnitId}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>

          {/* 입력 */}
          <div className="flex items-center border border-gray-300 dark:border-zinc-700 p-1 rounded">
            <div className="w-5 h-5 mr-2" />
            <input
              ref={nameRef}
              className="flex-[6] min-w-0 outline-none text-sm bg-white dark:bg-zinc-900 text-black dark:text-white px-1 py-0.5 rounded"
              placeholder="새 항목"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddItem();
                }
              }}
            />
            {box.mode === "shopping" && (
              <>
                <input
                  ref={countRef}
                  className="flex-[2] min-w-0 outline-none bg-white dark:bg-zinc-900 text-black dark:text-white text-sm text-right px-1 py-0.5 "
                  placeholder="수량"
                  value={newCount}
                  onChange={(e) => setNewCount(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddItem();
                    }
                  }}
                />
                <input
                  ref={unitRef}
                  className="flex-[2] min-w-0 outline-none bg-white dark:bg-zinc-900 text-black dark:text-white text-sm text-right px-1 py-0.5 "
                  placeholder="단위"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddItem();
                    }
                  }}
                />
              </>
            )}
            <button
              onClick={handleAddItem}
              className="px-1 py-0.5 text-sm shrink-0 rounded transition
             bg-gray-200 text-black hover:bg-gray-300
             dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
            >
              +
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// =========================== 섹션 ===========================
export default function TodoBoxSection() {
  // ✅ useFirestoreHistory는 selection용으로만 사용 (배열 저장은 모두 트랜잭션)
  const {
    items: _unusedItems,
    updateWithHistory: _unusedUpdate,
    selectedItemIds,
    toggleItemSelection,
  } = useFirestoreHistory<TodoBox>("sharedData", "main", []);

  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeBox, setActiveBox] = useState<TodoBox | null>(null);

  // 실시간 스냅샷 & 포커스 리프레시
  const [liveBoxes, setLiveBoxes] = useState<TodoBox[]>([]);

  // 실시간 구독
  useEffect(() => {
    if (!USE_REALTIME_SNAPSHOT) return;
    const ref = boxesRef();
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.data() || {};
      const items: TodoBox[] = Array.isArray(data.items) ? data.items : [];
      setLiveBoxes(items);
    });
    return () => unsub();
  }, []);

  // 포커스 복귀 시 최신화
  useEffect(() => {
    if (!USE_FOCUS_REFRESH) return;
    const ref = boxesRef();
    const refresh = async () => {
      try {
        const snap = await getDoc(ref);
        const data = snap.data() || {};
        const items: TodoBox[] = Array.isArray(data.items) ? data.items : [];
        setLiveBoxes(items);
      } catch {}
    };
    const onFocus = () => refresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // 박스/아이템 조작 핸들러들 → 전부 트랜잭션 호출
  const addTodoBox = (mode: "default" | "shopping") => txAddBox(mode);

  const moveBoxDown = (id: string) => txMoveBoxDown(id);

  const addTodoItem = (boxId: string, item: TodoItem) => txAddItem(boxId, item);

  const removeItem = (boxId: string, itemId: string) => {
    if (itemId === "__box__") {
      const confirmDelete = confirm("정말 이 소주제를 삭제할까요?");
      if (!confirmDelete) return;
      return txRemoveBox(boxId);
    }
    return txRemoveItem(boxId, itemId);
  };

  const updateItemOrder = (boxId: string, newItems: TodoItem[]) =>
    txReorderItems(boxId, newItems);

  const changeTitle = (id: string, value: string) => txChangeTitle(id, value);

  const changeItem = (
    boxId: string,
    itemId: string,
    value: string,
    field: "text" | "count" | "unit" | "status" = "text"
  ) => txChangeItemField(boxId, itemId, field, value);

  // 외부 클릭·Esc 처리
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setActiveBox(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveBox(null);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // DnD: 박스 순서 변경도 트랜잭션에서 처리
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  const handleDragStart = (evt: DragStartEvent) => {
    const b = liveBoxes.find((b) => b.id === evt.active.id);
    if (b) {
      setActiveBox(b);
      setIsDragging(true);
    }
  };
  const handleDragEnd = (evt: DragEndEvent) => {
    const { active, over } = evt;
    if (!over || active.id === over.id) {
      setIsDragging(false);
      setActiveBox(null);
      return;
    }
    // 서버의 최신 배열에 대해 activeId를 overId 위치로 이동
    txReorderBoxes(String(active.id), String(over.id));
    setIsDragging(false);
    setActiveBox(null);
  };

  const todoBoxes = liveBoxes; // 화면에 쓰는 소스

  return (
    <div
      ref={containerRef}
      style={{ touchAction: isDragging ? "none" : "auto" }}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={todoBoxes.map((b) => b.id)}
          strategy={rectSortingStrategy}
        >
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}
          >
            {todoBoxes.map((b, i) => (
              <SortableBox
                key={b.id}
                box={b}
                activeBox={activeBox}
                isDragging={isDragging && activeBox?.id === b.id}
                setActiveBox={setActiveBox}
                onChangeTitle={changeTitle}
                onChangeItem={changeItem}
                onAddItem={addTodoItem}
                onRemoveItem={removeItem}
                toggleItemSelection={toggleItemSelection}
                onChangeItemOrder={updateItemOrder}
                selectedItemIds={selectedItemIds}
                moveBoxDown={moveBoxDown}
                isLastBox={i === todoBoxes.length - 1}
              />
            ))}
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => addTodoBox("default")}
                className="border-dashed border-2 border-zinc-500 rounded flex-1 h-12"
              >
                + 할일
              </button>
              <button
                onClick={() => addTodoBox("shopping")}
                className="border-dashed border-2 border-zinc-500 rounded flex-1 h-12"
              >
                + 장보기
              </button>
            </div>
          </div>
        </SortableContext>

        <DragOverlay>
          {activeBox && (
            <SortableBox
              box={activeBox}
              activeBox={activeBox}
              isDragging={false}
              setActiveBox={() => {}}
              onChangeTitle={() => {}}
              onChangeItem={() => {}}
              onAddItem={() => {}}
              onRemoveItem={() => {}}
              toggleItemSelection={() => {}}
              onChangeItemOrder={() => {}}
              selectedItemIds={selectedItemIds}
              moveBoxDown={() => {}}
              isLastBox={false}
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
