import { useEffect, useState } from "react";
import { useFirestoreHistory } from "./hooks/useFirestoreHistory";

interface MonthlyPlanItem {
  id: string;
  title: string;
  checked: boolean;
  hours: string;
}

interface PersonalPlanItem {
  id: string;
  title: string;
  checked?: boolean;
}

const DEFAULT_MONTHLY_PLANS: MonthlyPlanItem[] = [];
const DEFAULT_PERSONAL_PLANS: PersonalPlanItem[] = [];

const getNumber = (value: string) => value.replace(/[^0-9.]/g, "");

function formatHours(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default function PlanBox() {
  const [showList, setShowList] = useState(() => {
    const saved = localStorage.getItem("planBox_showList");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [monthlyTitle, setMonthlyTitle] = useState("");
  const [personalTitle, setPersonalTitle] = useState("");
  const [showMonthlyInput, setShowMonthlyInput] = useState(false);
  const [showPersonalInput, setShowPersonalInput] = useState(false);

  const {
    items: monthlyPlans,
    updateWithHistory: updateMonthlyPlans,
  } = useFirestoreHistory<MonthlyPlanItem>(
    "planData",
    "main",
    DEFAULT_MONTHLY_PLANS,
    "monthlyPlans"
  );
  const {
    items: personalPlans,
    updateWithHistory: updatePersonalPlans,
  } = useFirestoreHistory<PersonalPlanItem>(
    "planData",
    "main",
    DEFAULT_PERSONAL_PLANS,
    "personalPlans"
  );

  useEffect(() => {
    localStorage.setItem("planBox_showList", JSON.stringify(showList));
  }, [showList]);

  const totalHours = monthlyPlans.reduce(
    (sum, item) => sum + (Number(item.hours) || 0),
    0
  );

  const addMonthlyPlan = () => {
    const title = monthlyTitle.trim();
    if (!title) return;

    updateMonthlyPlans([
      ...monthlyPlans,
      {
        id: crypto.randomUUID(),
        title,
        checked: false,
        hours: "",
      },
    ]);
    setMonthlyTitle("");
    setShowMonthlyInput(false);
  };

  const updateMonthlyPlan = (
    id: string,
    patch: Partial<Pick<MonthlyPlanItem, "title" | "checked" | "hours">>
  ) => {
    updateMonthlyPlans(
      monthlyPlans.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const deleteMonthlyPlan = (id: string) => {
    updateMonthlyPlans(monthlyPlans.filter((item) => item.id !== id));
  };

  const addPersonalPlan = () => {
    const title = personalTitle.trim();
    if (!title) return;

    updatePersonalPlans([
      ...personalPlans,
      {
        id: crypto.randomUUID(),
        title,
        checked: false,
      },
    ]);
    setPersonalTitle("");
    setShowPersonalInput(false);
  };

  const updatePersonalPlan = (id: string, patch: Partial<Pick<PersonalPlanItem, "title" | "checked">>) => {
    updatePersonalPlans(
      personalPlans.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const deletePersonalPlan = (id: string) => {
    updatePersonalPlans(personalPlans.filter((item) => item.id !== id));
  };

  return (
    <div className="rounded bg-transparent shadow-none w-full transition-opacity">
      <div className="flex items-center justify-between mt-[3px]">
        <button
          type="button"
          className="mx-1 cursor-pointer text-xs text-zinc-400 transition hover:text-white"
          onClick={() => setShowList(!showList)}
          aria-label={showList ? "접기" : "펼치기"}
          title={showList ? "접기" : "펼치기"}
        >
          {showList ? "▽" : "▷"}
        </button>

        <h2 className="flex-1 min-w-0 truncate bg-transparent text-xs text-blue-600 outline-none dark:text-blue-300">
          계획
        </h2>
      </div>

      {showList && (
        <div className="mt-2 grid grid-cols-1 gap-3 xs:grid-cols-2">
          <section className="min-w-0">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                한달계획
              </h3>
              <span className="text-[11px] text-zinc-400">
                합계 {formatHours(totalHours)}시간
              </span>
            </div>

            <div className="space-y-1">
              {monthlyPlans.map((item) => (
                <div
                  key={item.id}
                  className={`group grid grid-cols-[18px_minmax(0,1fr)_54px_18px] items-center gap-1 rounded border border-zinc-200 px-1.5 py-0.5 text-sm transition-opacity dark:border-zinc-700 ${
                    item.checked ? "opacity-45" : "opacity-100"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(event) =>
                      updateMonthlyPlan(item.id, { checked: event.target.checked })
                    }
                    className="h-3.5 w-3.5"
                  />
                  <input
                    value={item.title}
                    onChange={(event) =>
                      updateMonthlyPlan(item.id, { title: event.target.value })
                    }
                    className={`min-w-0 bg-transparent text-sm outline-none select-auto ${
                      item.checked ? "text-zinc-400 line-through" : ""
                    }`}
                  />
                  <input
                    inputMode="decimal"
                    value={item.hours}
                    onChange={(event) =>
                      updateMonthlyPlan(item.id, { hours: getNumber(event.target.value) })
                    }
                    className="min-w-0 bg-transparent text-right text-xs outline-none select-auto"
                    placeholder="시간"
                  />
                  <button
                    type="button"
                    onClick={() => deleteMonthlyPlan(item.id)}
                    className="text-xs text-zinc-400 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                    title="삭제"
                  >
                    X
                  </button>
                </div>
              ))}
            </div>

            {showMonthlyInput ? (
              <div className="mt-1 flex items-center gap-1 rounded border border-zinc-200 p-1 dark:border-zinc-700">
                <input
                  value={monthlyTitle}
                  onChange={(event) => setMonthlyTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addMonthlyPlan();
                    }
                  }}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none select-auto"
                  placeholder="한달계획 추가"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!monthlyTitle.trim()) {
                      setShowMonthlyInput(false);
                      return;
                    }
                    addMonthlyPlan();
                  }}
                  className="rounded bg-transparent px-1 py-0.5 text-sm text-zinc-500 hover:text-blue-500 dark:text-zinc-400 dark:hover:text-blue-300"
                >
                  +
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowMonthlyInput(true)}
                className="mt-1 w-full rounded border border-dashed border-zinc-300 px-2 py-1 text-center text-xs font-bold text-zinc-500 transition hover:border-[#a891ff] hover:text-[#a891ff] dark:border-zinc-700 dark:text-zinc-400"
              >
                +
              </button>
            )}
          </section>

          <section className="min-w-0">
            <h3 className="mb-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              개별계획
            </h3>

            <div className="space-y-1">
              {personalPlans.map((item) => (
                <div
                  key={item.id}
                  className={`group grid grid-cols-[18px_minmax(0,1fr)_18px] items-center gap-1 rounded border border-zinc-200 px-1.5 py-0.5 text-sm transition-opacity dark:border-zinc-700 ${
                    item.checked ? "opacity-45" : "opacity-100"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(item.checked)}
                    onChange={(event) =>
                      updatePersonalPlan(item.id, { checked: event.target.checked })
                    }
                    className="h-3.5 w-3.5"
                  />
                  <input
                    value={item.title}
                    onChange={(event) => updatePersonalPlan(item.id, { title: event.target.value })}
                    className={`min-w-0 bg-transparent text-sm outline-none select-auto ${
                      item.checked ? "text-zinc-400 line-through" : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => deletePersonalPlan(item.id)}
                    className="text-xs text-zinc-400 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                    title="삭제"
                  >
                    X
                  </button>
                </div>
              ))}
            </div>

            {showPersonalInput ? (
              <div className="mt-1 flex items-center gap-1 rounded border border-zinc-200 p-1 dark:border-zinc-700">
                <input
                  value={personalTitle}
                  onChange={(event) => setPersonalTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addPersonalPlan();
                    }
                  }}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none select-auto"
                  placeholder="개별계획 추가"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!personalTitle.trim()) {
                      setShowPersonalInput(false);
                      return;
                    }
                    addPersonalPlan();
                  }}
                  className="rounded bg-transparent px-1 py-0.5 text-sm text-zinc-500 hover:text-blue-500 dark:text-zinc-400 dark:hover:text-blue-300"
                >
                  +
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowPersonalInput(true)}
                className="mt-1 w-full rounded border border-dashed border-zinc-300 px-2 py-1 text-center text-xs font-bold text-zinc-500 transition hover:border-[#a891ff] hover:text-[#a891ff] dark:border-zinc-700 dark:text-zinc-400"
              >
                +
              </button>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
