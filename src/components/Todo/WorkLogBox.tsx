import { useEffect, useState } from "react";
import { useFirestoreHistory } from "./hooks/useFirestoreHistory";

interface WorkLogItem {
  id: string;
  date: string;
  project: string;
  content: string;
  time: string;
}

const emptyInput = {
  date: "",
  project: "",
  content: "",
  time: "",
};

const DEFAULT_WORK_LOGS: WorkLogItem[] = [];
const DEFAULT_PROJECTS: string[] = [];

const getTodayKey = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

const getCurrentMonthKey = () => getTodayKey().slice(0, 7);

export default function WorkLogBox() {
  const [showList, setShowList] = useState(() => {
    const saved = localStorage.getItem("workLogBox_showList");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [input, setInput] = useState(emptyInput);
  const [monthFilter, setMonthFilter] = useState(getCurrentMonthKey);
  const [projectFilter, setProjectFilter] = useState("");
  const [newProject, setNewProject] = useState("");
  const [showProjectInput, setShowProjectInput] = useState(false);

  const { items, updateWithHistory } = useFirestoreHistory<WorkLogItem>(
    "workLogData",
    "main",
    DEFAULT_WORK_LOGS,
    "items"
  );
  const { items: projects, updateWithHistory: updateProjects } =
    useFirestoreHistory<string>(
      "workLogData",
      "main",
      DEFAULT_PROJECTS,
      "projects"
    );
  const todayKey = getTodayKey();
  const inferredProjects = Array.from(
    new Set(items.map((item) => item.project.trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
  const projectOptions = projects
    .map((project) => project.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
  const filteredItems = items.filter((item) => {
    const matchesMonth = !monthFilter || item.date.startsWith(monthFilter);
    const matchesProject = !projectFilter || item.project === projectFilter;
    return matchesMonth && matchesProject;
  });

  useEffect(() => {
    localStorage.setItem("workLogBox_showList", JSON.stringify(showList));
  }, [showList]);

  useEffect(() => {
    if (projects.length > 0 || inferredProjects.length === 0) return;
    updateProjects(inferredProjects);
  }, [inferredProjects, projects.length, updateProjects]);

  const updateInput = (field: keyof typeof emptyInput, value: string) => {
    setInput((prev) => ({ ...prev, [field]: value }));
  };

  const addProject = () => {
    const project = newProject.trim();
    if (!project || projectOptions.includes(project)) return;

    updateProjects([...projectOptions, project]);
    setNewProject("");
    setShowProjectInput(false);
  };

  const deleteProject = () => {
    if (!projectFilter) return;

    updateProjects(projectOptions.filter((project) => project !== projectFilter));
    if (input.project === projectFilter) {
      updateInput("project", "");
    }
    setProjectFilter("");
  };

  const addItem = () => {
    const next = {
      date: input.date.trim(),
      project: input.project.trim(),
      content: input.content.trim(),
      time: input.time.trim(),
    };

    if (!Object.values(next).some(Boolean)) return;

    updateWithHistory([
      ...items,
      {
        id: crypto.randomUUID(),
        ...next,
      },
    ]);
    setInput(emptyInput);
  };

  const updateItem = (
    id: string,
    patch: Partial<Pick<WorkLogItem, "date" | "project" | "content" | "time">>
  ) => {
    updateWithHistory(
      items.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  return (
    <div className="w-full rounded bg-transparent shadow-none transition-opacity">
      <div className="mt-[3px] flex items-center justify-between">
        <button
          type="button"
          className="mx-1 cursor-pointer text-xs text-zinc-400 transition hover:text-white"
          onClick={() => setShowList(!showList)}
          aria-label={showList ? "접기" : "펼치기"}
          title={showList ? "접기" : "펼치기"}
        >
          {showList ? "▽" : "▷"}
        </button>

        <h2 className="min-w-0 flex-1 truncate bg-transparent text-xs text-blue-600 outline-none dark:text-blue-300">
          작업일지
        </h2>
      </div>

      {showList && (
        <div className="mt-2 overflow-x-auto">
          <div className="min-w-[520px]">
            <div className="mb-4 grid grid-cols-[120px_150px_42px_minmax(0,1fr)] items-center gap-1">
              <input
                type="month"
                value={monthFilter}
                onChange={(event) => setMonthFilter(event.target.value)}
                className="min-w-0 rounded border border-zinc-200 bg-transparent px-1.5 py-1 text-xs outline-none select-auto dark:border-zinc-700"
                title="월별 필터"
              />
              <select
                value={projectFilter}
                onChange={(event) => setProjectFilter(event.target.value)}
                className="min-w-0 rounded border border-zinc-200 bg-white px-1.5 py-1 text-xs text-zinc-900 outline-none select-auto dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                title="프로젝트별 필터"
              >
                <option value="">전체 프로젝트</option>
                {projectOptions.map((project) => (
                  <option key={project} value={project}>
                    {project}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setMonthFilter("");
                  setProjectFilter("");
                }}
                className="justify-self-start rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-500 transition hover:text-blue-500 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-blue-300"
              >
                전체
              </button>
              <div className="flex min-w-0 items-center justify-end gap-1">
                {projectFilter && (
                  <button
                    type="button"
                    onClick={deleteProject}
                    className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-500 transition hover:text-red-400 dark:border-zinc-700 dark:text-zinc-400"
                  >
                    삭제
                  </button>
                )}
                {showProjectInput ? (
                  <div className="flex min-w-0 items-center gap-1 rounded border border-zinc-200 px-1 py-0.5 dark:border-zinc-700">
                    <input
                      value={newProject}
                      onChange={(event) => setNewProject(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addProject();
                        }
                      }}
                      className="min-w-0 bg-transparent text-xs outline-none select-auto"
                      placeholder="프로젝트"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newProject.trim()) {
                          setShowProjectInput(false);
                          return;
                        }
                        addProject();
                      }}
                      className="px-1 text-sm text-zinc-500 hover:text-blue-500 dark:text-zinc-400 dark:hover:text-blue-300"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowProjectInput(true)}
                    className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-500 transition hover:text-blue-500 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-blue-300"
                  >
                    프로젝트 +
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1">
              {filteredItems.map((item) => {
                const isToday = item.date === todayKey;

                return (
                  <div
                    key={item.id}
                    className={`group grid grid-cols-[92px_130px_minmax(200px,1fr)_70px_24px] items-center gap-1 rounded px-1.5 py-0.5 text-sm transition ${
                      isToday
                        ? "bg-blue-50 text-blue-900 dark:bg-blue-500/15 dark:text-blue-100"
                        : ""
                    }`}
                  >
                    <input
                      type="date"
                      value={item.date}
                      onChange={(event) => updateItem(item.id, { date: event.target.value })}
                      className={`min-w-0 bg-transparent text-xs outline-none select-auto ${
                        isToday
                          ? "text-blue-700 dark:text-blue-200"
                          : "text-zinc-500 dark:text-zinc-400"
                      }`}
                    />
                    <select
                      value={item.project}
                      onChange={(event) => updateItem(item.id, { project: event.target.value })}
                      className="min-w-0 bg-white text-sm text-zinc-900 outline-none select-auto dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      <option value="">프로젝트</option>
                      {projectOptions.map((project) => (
                        <option key={project} value={project}>
                          {project}
                        </option>
                      ))}
                    </select>
                    <input
                      value={item.content}
                      onChange={(event) => updateItem(item.id, { content: event.target.value })}
                      className="min-w-0 bg-transparent text-sm outline-none select-auto"
                    />
                    <input
                      value={item.time}
                      onChange={(event) => updateItem(item.id, { time: event.target.value })}
                      className={`min-w-0 bg-transparent text-xs outline-none select-auto ${
                        isToday
                          ? "text-blue-700 dark:text-blue-200"
                          : "text-zinc-500 dark:text-zinc-400"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateWithHistory(items.filter((row) => row.id !== item.id))
                      }
                      className="text-xs text-zinc-400 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                      title="삭제"
                    >
                      X
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-1 grid grid-cols-[92px_130px_minmax(200px,1fr)_70px_24px] items-center gap-1 rounded border border-zinc-200 p-1 dark:border-zinc-700">
              <input
                type="date"
                value={input.date}
                onChange={(event) => updateInput("date", event.target.value)}
                className="min-w-0 bg-transparent text-xs outline-none select-auto"
              />
              <select
                value={input.project}
                onChange={(event) => updateInput("project", event.target.value)}
                className="min-w-0 bg-white text-sm text-zinc-900 outline-none select-auto dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="">프로젝트</option>
                {projectOptions.map((project) => (
                  <option key={project} value={project}>
                    {project}
                  </option>
                ))}
              </select>
              <input
                value={input.content}
                onChange={(event) => updateInput("content", event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addItem();
                  }
                }}
                className="min-w-0 bg-transparent text-sm outline-none select-auto"
                placeholder="내용"
              />
              <input
                value={input.time}
                onChange={(event) => updateInput("time", event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addItem();
                  }
                }}
                className="min-w-0 bg-transparent text-xs outline-none select-auto"
                placeholder="시간"
              />
              <button
                type="button"
                onClick={addItem}
                className="rounded bg-transparent px-1 py-0.5 text-sm text-zinc-500 hover:text-blue-500 dark:text-zinc-400 dark:hover:text-blue-300"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
