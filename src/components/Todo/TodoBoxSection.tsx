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
import { saveTodoBoxes, listenTodoBoxes } from "../../saveDataToFirestore";

interface TodoItem {
  id: string;
  text: string;
  count?: string;
  unit?: string;
  status?: "none" | "blue" | "red"; // ← 새 상태 필드
}

interface TodoBox {
  id: string;
  title: string;
  items: TodoItem[];
  mode: "default" | "shopping";
}

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
  const [collapsed, setCollapsed] = useState(false); // 펼침/접힘 상태
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null); // 길게 눌러야 드래그
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

    onAddItem(box.id, {
      id: uuidv4(),
      text: newText.trim(),
      count: newCount.trim(),
      unit: newUnit.trim(),
      status: "none",
    });

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
        opacity: isDragging && activeBox?.id === box.id ? 0 : 1, // ✅ 드래그 중일 때만 안 보이게
        visibility: "visible", // ✅ 항상 자리 유지
        height: "auto",
        touchAction: isDragging ? "none" : "auto",
      }}
      className="border p-2 rounded shadow bg-white w-full transition-opacity"
    >
      {/* 제목 + 핸들러 */}
      <div className="flex items-center gap-1 mb-2">
        <button
          {...attributes}
          {...listeners} // ① DnD Kit 리스너 흘려주기
          onMouseDown={(e) => {
            dragTimeoutRef.current = setTimeout(() => {
              // ② 제대로 된 포인터 다운 핸들러 호출
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
            setCollapsed((prev) => !prev); // 클릭 시 토글
          }}
          className="mx-1 text-gray-300 cursor-pointer text-sm transition"
          title="길게 누르면 드래그 / 클릭하면 접기/펼치기"
        >
          {collapsed ? "▷" : "▽"}
        </button>

        <input
          className="flex-1 min-w-0 text-blue-400 bg-transparent outline-none truncate text-xs"
          value={box.title}
          onChange={(e) => onChangeTitle(box.id, e.target.value)}
        />
        <button
          onClick={() => onRemoveItem(box.id, "__box__")}
          className="ml-2 px-2 mr-1 text-gray-300 rounded hover:bg-gray-200 transition text-sm shrink-0"
          title="소주제 삭제"
        >
          X
        </button>
      </div>

      {/* collapsed === false일 때만 이 아래가 보이도록 */}
      {!collapsed && (
        <>
          {/* 아이템 정렬 가능한 리스트 */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => {
              const { active, over } = event as DragEndEvent;
              if (!over || active.id === over.id) return;
              const oldIndex = box.items.findIndex((i) => i.id === active.id);
              const newIndex = box.items.findIndex((i) => i.id === over.id);
              if (oldIndex < 0 || newIndex < 0) return;
              onChangeItemOrder(
                box.id,
                arrayMove(box.items, oldIndex, newIndex)
              );
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
                    // 체크 토글 핸들러
                    onToggle={toggleItemSelection}
                    onChangeItem={onChangeItem}
                    onRemoveItem={onRemoveItem}
                    // 편집 중인 필드별 상태
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

          {/* 새 항목 입력 */}
          <div className="flex items-center border p-1 rounded">
            {/* 체크박스 공간 확보용 여백 */}
            <div className="w-5 h-5 mr-2" />

            <input
              ref={nameRef}
              className="flex-[6] min-w-0 outline-none text-sm mr-1"
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
                  className="flex-[2] min-w-0 outline-none text-sm text-right mr-1"
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
                  className="flex-[2] min-w-0 outline-none text-sm text-left mr-1"
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
              className="px-2 text-gray rounded hover:bg-gray-200 transition text-sm shrink-0"
            >
              +
            </button>
          </div>
        </>
      )}
    </div>
  );
}
export default function TodoBoxSection() {
  const [todoBoxes, setTodoBoxes] = useState<TodoBox[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeBox, setActiveBox] = useState<TodoBox | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<{
    [key: string]: string[];
  }>({});
  const defaultBox = [{ id: uuidv4(), title: "기본 박스", items: [], mode: "default" }];
  const [history, setHistory] = useState<TodoBox[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isUndoing, setIsUndoing] = useState(false);
  const historyRef = useRef<TodoBox[][]>([]);
  const historyIndexRef = useRef<number>(-1);

  useEffect(() => {
    historyRef.current = history;
    historyIndexRef.current = historyIndex;
  }, [history, historyIndex]);

  const updateTodoBoxesWithHistory = (newBoxes: TodoBox[]) => {
    setTodoBoxes(newBoxes);

    if (isUndoing) return; // 🔥 undo 중일 땐 history 누락

    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndexRef.current + 1);
      const newHistory = [...sliced, newBoxes];
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
  };

  // 1) Firestore에서 “처음 한 번만” 불러오기
  useEffect(() => {
    const unsubscribe = listenTodoBoxes((data) => {
      const boxes = data.length > 0 ? data : defaultBox;

      setTodoBoxes(boxes);

      // 🚨 isLoaded가 false일 때만 초기 history를 설정
      setHistory((prev) => (prev.length === 0 ? [boxes] : prev));
      setHistoryIndex((prev) => (prev === -1 ? 0 : prev));

      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  // 2) todoBoxes 변경 시 디바운스 저장
  useEffect(() => {
    if (!isLoaded || isUndoing) return;

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      saveTodoBoxes(todoBoxes).catch(console.error);
    }, 1000);

    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [todoBoxes, isLoaded, isUndoing]);

  // Ctrl+Z 핸들링
  useEffect(() => {
    const handleUndo = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        if (historyIndexRef.current > 0) {
          const newIndex = historyIndexRef.current - 1;
          setIsUndoing(true);
          setTodoBoxes(historyRef.current[newIndex]);
          setHistoryIndex(newIndex);
        }
      }
    };
    window.addEventListener("keydown", handleUndo);
    return () => window.removeEventListener("keydown", handleUndo);
  }, []);

  useEffect(() => {
    if (isUndoing) {
      const timer = setTimeout(() => {
        setIsUndoing(false);
      }, 100); // Firestore 저장 useEffect보다 나중에 해제

      return () => clearTimeout(timer);
    }
  }, [isUndoing]);

   const addTodoBox = (mode: "default" | "shopping") => {
    const newBox: TodoBox = {
      id: uuidv4(),
      title: mode === "shopping" ? "장보기" : "제목 없음",
      items: [],
      mode,
    };

    const updated = [...todoBoxes, newBox];
    updateTodoBoxesWithHistory(updated);
  };

  const moveBoxDown = (id: string) => {
    const idx = todoBoxes.findIndex((b) => b.id === id);
    if (idx < 0 || idx === todoBoxes.length - 1) return;
    const updated = arrayMove(todoBoxes, idx, idx + 1);
    updateTodoBoxesWithHistory(updated);
  };

  const addTodoItem = (boxId: string, item: TodoItem) => {
    const updated = todoBoxes.map(b =>
      b.id === boxId ? { ...b, items: [...b.items, item] } : b
    );
    updateTodoBoxesWithHistory(updated);
  };

  const removeItem = (boxId: string, itemId: string) => {
    if (itemId === "__box__") {
      const confirmDelete = confirm("정말 이 소주제를 삭제할까요?");
      if (!confirmDelete) return;

      const updated = todoBoxes.filter((b) => b.id !== boxId);
      updateTodoBoxesWithHistory(updated);
      return;
    }

    const updated = todoBoxes.map((b) =>
      b.id === boxId
        ? { ...b, items: b.items.filter((i) => i.id !== itemId) }
        : b
    );
    updateTodoBoxesWithHistory(updated);
  };

  const updateItemOrder = (boxId: string, newItems: TodoItem[]) => {
    const updated = todoBoxes.map((b) =>
      b.id === boxId ? { ...b, items: newItems } : b
    );
    updateTodoBoxesWithHistory(updated);
  };

  const changeTitle = (id: string, value: string) => {
    const updated = todoBoxes.map((b) =>
      b.id === id ? { ...b, title: value } : b
    );
    updateTodoBoxesWithHistory(updated);
  };

  const changeItem = (
    boxId: string,
    itemId: string,
    value: string,
    field: "text" | "count" | "unit" | "status" = "text"
  ) => {
    const updated = todoBoxes.map((b) =>
      b.id === boxId
        ? {
          ...b,
          items: b.items.map((i) =>
            i.id === itemId ? { ...i, [field]: value } : i
          ),
        }
        : b
    );
    updateTodoBoxesWithHistory(updated);
  };

  useEffect(() => {
    if (isUndoing) {
      const timeout = setTimeout(() => setIsUndoing(false), 100);
      return () => clearTimeout(timeout);
    }
  }, [isUndoing]);

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

  // 드래그 이벤트 핸들링
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );
  const handleDragStart = (evt: DragStartEvent) => {
    const b = todoBoxes.find((b) => b.id === evt.active.id);
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
    const oldIdx = todoBoxes.findIndex((b) => b.id === active.id);
    const newIdx = todoBoxes.findIndex((b) => b.id === over.id);
    if (oldIdx >= 0 && newIdx >= 0) {
      const updated = arrayMove(todoBoxes, oldIdx, newIdx);
      updateTodoBoxesWithHistory(updated);
    }
    setIsDragging(false);
    setActiveBox(null);
  };
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
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
                toggleItemSelection={(boxId, itemId) => {
                  setSelectedItemIds((prev) => {
                    const sel = prev[boxId] || [];
                    return {
                      ...prev,
                      [boxId]: sel.includes(itemId)
                        ? sel.filter((i) => i !== itemId)
                        : [...sel, itemId],
                    };
                  });
                }}
                onChangeItemOrder={updateItemOrder}
                selectedItemIds={selectedItemIds}
                moveBoxDown={moveBoxDown}
                isLastBox={i === todoBoxes.length - 1}
              />
            ))}
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => addTodoBox("default")}
                className="border-dashed border-2 rounded flex-1 h-12"
              >
                + 할일
              </button>
              <button
                onClick={() => addTodoBox("shopping")}
                className="border-dashed border-2 rounded flex-1 h-12"
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
              setActiveBox={() => { }}
              onChangeTitle={() => { }}
              onChangeItem={() => { }}
              onAddItem={() => { }}
              onRemoveItem={() => { }}
              toggleItemSelection={() => { }}
              onChangeItemOrder={() => { }}
              selectedItemIds={selectedItemIds}
              moveBoxDown={() => { }}
              isLastBox={false}
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
