import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { db } from "../../firebase";
import { useGlobalUndoScope } from "../../hooks/useGlobalUndoScope";

interface LinkData {
  title: string;
  url: string;
  id: string;
  category: string;
  transparent?: boolean;
}

interface LinkDraft {
  title: string;
  url: string;
  category: string;
}

function cloneLinks(links: LinkData[]) {
  return links.map((link) => ({ ...link }));
}

function isSameLinks(left: LinkData[], right: LinkData[]) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function createEmptyDraft(): LinkDraft {
  return { title: "", url: "", category: "" };
}

function LinkInlineEditor({
  draft,
  submitLabel,
  onChange,
  onSubmit,
  onCancel,
}: {
  draft: LinkDraft;
  submitLabel: string;
  onChange: (field: keyof LinkDraft, value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onSubmit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="mt-2 space-y-2 p-2">
      <input
        type="text"
        placeholder="제목"
        value={draft.title}
        onChange={(event) => onChange("title", event.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-black outline-none select-auto dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
      />
      <input
        type="url"
        placeholder="URL (https://...)"
        value={draft.url}
        onChange={(event) => onChange("url", event.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-black outline-none select-auto dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
      />
      <input
        type="text"
        placeholder="분류"
        value={draft.category}
        onChange={(event) => onChange("category", event.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-black outline-none select-auto dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
      />
      <div className="flex justify-center gap-2">
        <button
          type="button"
          onClick={onSubmit}
          className="rounded bg-zinc-200 px-3 py-1 text-xs text-black transition hover:bg-zinc-300 dark:bg-zinc-600 dark:text-white dark:hover:bg-zinc-500"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded bg-zinc-200 px-3 py-1 text-xs text-black transition hover:bg-zinc-300 dark:bg-zinc-600 dark:text-white dark:hover:bg-zinc-500"
        >
          취소
        </button>
      </div>
    </div>
  );
}

function SortableLinkItem({
  link,
  isEditing,
  draft,
  onDraftChange,
  onSubmitEdit,
  onCancelEdit,
  onDelete,
  onEdit,
  onToggleStyle,
}: {
  link: LinkData;
  isEditing: boolean;
  draft: LinkDraft;
  onDraftChange: (field: keyof LinkDraft, value: string) => void;
  onSubmitEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onEdit: (link: LinkData) => void;
  onToggleStyle: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: link.id,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={`group rounded p-2 transition hover:bg-zinc-200 dark:hover:bg-zinc-600 ${
          link.transparent ? "opacity-30" : "opacity-100"
        } bg-white dark:bg-transparent`}
      >
        <div className="flex items-center justify-between">
          <div className="mr-2 flex flex-1 items-center">
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="mr-2 cursor-grab active:cursor-grabbing"
              aria-label={`${link.title} 드래그`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3 text-black opacity-50 dark:text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="line-clamp-2 text-sm font-medium text-black hover:underline dark:text-white"
              onClick={(event) => event.stopPropagation()}
            >
              {link.title}
            </a>
          </div>

          <div className="flex gap-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleStyle(link.id);
              }}
              className="text-xs text-black opacity-0 transition-opacity hover:text-yellow-300 group-hover:opacity-100 dark:text-white"
              title="스타일 변경"
            >
              투명
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onEdit(link);
              }}
              className="text-xs text-black opacity-0 transition-opacity hover:text-blue-300 group-hover:opacity-100 dark:text-white"
              title="수정"
            >
              수정
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(link.id);
              }}
              className="text-xs text-black opacity-0 transition-opacity hover:text-red-300 group-hover:opacity-100 dark:text-white"
              title="삭제"
            >
              삭제
            </button>
          </div>
        </div>

        {isEditing && (
          <LinkInlineEditor
            draft={draft}
            submitLabel="수정"
            onChange={onDraftChange}
            onSubmit={onSubmitEdit}
            onCancel={onCancelEdit}
          />
        )}
      </div>
    </div>
  );
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
  onEdit,
  onToggleStyle,
  editingLinkId,
  editingDraft,
  onDraftChange,
  onSubmitEdit,
  onCancelEdit,
}: {
  category: string;
  links: LinkData[];
  collapsedGroups: Record<string, boolean>;
  toggleGroup: (category: string) => void;
  onDelete: (id: string) => void;
  onDragEnd: (event: DragEndEvent) => void;
  sensors: ReturnType<typeof useSensors>;
  onCategoryEdit: (oldCategory: string, newCategory: string) => void;
  onEdit: (link: LinkData) => void;
  onToggleStyle: (id: string) => void;
  editingLinkId: string | null;
  editingDraft: LinkDraft;
  onDraftChange: (field: keyof LinkDraft, value: string) => void;
  onSubmitEdit: () => void;
  onCancelEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: category,
    });

  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [categoryValue, setCategoryValue] = useState(category);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSaveCategory = () => {
    const nextValue = categoryValue.trim();
    if (nextValue && nextValue !== category) {
      onCategoryEdit(category, nextValue);
    }
    setIsEditingCategory(false);
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-4">
      <div className="mb-2 flex items-center gap-1 hover:[&>button]:opacity-100">
        {isEditingCategory ? (
          <div className="flex flex-1 items-center gap-1">
            <input
              type="text"
              value={categoryValue}
              onChange={(event) => setCategoryValue(event.target.value)}
              onBlur={handleSaveCategory}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSaveCategory();
                } else if (event.key === "Escape") {
                  setIsEditingCategory(false);
                  setCategoryValue(category);
                }
              }}
              className="rounded border border-zinc-300 bg-zinc-200 px-1 py-0.5 text-xs font-semibold text-zinc-700 outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
              autoFocus
            />
            <button
              type="button"
              onClick={handleSaveCategory}
              className="text-xs text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
            >
              저장
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditingCategory(false);
                setCategoryValue(category);
              }}
              className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              취소
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              {...attributes}
              {...listeners}
              onClick={() => toggleGroup(category)}
              className="cursor-pointer text-xs font-semibold text-zinc-500 transition hover:text-zinc-300"
            >
              {category}
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setIsEditingCategory(true);
                setCategoryValue(category);
              }}
              className="ml-1 text-xs text-zinc-400 opacity-0 transition hover:text-zinc-300"
              title="그룹명 수정"
            >
              편집
            </button>
          </>
        )}
      </div>

      {!collapsedGroups[category] && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={links.map((link) => link.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 gap-2">
              {links.map((link) => (
                <SortableLinkItem
                  key={link.id}
                  link={link}
                  isEditing={editingLinkId === link.id}
                  draft={editingDraft}
                  onDraftChange={onDraftChange}
                  onSubmitEdit={onSubmitEdit}
                  onCancelEdit={onCancelEdit}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onToggleStyle={onToggleStyle}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

export default function LinkBox() {
  const [showList, setShowList] = useState(() => {
    const saved = localStorage.getItem("linkBox_showList");
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [links, setLinks] = useState<LinkData[]>([]);
  const [history, setHistory] = useState<LinkData[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isAdding, setIsAdding] = useState(false);
  const [newLink, setNewLink] = useState<LinkDraft>(createEmptyDraft());
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<LinkDraft>(createEmptyDraft());
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(
    () => {
      const saved = localStorage.getItem("linkBox_collapsedGroups");
      return saved !== null ? JSON.parse(saved) : {};
    }
  );
  const historyRef = useRef<LinkData[][]>([]);
  const historyIndexRef = useRef(-1);

  useEffect(() => {
    historyRef.current = history;
    historyIndexRef.current = historyIndex;
  }, [history, historyIndex]);

  useEffect(() => {
    localStorage.setItem("linkBox_showList", JSON.stringify(showList));
  }, [showList]);

  useEffect(() => {
    localStorage.setItem("linkBox_collapsedGroups", JSON.stringify(collapsedGroups));
  }, [collapsedGroups]);

  const setHistoryState = (nextHistory: LinkData[][], nextIndex: number) => {
    historyRef.current = nextHistory;
    historyIndexRef.current = nextIndex;
    setHistory(nextHistory);
    setHistoryIndex(nextIndex);
  };

  const persistLinks = async (updatedLinks: LinkData[]) => {
    const docRef = doc(db, "links", "main");
    await setDoc(docRef, { links: updatedLinks }, { merge: true });
  };

  const undoLinks = async () => {
    const nextIndex = historyIndexRef.current - 1;
    if (nextIndex < 0) {
      return;
    }

    const snapshot = cloneLinks(historyRef.current[nextIndex] ?? []);
    setLinks(snapshot);
    setHistoryIndex(nextIndex);
    historyIndexRef.current = nextIndex;
    await persistLinks(snapshot);
  };

  const { touch } = useGlobalUndoScope({
    canUndo: () => historyIndexRef.current > 0,
    undo: undoLinks,
  });

  const applyLinksChange = async (updatedLinks: LinkData[]) => {
    const snapshot = cloneLinks(updatedLinks);
    const currentSnapshot = historyRef.current[historyIndexRef.current] ?? [];

    setLinks(snapshot);

    if (!isSameLinks(currentSnapshot, snapshot)) {
      const nextHistory = [
        ...historyRef.current.slice(0, historyIndexRef.current + 1),
        snapshot,
      ];
      setHistoryState(nextHistory, nextHistory.length - 1);
      touch();
    }

    await persistLinks(snapshot);
  };

  useEffect(() => {
    const loadLinks = async () => {
      try {
        const docRef = doc(db, "links", "main");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data.links)) {
            const loadedLinks = cloneLinks(data.links);
            setLinks(loadedLinks);
            setHistoryState([loadedLinks], 0);
            return;
          }
        }

        setLinks([]);
        setHistoryState([[]], 0);
      } catch (error) {
        console.error("[LinkBox] Load failed:", error);
      }
    };

    loadLinks();
  }, []);

  const handleToggleStyle = async (id: string) => {
    const updatedLinks = links.map((link) =>
      link.id === id ? { ...link, transparent: !link.transparent } : link
    );

    try {
      await applyLinksChange(updatedLinks);
    } catch (error) {
      console.error("[LinkBox] Style toggle failed:", error);
    }
  };

  const handleAdd = async () => {
    if (!newLink.title.trim() || !newLink.url.trim()) {
      return;
    }

    const linkData: LinkData = {
      id: Date.now().toString(),
      title: newLink.title.trim(),
      url: newLink.url.trim(),
      category: newLink.category.trim() || "기타",
    };

    try {
      await applyLinksChange([...links, linkData]);
      setNewLink(createEmptyDraft());
      setIsAdding(false);
    } catch (error) {
      console.error("[LinkBox] Add failed:", error);
    }
  };

  const handleEdit = (link: LinkData) => {
    setEditingLinkId(link.id);
    setEditingDraft({
      title: link.title,
      url: link.url,
      category: link.category,
    });
    setIsAdding(false);
  };

  const handleSubmitEdit = async () => {
    if (!editingLinkId || !editingDraft.title.trim() || !editingDraft.url.trim()) {
      return;
    }

    const updatedLinks = links.map((link) =>
      link.id === editingLinkId
        ? {
            ...link,
            title: editingDraft.title.trim(),
            url: editingDraft.url.trim(),
            category: editingDraft.category.trim() || "기타",
          }
        : link
    );

    try {
      await applyLinksChange(updatedLinks);
      setEditingLinkId(null);
      setEditingDraft(createEmptyDraft());
    } catch (error) {
      console.error("[LinkBox] Update failed:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await applyLinksChange(links.filter((link) => link.id !== id));
      if (editingLinkId === id) {
        setEditingLinkId(null);
        setEditingDraft(createEmptyDraft());
      }
    } catch (error) {
      console.error("[LinkBox] Delete failed:", error);
    }
  };

  const toggleGroup = (category: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    })
  );

  const groupedLinks = links.reduce<Record<string, LinkData[]>>((acc, link) => {
    if (!acc[link.category]) {
      acc[link.category] = [];
    }
    acc[link.category].push(link);
    return acc;
  }, {});

  const handleCategoryEdit = async (oldCategory: string, newCategory: string) => {
    if (oldCategory === newCategory) {
      return;
    }

    try {
      const updatedLinks = links.map((link) =>
        link.category === oldCategory ? { ...link, category: newCategory } : link
      );
      await applyLinksChange(updatedLinks);
    } catch (error) {
      console.error("[LinkBox] Category update failed:", error);
    }
  };

  const handleGroupDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const categories = Object.keys(groupedLinks);
    const oldIndex = categories.indexOf(String(active.id));
    const newIndex = categories.indexOf(String(over.id));

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const newOrder = arrayMove(categories, oldIndex, newIndex);
    const reorderedLinks: LinkData[] = [];

    newOrder.forEach((category) => {
      reorderedLinks.push(...groupedLinks[category]);
    });

    try {
      await applyLinksChange(reorderedLinks);
    } catch (error) {
      console.error("[LinkBox] Group reorder failed:", error);
    }
  };

  const handleItemDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = links.findIndex((link) => link.id === active.id);
    const newIndex = links.findIndex((link) => link.id === over.id);

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const reorderedLinks = arrayMove(links, oldIndex, newIndex);

    try {
      await applyLinksChange(reorderedLinks);
    } catch (error) {
      console.error("[LinkBox] Item reorder failed:", error);
    }
  };

  return (
    <div className="w-full rounded bg-transparent shadow-none transition-opacity">
      <div className="mt-[3px] flex items-center justify-between">
        <button
          className="mx-1 text-xs text-zinc-400 hover:text-white"
          onClick={() => setShowList((prev) => !prev)}
        >
          {showList ? "▽" : "▷"}
        </button>
        <h2 className="flex-1 truncate text-xs text-blue-600 dark:text-blue-300">
          링크
        </h2>
      </div>

      {showList && (
        <div className="mt-2 py-2 text-sm text-zinc-600 dark:text-zinc-400">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleGroupDragEnd}
          >
            <SortableContext
              items={Object.keys(groupedLinks)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 md:grid-cols-1">
                {Object.keys(groupedLinks).map((category) => (
                  <SortableGroup
                    key={category}
                    category={category}
                    links={groupedLinks[category]}
                    collapsedGroups={collapsedGroups}
                    toggleGroup={toggleGroup}
                    onDelete={handleDelete}
                    onDragEnd={handleItemDragEnd}
                    sensors={sensors}
                    onCategoryEdit={handleCategoryEdit}
                    onEdit={handleEdit}
                    onToggleStyle={handleToggleStyle}
                    editingLinkId={editingLinkId}
                    editingDraft={editingDraft}
                    onDraftChange={(field, value) =>
                      setEditingDraft((prev) => ({ ...prev, [field]: value }))
                    }
                    onSubmitEdit={handleSubmitEdit}
                    onCancelEdit={() => {
                      setEditingLinkId(null);
                      setEditingDraft(createEmptyDraft());
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {links.length === 0 && (
            <div className="py-2 text-center text-xs text-zinc-400">
              등록된 링크가 없습니다
            </div>
          )}

          {!isAdding ? (
            <button
              onClick={() => {
                setIsAdding(true);
                setEditingLinkId(null);
                setEditingDraft(createEmptyDraft());
              }}
              className="w-full rounded bg-transparent py-2 text-xs text-black transition dark:text-white"
            >
              + 링크 추가
            </button>
          ) : (
            <div className="mt-4">
              <LinkInlineEditor
                draft={newLink}
                submitLabel="추가"
                onChange={(field, value) =>
                  setNewLink((prev) => ({ ...prev, [field]: value }))
                }
                onSubmit={handleAdd}
                onCancel={() => {
                  setIsAdding(false);
                  setNewLink(createEmptyDraft());
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
