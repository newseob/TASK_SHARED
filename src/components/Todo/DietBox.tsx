import { useEffect, useMemo, useRef, useState } from "react";

type DietNote = {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
  pinned: boolean;
};

type DietDraft = {
  title: string;
  content: string;
};

const SHOW_KEY = "dietBox_showList";
const NOTES_KEY = "dietBox_notes_v1";
const SELECTED_KEY = "dietBox_selectedId_v1";
const COLLAPSED_ICON = "\u25B7";
const EXPANDED_ICON = "\u25BD";
const BOX_TITLE = "\uC2DD\uB2E8";
const SEARCH_PLACEHOLDER = "\uAC80\uC0C9";
const EMPTY_TITLE = "\uC81C\uBAA9 \uC5C6\uC74C";
const EMPTY_LIST = "\uBAA9\uB85D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4";
const EMPTY_SEARCH = "\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4";
const NEW_RECIPE = "+ \uC0C8 \uB808\uC2DC\uD53C";
const TITLE_PLACEHOLDER = "\uC81C\uBAA9";
const CONTENT_PLACEHOLDER = "\uB0B4\uC6A9";
const SAVE_LABEL = "\uC800\uC7A5";
const DELETE_LABEL = "\uC0AD\uC81C";
const SELECT_NOTE = "\uBAA9\uB85D\uC5D0\uC11C \uD56D\uBAA9\uC744 \uC120\uD0DD\uD558\uC138\uC694";
const PIN_LABEL = "\uACE0\uC815";
const PINNED_MARK = "\u2611";
const DELETE_CONFIRM = "\uC774 \uB808\uC2DC\uD53C\uB97C \uC0AD\uC81C\uD560\uAE4C\uC694?";

const PIN_BUTTON_STYLE = {
  width: "44px",
  minWidth: "44px",
  maxWidth: "44px",
} as const;

const LIST_VIEWPORT_STYLE = {
  height: "240px",
  maxHeight: "240px",
  overflowY: "auto",
  overscrollBehavior: "contain",
} as const;

function createEmptyDraft(): DietDraft {
  return {
    title: "",
    content: "",
  };
}

function createNewNote(): DietNote {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "",
    content: "",
    updatedAt: Date.now(),
    pinned: false,
  };
}

function loadNotes(): DietNote[] {
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
  const [showList, setShowList] = useState(() => {
    const saved = localStorage.getItem(SHOW_KEY);
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [notes, setNotes] = useState<DietNote[]>(() => loadNotes());
  const [searchText, setSearchText] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return localStorage.getItem(SELECTED_KEY);
  });
  const [draft, setDraft] = useState<DietDraft>(createEmptyDraft());

  useEffect(() => {
    localStorage.setItem(SHOW_KEY, JSON.stringify(showList));
  }, [showList]);

  useEffect(() => {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    if (selectedId) {
      localStorage.setItem(SELECTED_KEY, selectedId);
      return;
    }

    localStorage.removeItem(SELECTED_KEY);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId && notes.length > 0) {
      setSelectedId(notes[0].id);
      return;
    }

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
    });
  }, [notes, selectedId]);

  useEffect(() => {
    const textarea = contentTextareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [draft.content, selectedId]);

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

    setNotes((current) => [nextNote, ...current]);
    setSelectedId(nextNote.id);
    setSearchText("");
  };

  const handleSave = () => {
    if (!selectedId || !canSave) {
      return;
    }

    setNotes((current) =>
      current.map((note) =>
        note.id === selectedId
          ? {
              ...note,
              title: draft.title.trim(),
              content: draft.content,
              updatedAt: Date.now(),
            }
          : note
      )
    );
  };

  const handleTogglePinned = (id: string) => {
    if (!id) {
      return;
    }

    setNotes((current) =>
      current
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
    setNotes(nextNotes);
    setSelectedId(nextNotes[0]?.id ?? null);
  };

  const handleDeleteNote = (id: string) => {
    const shouldDelete = window.confirm(DELETE_CONFIRM);

    if (!shouldDelete) {
      return;
    }

    const nextNotes = notes.filter((note) => note.id !== id);
    setNotes(nextNotes);

    if (selectedId === id) {
      setSelectedId(nextNotes[0]?.id ?? null);
    }
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
        <div className="mt-2 grid grid-cols-1 items-start gap-3">
          <section className="flex min-h-0 flex-col px-0.5 py-2">
            <div className="flex w-full items-center">
              <input
                type="text"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder={SEARCH_PLACEHOLDER}
                className="w-full min-w-0 rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-black outline-none select-auto dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
              />
            </div>

            <div
              className="show-scrollbar mt-4 w-full pr-1"
              style={LIST_VIEWPORT_STYLE}
            >
              {filteredNotes.length === 0 ? (
                <div className="rounded border border-dashed border-zinc-300 px-2 py-6 text-center text-xs text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
                  {notes.length === 0 ? EMPTY_LIST : EMPTY_SEARCH}
                </div>
              ) : (
                <div className="grid w-full auto-rows-fr grid-cols-1 gap-2 xs:grid-cols-2 md:grid-cols-1">
                  {filteredNotes.map((note) => {
                    const isHovered = note.id === hoveredId;
                    const itemClassName = isHovered
                      ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                      : "bg-zinc-100/70 text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300";

                    return (
                      <div
                        key={note.id}
                        onMouseEnter={() => setHoveredId(note.id)}
                        onMouseLeave={() =>
                          setHoveredId((current) =>
                            current === note.id ? null : current
                          )
                        }
                        className={`group flex min-w-0 items-center gap-2 rounded px-1 py-3 transition ${itemClassName}`}
                      >
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

                        <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => handleTogglePinned(note.id)}
                            style={PIN_BUTTON_STYLE}
                            className={`inline-flex h-5 shrink-0 items-center justify-center overflow-hidden whitespace-nowrap rounded text-[11px] leading-none transition ${
                              note.pinned
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                            }`}
                          >
                            <span className="block whitespace-nowrap leading-none">
                              {PIN_LABEL}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteNote(note.id)}
                            style={PIN_BUTTON_STYLE}
                            className="inline-flex h-5 shrink-0 items-center justify-center overflow-hidden whitespace-nowrap rounded bg-zinc-200 text-[11px] leading-none text-zinc-700 transition hover:bg-red-200 hover:text-red-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-red-900/40 dark:hover:text-red-300"
                          >
                            <span className="block whitespace-nowrap leading-none">
                              {DELETE_LABEL}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={handleCreate}
                className="rounded bg-transparent px-3 py-1 text-xs text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                {NEW_RECIPE}
              </button>
            </div>
          </section>

          <section className="px-0.5 py-2">
            {selectedNote ? (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder={TITLE_PLACEHOLDER}
                  className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-black outline-none select-auto dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                />

                <textarea
                  ref={contentTextareaRef}
                  value={draft.content}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, content: event.target.value }))
                  }
                  placeholder={CONTENT_PLACEHOLDER}
                  className="resize-none overflow-hidden rounded border border-zinc-300 bg-white px-2 py-2 text-sm text-black outline-none select-auto dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                />

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
              <div className="grid min-h-[220px] place-items-center text-center text-xs text-zinc-400 dark:text-zinc-500">
                {SELECT_NOTE}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
