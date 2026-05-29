import { useEffect, useState } from "react";
import { useFirestoreHistory } from "./hooks/useFirestoreHistory";

interface PersonalPlanItem {
  id: string;
  title: string;
  checked?: boolean;
  side?: PlanSide;
}

type PlanSide = "left" | "right";

const DEFAULT_PERSONAL_PLANS: PersonalPlanItem[] = [];

const PLAN_SIDES: PlanSide[] = ["left", "right"];

export default function PlanBox() {
  const [showList, setShowList] = useState(() => {
    const saved = localStorage.getItem("planBox_showList");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [personalTitles, setPersonalTitles] = useState<Record<PlanSide, string>>({
    left: "",
    right: "",
  });
  const [openInputSide, setOpenInputSide] = useState<PlanSide | null>(null);

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

  const addPersonalPlan = (side: PlanSide) => {
    const title = personalTitles[side].trim();
    if (!title) return;

    updatePersonalPlans([
      ...personalPlans,
      {
        id: crypto.randomUUID(),
        title,
        checked: false,
        side,
      },
    ]);
    setPersonalTitles((prev) => ({ ...prev, [side]: "" }));
    setOpenInputSide(null);
  };

  const updatePersonalPlan = (
    id: string,
    patch: Partial<Pick<PersonalPlanItem, "title" | "checked" | "side">>
  ) => {
    updatePersonalPlans(
      personalPlans.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const deletePersonalPlan = (id: string) => {
    updatePersonalPlans(personalPlans.filter((item) => item.id !== id));
  };

  return (
    <div className="w-full rounded bg-transparent shadow-none transition-opacity">
      <div className="mt-[3px] flex items-center justify-between">
        <button
          type="button"
          className="mx-1 cursor-pointer text-xs text-zinc-400 transition hover:text-white"
          onClick={() => setShowList(!showList)}
          aria-label={showList ? "숨기기" : "펼치기"}
          title={showList ? "숨기기" : "펼치기"}
        >
          {showList ? "▾" : "▸"}
        </button>

        <h2 className="min-w-0 flex-1 truncate bg-transparent text-xs text-blue-600 outline-none dark:text-blue-300">
          계획
        </h2>
      </div>

      {showList && (
        <div className="mt-2 grid grid-cols-1 gap-2 xs:grid-cols-2">
          {PLAN_SIDES.map((side) => (
            <div key={side} className="min-w-0">
              <div className="space-y-1">
                {personalPlans
                  .filter((item) => (item.side ?? "left") === side)
                  .map((item) => (
                    <div
                      key={item.id}
                      className={`group grid grid-cols-[18px_minmax(0,1fr)_18px] items-center gap-1 rounded px-1.5 py-0.5 text-sm transition-opacity ${
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
                        onChange={(event) =>
                          updatePersonalPlan(item.id, { title: event.target.value })
                        }
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

              {openInputSide === side ? (
                <div className="mt-1 flex items-center gap-1 rounded border border-zinc-200 p-1 dark:border-zinc-700">
                  <input
                    value={personalTitles[side]}
                    onChange={(event) =>
                      setPersonalTitles((prev) => ({
                        ...prev,
                        [side]: event.target.value,
                      }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addPersonalPlan(side);
                      }
                    }}
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none select-auto"
                    placeholder="계획 추가"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!personalTitles[side].trim()) {
                        setOpenInputSide(null);
                        return;
                      }
                      addPersonalPlan(side);
                    }}
                    className="rounded bg-transparent px-1 py-0.5 text-sm text-zinc-500 hover:text-blue-500 dark:text-zinc-400 dark:hover:text-blue-300"
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setOpenInputSide(side)}
                  className="mt-1 w-full rounded border border-dashed border-zinc-300 px-2 py-1 text-center text-xs font-bold text-zinc-500 transition hover:border-[#a891ff] hover:text-[#a891ff] dark:border-zinc-700 dark:text-zinc-400"
                >
                  +
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
