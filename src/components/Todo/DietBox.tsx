import { useEffect, useMemo, useRef, useState } from "react";
import { useFirestoreHistory } from "./hooks/useFirestoreHistory";

type DietNote = {
  id: string;
  title: string;
  content: string;
  recipe: string;
  updatedAt: number;
  pinned: boolean;
};

type DietDraft = {
  title: string;
  content: string;
  recipe: string;
};

type TitleEditDraft = {
  id: string;
  value: string;
};

const SHOW_KEY = "dietBox_showList";
const NOTES_KEY = "dietBox_notes_v1";
const SELECTED_KEY = "dietBox_selectedId_v1";
const COLLAPSED_ICON = "\u25B7";
const EXPANDED_ICON = "\u25BD";
const BOX_TITLE = "\uBA54\uBAA8";
const SEARCH_PLACEHOLDER = "\uAC80\uC0C9";
const EMPTY_TITLE = "\uC81C\uBAA9 \uC5C6\uC74C";
const EMPTY_LIST = "\uBAA9\uB85D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4";
const EMPTY_SEARCH = "\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4";
const NEW_RECIPE = "+ \uC0C8 \uBA54\uBAA8";
const TITLE_PLACEHOLDER = "\uC81C\uBAA9";
const CONTENT_PLACEHOLDER = "\uB0B4\uC6A9";
const RECIPE_PLACEHOLDER = "레시피";
const SAVE_LABEL = "\uC800\uC7A5";
const DELETE_LABEL = "\uC0AD\uC81C";
const SELECT_NOTE = "\uBAA9\uB85D\uC5D0\uC11C \uD56D\uBAA9\uC744 \uC120\uD0DD\uD558\uC138\uC694";
const PIN_LABEL = "\uD83D\uDCCC";
const EDIT_LABEL = "\u270F\uFE0F";
const DELETE_ICON = "\uD83D\uDDD1\uFE0F";
const PINNED_MARK = "\u2611";
const DELETE_CONFIRM = "\uC774 \uB808\uC2DC\uD53C\uB97C \uC0AD\uC81C\uD560\uAE4C\uC694?";

const LIST_VIEWPORT_STYLE = {
  overflowY: "auto",
  overscrollBehavior: "contain",
  scrollbarWidth: "none",
  msOverflowStyle: "none",
} as const;

function createEmptyDraft(): DietDraft {
  return {
    title: "",
    content: "",
    recipe: "",
  };
}

function createNewNote(): DietNote {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "",
    content: "",
    recipe: "",
    updatedAt: Date.now(),
    pinned: false,
  };
}

function loadLegacyNotes(): DietNote[] {
  if (typeof window === "undefined") {
    return [];
  }

  const saved = localStorage.getItem(NOTES_KEY);

  if (!saved) {
    return [];
  }

  try {
    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (item): item is Omit<DietNote, "pinned"> & { pinned?: boolean } =>
          Boolean(item) &&
          typeof item.id === "string" &&
          typeof item.title === "string" &&
          typeof item.content === "string" &&
          typeof item.updatedAt === "number"
      )
      .map((item) => ({
        ...item,
        pinned: Boolean(item.pinned),
      }));
  } catch {
    return [];
  }
}

export default function DietBox() {
  const contentTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const hasMigratedLegacyNotesRef = useRef(false);
  const defaultNotes = useMemo<DietNote[]>(() => [], []);
  const [showList, setShowList] = useState(() => {
    const saved = localStorage.getItem(SHOW_KEY);
    return saved !== null ? JSON.parse(saved) : false;
  });
  const {
    items: notes,
    updateWithHistory: updateNotesWithHistory,
  } = useFirestoreHistory<DietNote>(
    "sharedData",
    "main",
    defaultNotes,
    "dietNotes"
  );
  const [searchText, setSearchText] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<TitleEditDraft | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DietDraft>(createEmptyDraft());
  const recipeTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    localStorage.setItem(SHOW_KEY, JSON.stringify(showList));
  }, [showList]);

  useEffect(() => {
    if (selectedId) {
      localStorage.setItem(SELECTED_KEY, selectedId);
      return;
    }

    localStorage.removeItem(SELECTED_KEY);
  }, [selectedId]);

  useEffect(() => {
    if (selectedId && !notes.some((note) => note.id === selectedId)) {
      setSelectedId(notes[0]?.id ?? null);
    }
  }, [notes, selectedId]);

  useEffect(() => {
    const selectedNote = notes.find((note) => note.id === selectedId);

    if (!selectedNote) {
      setDraft(createEmptyDraft());
      return;
    }

    setDraft({
      title: selectedNote.title,
      content: selectedNote.content,
      recipe: selectedNote.recipe,
    });
  }, [notes, selectedId]);

  useEffect(() => {
    const textarea = contentTextareaRef.current;
    const recipeTextarea = recipeTextareaRef.current;

    if (textarea) {
      textarea.style.height = "0px";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
    
    if (recipeTextarea) {
      recipeTextarea.style.height = "0px";
      recipeTextarea.style.height = `${recipeTextarea.scrollHeight}px`;
    }
  }, [draft.content, draft.recipe, selectedId]);

  useEffect(() => {
    if (hasMigratedLegacyNotesRef.current) {
      return;
    }

    if (notes.length > 0) {
      hasMigratedLegacyNotesRef.current = true;
      return;
    }

    const legacyNotes = loadLegacyNotes();

    if (legacyNotes.length === 0) {
      hasMigratedLegacyNotesRef.current = true;
      return;
    }

    hasMigratedLegacyNotesRef.current = true;
    updateNotesWithHistory(legacyNotes);
    localStorage.removeItem(NOTES_KEY);
  }, [notes, updateNotesWithHistory]);

  const filteredNotes = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    const sourceNotes = !keyword
      ? notes
      : notes.filter((note) => {
          const haystack = `${note.title} ${note.content}`.toLowerCase();
          return haystack.includes(keyword);
        });

    return [...sourceNotes].sort((left, right) => {
      if (left.pinned !== right.pinned) {
        return left.pinned ? -1 : 1;
      }

      return right.updatedAt - left.updatedAt;
    });
  }, [notes, searchText]);

  const selectedNote = notes.find((note) => note.id === selectedId) ?? null;
  const canSave =
    draft.title.trim().length > 0 && draft.content.trim().length > 0;

  const handleCreate = () => {
    const nextNote = createNewNote();

    updateNotesWithHistory([nextNote, ...notes]);
    setSelectedId(nextNote.id);
    setSearchText("");
  };

  const handleSave = () => {
    if (!selectedId || !canSave) {
      return;
    }

    updateNotesWithHistory(
      notes.map((note) =>
        note.id === selectedId
          ? {
              ...note,
              title: draft.title.trim(),
              content: draft.content,
              recipe: draft.recipe,
              updatedAt: Date.now(),
            }
          : note
      )
    );

    alert("저장되었습니다!");
  };

  const handleTogglePinned = (id: string) => {
    if (!id) {
      return;
    }

    updateNotesWithHistory(
      notes
        .map((note) =>
          note.id === id
            ? {
                ...note,
                pinned: !note.pinned,
                updatedAt: Date.now(),
              }
            : note
        )
        .sort((left, right) => {
          if (left.pinned !== right.pinned) {
            return left.pinned ? -1 : 1;
          }

          return right.updatedAt - left.updatedAt;
        })
    );
  };

  const handleDelete = () => {
    if (!selectedId) {
      return;
    }

    const nextNotes = notes.filter((note) => note.id !== selectedId);
    updateNotesWithHistory(nextNotes);
    setSelectedId(nextNotes[0]?.id ?? null);
  };

  const handleDeleteNote = (id: string) => {
    const shouldDelete = window.confirm(DELETE_CONFIRM);

    if (!shouldDelete) {
      return;
    }

    const nextNotes = notes.filter((note) => note.id !== id);
    updateNotesWithHistory(nextNotes);

    if (selectedId === id) {
      setSelectedId(nextNotes[0]?.id ?? null);
    }
  };

  const handleStartTitleEdit = (note: DietNote) => {
    setSelectedId(note.id);
    setEditingTitle({
      id: note.id,
      value: note.title,
    });
  };

  const handleCommitTitleEdit = () => {
    if (!editingTitle) {
      return;
    }

    const nextTitle = editingTitle.value.trim();

    if (!nextTitle) {
      setEditingTitle(null);
      return;
    }

    updateNotesWithHistory(
      notes.map((note) =>
        note.id === editingTitle.id
          ? {
              ...note,
              title: nextTitle,
              updatedAt: Date.now(),
            }
          : note
      )
    );
    setEditingTitle(null);
  };

  return (
    <div className="w-full rounded bg-transparent shadow-none transition-opacity">
      <div className="mt-[3px] flex items-center justify-between">
        <button
          className="mx-1 text-xs text-zinc-400 hover:text-white"
          onClick={() => setShowList((prev) => !prev)}
        >
          {showList ? EXPANDED_ICON : COLLAPSED_ICON}
        </button>

        <h2 className="flex-1 truncate text-xs text-blue-600 dark:text-blue-300">
          {BOX_TITLE}
        </h2>
      </div>

      {showList && (
        <div className="mt-2 grid grid-cols-1 items-start gap-0.5">
          <section className="flex min-h-0 flex-col px-0.5 py-1">
            <div className="flex w-full items-center gap-2">
              <input
                type="text"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder={SEARCH_PLACEHOLDER}
                className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-black outline-none select-auto dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
              />

              <button
                type="button"
                onClick={handleCreate}
                className="shrink-0 rounded bg-transparent px-2 py-1 text-xs text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                {NEW_RECIPE}
              </button>
            </div>

            <div
              className="mt-4 h-[120px] max-h-[120px] w-full pr-1 border border-zinc-300 dark:border-zinc-700 rounded px-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={LIST_VIEWPORT_STYLE}
            >
              {filteredNotes.length === 0 ? (
                <div className="rounded border border-dashed border-zinc-300 px-2 py-6 text-center text-xs text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
                  {notes.length === 0 ? EMPTY_LIST : EMPTY_SEARCH}
                </div>
              ) : (
                <div className="grid w-full auto-rows-fr grid-cols-1 gap-1">
                  {filteredNotes.map((note) => {
                    const isHovered = note.id === hoveredId;
                    const isEditingTitle = editingTitle?.id === note.id;
                     const itemClassName = isHovered
                       ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                       : "bg-transparent text-zinc-700 dark:text-zinc-300";

                    return (
                      <div
                        key={note.id}
                        onMouseEnter={() => setHoveredId(note.id)}
                        onMouseLeave={() =>
                          setHoveredId((current) =>
                            current === note.id ? null : current
                          )
                        }
                        className={`group flex min-w-0 items-center gap-2 rounded px-1 py-1 transition ${itemClassName}`}
                      >
                        {isEditingTitle ? (
                          <div className="block min-w-0 flex-1 text-left">
                            <div className="flex min-w-0 items-center gap-2">
                              {note.pinned ? (
                                <span className="shrink-0 text-[11px] leading-none text-blue-600 dark:text-blue-300">
                                  {PINNED_MARK}
                                </span>
                              ) : null}
                              <input
                                type="text"
                                value={editingTitle.value}
                                onChange={(event) =>
                                  setEditingTitle((current) =>
                                    current
                                      ? { ...current, value: event.target.value }
                                      : current
                                  )
                                }
                                onBlur={handleCommitTitleEdit}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    handleCommitTitleEdit();
                                  } else if (event.key === "Escape") {
                                    event.preventDefault();
                                    setEditingTitle(null);
                                  }
                                }}
                                className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-1 py-0.5 text-sm font-semibold text-black outline-none select-auto dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                                autoFocus
                              />
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedId(note.id)}
                            className="block min-w-0 flex-1 text-left"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              {note.pinned ? (
                                <span className="shrink-0 text-[11px] leading-none text-blue-600 dark:text-blue-300">
                                  {PINNED_MARK}
                                </span>
                              ) : null}
                              <span className="block min-w-0 flex-1 truncate whitespace-nowrap text-sm font-semibold leading-none">
                                {note.title.trim() || EMPTY_TITLE}
                              </span>
                            </div>
                          </button>
                        )}

                        <div className="flex shrink-0 items-center gap-px opacity-100 transition xs:opacity-0 xs:group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => handleTogglePinned(note.id)}
                            className={`inline-flex shrink-0 items-center justify-center overflow-hidden px-0 py-0 text-[12px] leading-none transition ${
                              note.pinned
                                ? "text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
                                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                            }`}
                            aria-label="pin"
                            title="pin"
                          >
                            <span className="block whitespace-nowrap leading-none">
                              {PIN_LABEL}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStartTitleEdit(note)}
                            className="inline-flex shrink-0 items-center justify-center overflow-hidden px-0 py-0 text-[12px] leading-none text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                            aria-label="edit title"
                            title="edit title"
                          >
                            <span className="block whitespace-nowrap leading-none">
                              {EDIT_LABEL}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteNote(note.id)}
                            className="inline-flex shrink-0 items-center justify-center overflow-hidden px-0 py-0 text-[12px] leading-none text-zinc-500 transition hover:text-red-700 dark:text-zinc-400 dark:hover:text-red-300"
                            aria-label="delete"
                            title="delete"
                          >
                            <span className="block whitespace-nowrap leading-none">
                              {DELETE_ICON}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="px-0.5 py-1">
            {selectedNote ? (
              <div className="flex flex-col gap-2 border border-zinc-300 dark:border-zinc-700 rounded p-3">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">제목</h3>
                </div>
                <div className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800 mb-3">
                  <input
                    type="text"
                    value={draft.title}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, title: event.target.value }))
                    }
                    placeholder={TITLE_PLACEHOLDER}
                    className="w-full bg-transparent px-0 py-0 text-sm text-black outline-none select-auto dark:text-white"
                  />
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">재료</h3>
                </div>
                <div className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
                  <textarea
                    ref={contentTextareaRef}
                    value={draft.content}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, content: event.target.value }))
                    }
                    placeholder={CONTENT_PLACEHOLDER}
                    className="w-full resize-none overflow-hidden bg-transparent px-0 py-0 text-sm text-black outline-none select-auto dark:text-white"
                  />
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">레시피</h3>
                </div>

                <div className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
                  <textarea
                    ref={recipeTextareaRef}
                    value={draft.recipe}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, recipe: event.target.value }))
                    }
                    placeholder={RECIPE_PLACEHOLDER}
                    className="w-full resize-none overflow-hidden bg-transparent px-0 py-0 text-sm text-black outline-none select-auto dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!canSave}
                    className="rounded bg-zinc-200 px-3 py-1 text-xs text-zinc-500 transition hover:bg-zinc-300 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-600 dark:hover:text-zinc-200"
                  >
                    {SAVE_LABEL}
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="rounded bg-zinc-200 px-3 py-1 text-xs text-zinc-500 transition hover:bg-zinc-300 hover:text-zinc-700 dark:bg-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-600 dark:hover:text-zinc-200"
                  >
                    {DELETE_LABEL}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded border border-dashed border-zinc-300 px-2 py-6 text-center text-xs text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
                {SELECT_NOTE}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
