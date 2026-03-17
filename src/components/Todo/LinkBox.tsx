import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface LinkData {
  title: string;
  url: string;
  id: string;
  category: string;
}

function SortableGroup({
  category,
  links,
  collapsedGroups,
  toggleGroup,
  onDelete,
  onDragEnd,
  sensors,
  onCategoryEdit,
}: {
  category: string;
  links: LinkData[];
  collapsedGroups: { [key: string]: boolean };
  toggleGroup: (category: string) => void;
  onDelete: (id: string) => void;
  onDragEnd: (event: DragEndEvent) => void;
  sensors: any;
  onCategoryEdit: (oldCategory: string, newCategory: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: category,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(category);

  const handleEdit = () => {
    setIsEditing(true);
    setEditValue(category);
  };

  const handleSave = () => {
    if (editValue.trim() && editValue !== category) {
      onCategoryEdit(category, editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(category);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="mb-4 cursor-move group"
    >
      {/* 분류 제목 */}
      <div className="flex items-center gap-1 mb-2">
        {isEditing ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className="text-xs font-semibold bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-1 py-0.5 rounded border border-zinc-300 dark:border-zinc-600 outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={handleSave}
              className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
            >
              ✓
            </button>
            <button
              onClick={handleCancel}
              className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              ✕
            </button>
          </div>
        ) : (
          <>
            <h3
              onClick={() => toggleGroup(category)}
              className="text-xs font-semibold text-zinc-500 cursor-pointer hover:text-zinc-300 transition"
            >
              {category}
            </h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEdit();
              }}
              className="text-xs text-zinc-400 hover:text-zinc-300 transition ml-1 opacity-0 group-hover:opacity-100"
              title="그룹명 수정"
            >
              ✏️
            </button>
          </>
        )}
      </div>

      {/* 해당 분류 링크 */}
      {!collapsedGroups[category] && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={links.map((link: LinkData) => link.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-2 xs:grid-cols-3 lg:grid-cols-6 gap-2">
              {links.map((link: LinkData) => (
                <SortableLinkItem
                  key={link.id}
                  link={link}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortableLinkItem({ link, onDelete }: { link: LinkData; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: link.id,
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-zinc-500 dark:bg-zinc-700 rounded p-2 cursor-move hover:shadow-sm transition-shadow group"
    >
      <div className="flex justify-between items-center">
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-white hover:underline line-clamp-2 flex-1 mr-2"
          onClick={(e) => e.stopPropagation()}
        >
          {link.title}
        </a>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(link.id);
          }}
          className="text-white hover:text-red-300 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function LinkBox() {
  const [showList, setShowList] = useState(() => {
    const saved = localStorage.getItem("linkBox_showList");
    return saved !== null ? JSON.parse(saved) : false;
  });

  const [links, setLinks] = useState<LinkData[]>([]);
  const [newLink, setNewLink] = useState({ title: "", url: "", category: "" });
  const [isAdding, setIsAdding] = useState(false);

  // 그룹별 숨김 상태 관리
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("linkBox_collapsedGroups");
    return saved !== null ? JSON.parse(saved) : {};
  });

  // showList 상태 변경 시 localStorage에 저장
  useEffect(() => {
    localStorage.setItem("linkBox_showList", JSON.stringify(showList));
  }, [showList]);

  // 그룹 숨김 상태 변경 시 localStorage에 저장
  useEffect(() => {
    localStorage.setItem("linkBox_collapsedGroups", JSON.stringify(collapsedGroups));
  }, [collapsedGroups]);

  // Firestore에서 링크 데이터 불러오기
  useEffect(() => {
    const loadLinks = async () => {
      try {
        const docRef = doc(db, "links", "main");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.links) {
            setLinks(data.links);
          }
        }
      } catch (e) {
        console.error("[LinkBox] 🔴 Load failed:", e);
      }
    };

    loadLinks();
  }, []);

  // 링크 추가
  const handleAdd = async () => {
    if (!newLink.title.trim() || !newLink.url.trim()) return;

    const linkData: LinkData = {
      id: Date.now().toString(),
      title: newLink.title.trim(),
      url: newLink.url.trim(),
      category: newLink.category.trim() || "기타"
    };

    try {
      const docRef = doc(db, "links", "main");
      await setDoc(docRef, {
        links: [...links, linkData]
      }, { merge: true });

      setLinks([...links, linkData]);
      setNewLink({ title: "", url: "", category: "" });
      setIsAdding(false);
    } catch (e) {
      console.error("[LinkBox] ❌ Add failed:", e);
    }
  };

  // 링크 삭제
  const handleDelete = async (id: string) => {
    try {
      const docRef = doc(db, "links", "main");
      await setDoc(docRef, {
        links: links.filter(link => link.id !== id)
      }, { merge: true });

      setLinks(links.filter(link => link.id !== id));
    } catch (e) {
      console.error("[LinkBox] ❌ Delete failed:", e);
    }
  };

  // 그룹 토글 함수
  const toggleGroup = (category: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // 드래그 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    })
  );

  // 카테고리 수정 핸들러
  const handleCategoryEdit = async (oldCategory: string, newCategory: string) => {
    if (oldCategory === newCategory) return;

    try {
      // 모든 링크의 카테고리 업데이트
      const updatedLinks = links.map(link => 
        link.category === oldCategory 
          ? { ...link, category: newCategory }
          : link
      );

      // Firestore에 저장
      const docRef = doc(db, "links", "main");
      await setDoc(docRef, { links: updatedLinks }, { merge: true });
      
      setLinks(updatedLinks);
    } catch (e) {
      console.error("[LinkBox] ❌ 카테고리 수정 실패:", e);
    }
  };

  // 그룹 드래그 종료 핸들러
  const handleGroupDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const categories = Object.keys(groupedLinks);
    const oldIndex = categories.indexOf(active.id as string);
    const newIndex = categories.indexOf(over.id as string);
    
    if (oldIndex < 0 || newIndex < 0) return;

    // 카테고리 순서 변경
    const newOrder = arrayMove(categories, oldIndex, newIndex);
    
    // 링크 데이터 재구성 (새 순서에 따라)
    const reorderedLinks: LinkData[] = [];
    newOrder.forEach((category: string) => {
      reorderedLinks.push(...groupedLinks[category]);
    });
    
    setLinks(reorderedLinks);

    // Firestore에 순서 저장
    try {
      const docRef = doc(db, "links", "main");
      await setDoc(docRef, { links: reorderedLinks }, { merge: true });
    } catch (e) {
      console.error("[LinkBox] ❌ 그룹 순서 저장 실패:", e);
    }
  };

  // 링크 아이템 드래그 종료 핸들러
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = links.findIndex((link) => link.id === active.id);
    const newIndex = links.findIndex((link) => link.id === over.id);
    
    if (oldIndex < 0 || newIndex < 0) return;

    const reorderedLinks = arrayMove(links, oldIndex, newIndex);
    setLinks(reorderedLinks);

    // Firestore에 순서 저장
    try {
      const docRef = doc(db, "links", "main");
      await setDoc(docRef, { links: reorderedLinks }, { merge: true });
    } catch (e) {
      console.error("[LinkBox] ❌ 순서 저장 실패:", e);
    }
  };

  const groupedLinks = links.reduce((acc: any, link) => {
    if (!acc[link.category]) {
      acc[link.category] = [];
    }
    acc[link.category].push(link);
    return acc;
  }, {});
  return (

    <div className="rounded shadow-none bg-transparent w-full transition-opacity">
      {/* 헤더 */}
      <div className="flex items-center justify-between mt-[3px]">
        <button
          className="mx-1 text-zinc-400 hover:text-white text-xs"
          onClick={() => setShowList(!showList)}
        >
          {showList ? "▽" : "▷"}

        </button>
        <h2 className="flex-1 text-blue-600 dark:text-blue-300 truncate text-xs">
          링크
        </h2>
      </div>

      {/* 내용 */}
      {showList && (
        <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400, py-2">

          {/* 링크 목록 */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleGroupDragEnd}
          >
            <SortableContext
              items={Object.keys(groupedLinks)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {Object.keys(groupedLinks).map((category) => (
                  <SortableGroup
                    key={category}
                    category={category}
                    links={groupedLinks[category]}
                    collapsedGroups={collapsedGroups}
                    toggleGroup={toggleGroup}
                    onDelete={handleDelete}
                    onDragEnd={handleDragEnd}
                    sensors={sensors}
                    onCategoryEdit={handleCategoryEdit}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          {links.length === 0 && (
            <div className="text-zinc-400 text-xs text-center py-2">
              저장된 링크가 없습니다
            </div>
          )}

          {/* 추가 버튼 */}
          {!isAdding ? (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full py-2 text-xs bg-transparent rounded transition text-black dark:text-white"
            >
              + 링크 추가
            </button>
          ) : (
            <div className="space-y-2 mt-4">
              <input
                type="text"
                placeholder="제목"
                value={newLink.title}
                onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                className="w-full px-2 py-1 text-xs border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-black dark:text-white select-auto"
              />
              <input
                type="url"
                placeholder="URL (https://...)"
                value={newLink.url}
                onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                className="w-full px-2 py-1 text-xs border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-black dark:text-white select-auto"
              />
              <input
                type="text"
                placeholder="분류"
                value={newLink.category}
                onChange={(e) =>
                  setNewLink({ ...newLink, category: e.target.value })
                }
                className="w-full px-2 py-1 text-xs border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-black dark:text-white select-auto"
              />
              <div className="flex justify-center gap-2">
                <button
                  onClick={handleAdd}
                  className="px-3 py-1 text-xs rounded bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-600 dark:text-white dark:hover:bg-zinc-500 transition"
                >
                  저장
                </button>
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setNewLink({ title: "", url: "", category: "" });
                  }}
                  className="px-3 py-1 text-xs rounded bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-600 dark:text-white dark:hover:bg-zinc-500 transition"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
