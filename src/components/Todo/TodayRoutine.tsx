import { useState } from "react";
import { useFirestoreHistory } from "./hooks/useFirestoreHistory";

interface RoutineItem {
  id: string;
  category: string;
  name: string;
  lastChecked: string;
  lastReplaced: string;
  memo: string;
  cycle: number;
}

export default function TodayRoutine() {
  const [showList, setShowList] = useState(true);
  const { items, updateWithHistory } = useFirestoreHistory<RoutineItem>(
    "routineItems",
    "config",
    [],
    "items"
  );

  if (!Array.isArray(items)) return null;

  const calculateDays = (lastChecked: string, cycle: number): number => {
    if (!lastChecked) return 0;
    const last = new Date(lastChecked);
    const now = getToday6AM();
    const diffMs = now.getTime() - last.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays - cycle;
  };

  const getToday6AM = () => {
    const now = new Date();
    if (now.getHours() < 6) {
      now.setDate(now.getDate() - 1);
    }
    now.setHours(9, 0, 0, 0);
    return now;
  };

  const handleInlineDateChange = async (
    id: string,
    field: "lastChecked" | "lastReplaced",
    value: string
  ) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    );

    updateWithHistory(updated);

    if ((window as any).externalRoutineHistory?.push) {
      (window as any).externalRoutineHistory.push({
        boxes: updated,
        lastCheckedDate: "",
      });
    }
  };

  const sortedItems = items
    .map((item) => ({
      ...item,
      remaining: calculateDays(item.lastChecked, item.cycle),
    }))
    .filter((item) => item.remaining >= -3)
    .sort((a, b) => b.remaining - a.remaining);

  return (
    <div className="border border-gray-300 dark:border-zinc-700 p-2 rounded shadow bg-white dark:bg-zinc-900 w-full transition-opacity">
      <div className="flex items-center justify-between">
        <button
          className="mx-1 text-zinc-400 hover:text-white cursor-pointer text-sm transition"
          onClick={() => setShowList(!showList)}
        >
          {showList ? "▷" : "▽"}
        </button>
        <h2 className="flex-1 min-w-0 text-blue-300 bg-transparent outline-none truncate text-xs">
          집안일루틴
        </h2>
      </div>

      {showList && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-2">
          {sortedItems.map((item) => {
            const liClass =
              item.remaining >= 0
                ? "bg-red-200 dark:bg-red-900 text-red-800 dark:text-zinc-100 border-red-300 dark:border-red-500"
                : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700";

            const memoClass =
              item.remaining >= 0
                ? "text-zinc-500 dark:text-zinc-400"
                : "text-gray-400 dark:text-zinc-700";

            return (
              <li
                key={item.id}
                className={`border rounded px-2 py-1 space-y-1 text-sm ${liClass}`}
              >
                <div className="flex justify-between items-center font-medium">
                  <div className="flex items-center space-x-2 font-bold">
                    <span>{item.name}</span>
                  </div>
                  <span className="flex items-center gap-1 shrink-0 text-right ml-2 whitespace-nowrap">
                    <span className="font-light">
                      {item.remaining > 0
                        ? `D+${item.remaining}`
                        : item.remaining < 0
                          ? `D-${Math.abs(item.remaining)}`
                          : "오늘"}
                    </span>
                    <div className="relative w-5 h-5">
                      <input
                        type="date"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) =>
                          handleInlineDateChange(
                            item.id,
                            "lastChecked",
                            e.target.value
                          )
                        }
                      />
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-5 h-5 text-zinc-400 pointer-events-none"
                        fill="none"
                        viewBox="0 -6 36 36"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  </span>
                </div>

                <div className="flex flex-col text-[11px] font-light">
                  <span className={`whitespace-pre-wrap break-words ${memoClass}`}>
                    {item.memo}
                  </span>
                  {item.lastReplaced && (
                    <span className="flex items-center gap-1 self-end mt-1 text-xs whitespace-nowrap text-zinc-400">
                      {item.lastReplaced}
                      <div className="relative w-5 h-5">
                        <input
                          type="date"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) =>
                            handleInlineDateChange(
                              item.id,
                              "lastReplaced",
                              e.target.value
                            )
                          }
                        />
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-5 h-5 text-zinc-400 pointer-events-none"
                          fill="none"
                          viewBox="0 -6 36 36"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

