// MoneyBox.tsx

import { useState, useEffect, useRef } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useGlobalUndoScope } from "../../hooks/useGlobalUndoScope";

interface MoneyData {
  categoryBudget: string[];
  categoryCurrent: string[];
  categoryOrder?: string[];
  memo?: string[];
  cumulative?: string[];
  users?: {
    yuseop: {
      budget: string[];
      current: string[];
    };
    gyeongin: {
      budget: string[];
      current: string[];
    };
    aca: {
      budget: string[];
      current: string[];
    };
  };
}

interface MoneySnapshot {
  budget: string[][];
  current: string[][];
  memo: string[];
  cumulative: string[];
}

const LEGACY_CATEGORIES = [
  "장보기",
  "식비",
  "생활",
  "간식/카페",
  "꾸밈",
  "여가",
  "여행",
  "고양이",
  "경조사비",
  "구독",
  "기타",
];

const MONEY_CATEGORIES = [
  "장보기",
  "생활",
  "식비",
  "간식/카페",
  "꾸밈",
  "여가",
  "기타",
  "여행",
  "고양이",
  "경조사비",
  "구독",
];

function remapCategoryRow(row: string[] = [], fromOrder: string[]) {
  return MONEY_CATEGORIES.map((category) => {
    const oldIndex = fromOrder.indexOf(category);
    return oldIndex >= 0 ? row[oldIndex] ?? "" : "";
  });
}

function remapCategoryRows(rows: string[][] = [], fromOrder: string[]) {
  return Array.from({ length: 3 }, (_, index) =>
    remapCategoryRow(rows[index] ?? [], fromOrder)
  );
}

function cloneMoneySnapshot(snapshot: MoneySnapshot): MoneySnapshot {
  return {
    budget: snapshot.budget.map((row) => [...row]),
    current: snapshot.current.map((row) => [...row]),
    memo: [...snapshot.memo],
    cumulative: [...snapshot.cumulative],
  };
}

function isSameMoneySnapshot(left: MoneySnapshot, right: MoneySnapshot) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export default function MoneyBox() {
  const [showList, setShowList] = useState(() => {
    // localStorage에서 상태 복원
    const saved = localStorage.getItem("moneyBox_showList");
    return saved !== null ? JSON.parse(saved) : false;
  });

  const [showUsers, setShowUsers] = useState(() => {
    const saved = localStorage.getItem("moneyBox_showUsers");
    return saved !== null ? JSON.parse(saved) : true;
  });

  // 상태 변경 시 localStorage에 저장
  useEffect(() => {
    localStorage.setItem("moneyBox_showList", JSON.stringify(showList));
  }, [showList]);

  useEffect(() => {
    localStorage.setItem("moneyBox_showUsers", JSON.stringify(showUsers));
  }, [showUsers]);

  const categories = MONEY_CATEGORIES;

  const [categoryBudget, setCategoryBudget] = useState<string[][]>(
    Array(3).fill(null).map(() => Array(categories.length).fill(""))
  );

  const [categoryCurrent, setCategoryCurrent] = useState<string[][]>(
    Array(3).fill(null).map(() => Array(categories.length).fill(""))
  );

  const [categoryMemo, setCategoryMemo] = useState<string[]>(
    Array(categories.length).fill("")
  );

  const [categoryCumulative, setCategoryCumulative] = useState<string[]>(
    Array(categories.length).fill("")
  );
  const [history, setHistory] = useState<MoneySnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyRef = useRef<MoneySnapshot[]>([]);
  const historyIndexRef = useRef(-1);

  // 초기 데이터 상태 저장 (변경 감지용)
  const [initialData, setInitialData] = useState<{
    budget: string[][];
    current: string[][];
    memo: string[];
    cumulative: string[];
  } | null>(null);

  useEffect(() => {
    historyRef.current = history;
    historyIndexRef.current = historyIndex;
  }, [history, historyIndex]);

  const applySnapshot = (snapshot: MoneySnapshot) => {
    const cloned = cloneMoneySnapshot(snapshot);
    setCategoryBudget(cloned.budget);
    setCategoryCurrent(cloned.current);
    setCategoryMemo(cloned.memo);
    setCategoryCumulative(cloned.cumulative);
  };

  const setHistoryState = (nextHistory: MoneySnapshot[], nextIndex: number) => {
    historyRef.current = nextHistory;
    historyIndexRef.current = nextIndex;
    setHistory(nextHistory);
    setHistoryIndex(nextIndex);
  };

  const applyMoneyChange = (snapshot: MoneySnapshot) => {
    const cloned = cloneMoneySnapshot(snapshot);
    const currentSnapshot = historyRef.current[historyIndexRef.current];

    applySnapshot(cloned);

    if (!currentSnapshot || !isSameMoneySnapshot(currentSnapshot, cloned)) {
      const nextHistory = [...historyRef.current.slice(0, historyIndexRef.current + 1), cloned];
      setHistoryState(nextHistory, nextHistory.length - 1);
      touch();
    }
  };

  const undoMoney = () => {
    const nextIndex = historyIndexRef.current - 1;
    if (nextIndex < 0) return;

    const snapshot = cloneMoneySnapshot(historyRef.current[nextIndex]);
    applySnapshot(snapshot);
    setHistoryIndex(nextIndex);
    historyIndexRef.current = nextIndex;
  };

  const { touch } = useGlobalUndoScope({
    canUndo: () => historyIndexRef.current > 0,
    undo: undoMoney,
  });

  // 데이터 변경 감지
  const hasChanges = initialData ? (
    JSON.stringify(initialData.budget) !== JSON.stringify(categoryBudget) ||
    JSON.stringify(initialData.current) !== JSON.stringify(categoryCurrent) ||
    JSON.stringify(initialData.memo) !== JSON.stringify(categoryMemo) ||
    JSON.stringify(initialData.cumulative) !== JSON.stringify(categoryCumulative)
  ) : false;

  // 변경 감지 디버깅
  useEffect(() => {
    if (initialData) {
      const budgetChanged = JSON.stringify(initialData.budget) !== JSON.stringify(categoryBudget);
      const currentChanged = JSON.stringify(initialData.current) !== JSON.stringify(categoryCurrent);
      const memoChanged = JSON.stringify(initialData.memo) !== JSON.stringify(categoryMemo);

      console.log("[MoneyBox] 🔄 Change detection:", {
        budgetChanged,
        currentChanged,
        memoChanged,
        hasChanges: budgetChanged || currentChanged || memoChanged
      });
    }
  }, [categoryBudget, categoryCurrent, categoryMemo, initialData]);

  const hasLoadedInitially = useRef(false);

  const getNumber = (v: string) => v.replace(/[^0-9]/g, "");

  const formatNumber = (v: number | string) => {
    if (!v) return "";
    return Number(v).toLocaleString();
  };


  // Firestore에서 데이터 불러오기
  useEffect(() => {
    const loadData = async () => {
      console.log("[MoneyBox] 🔗 Loading money data...");
      try {
        const docRef = doc(db, "moneyData", "main");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as MoneyData;
          console.log("[MoneyBox] 📥 Loaded money data:", data);

          let loadedBudget: string[][];
          let loadedCurrent: string[][];
          let loadedMemo: string[];
          let loadedCumulative: string[];
          const savedCategoryOrder = Array.isArray(data.categoryOrder)
            ? data.categoryOrder
            : LEGACY_CATEGORIES;

          if (data.cumulative) {
            loadedCumulative = data.cumulative;
          } else {
            loadedCumulative = Array(categories.length).fill("");
          }

          if (data.memo) {
            loadedMemo = data.memo;
          } else {
            loadedMemo = Array(categories.length).fill("");
          }

          // users 구조 먼저 처리
          if (data.users) {
            loadedBudget = [
              data.users.yuseop?.budget || Array(categories.length).fill(""),
              data.users.gyeongin?.budget || Array(categories.length).fill(""),
              data.users.aca?.budget || Array(categories.length).fill("")
            ];
            loadedCurrent = [
              data.users.yuseop?.current || Array(categories.length).fill(""),
              data.users.gyeongin?.current || Array(categories.length).fill(""),
              data.users.aca?.current || Array(categories.length).fill("")
            ];
          }
          // 구버전 데이터 호환
          else if (data.categoryBudget && data.categoryCurrent) {
            loadedBudget = [
              data.categoryBudget,
              Array(categories.length).fill(""),
              Array(categories.length).fill("")
            ];
            loadedCurrent = [
              data.categoryCurrent,
              Array(categories.length).fill(""),
              Array(categories.length).fill("")
            ];
          } else {
            // 기본값
            loadedBudget = Array(3).fill(null).map(() => Array(categories.length).fill(""));
            loadedCurrent = Array(3).fill(null).map(() => Array(categories.length).fill(""));
          }

          const loadedSnapshot: MoneySnapshot = {
            budget: remapCategoryRows(loadedBudget, savedCategoryOrder),
            current: remapCategoryRows(loadedCurrent, savedCategoryOrder),
            memo: remapCategoryRow(loadedMemo, savedCategoryOrder),
            cumulative: remapCategoryRow(loadedCumulative, savedCategoryOrder),
          };

          applySnapshot(loadedSnapshot);
          setHistoryState([cloneMoneySnapshot(loadedSnapshot)], 0);

          // 초기 데이터 상태 저장
          setInitialData(cloneMoneySnapshot(loadedSnapshot));
        } else {
          console.log("[MoneyBox] ❗ Document not found → creating with default");
          const defaultBudget = Array(3).fill(null).map(() => Array(categories.length).fill(""));
          const defaultCurrent = Array(3).fill(null).map(() => Array(categories.length).fill(""));
          const defaultMemo = Array(categories.length).fill("");
          const defaultCumulative = Array(categories.length).fill("");

          await setDoc(docRef, {
            users: {
              yuseop: {
                budget: defaultBudget[0],
                current: defaultCurrent[0]
              },
              gyeongin: {
                budget: defaultBudget[1],
                current: defaultCurrent[1]
              },
              aca: {
                budget: defaultBudget[2],
                current: defaultCurrent[2]
              }
            },
            memo: defaultMemo,
            cumulative: defaultCumulative,
            categoryOrder: categories
          }, { merge: true });
          console.log("[MoneyBox] 🟢 Created money data");

          // 초기 데이터 상태 저장
          const defaultSnapshot: MoneySnapshot = {
            budget: defaultBudget,
            current: defaultCurrent,
            memo: defaultMemo,
            cumulative: defaultCumulative,
          };

          applySnapshot(defaultSnapshot);
          setHistoryState([cloneMoneySnapshot(defaultSnapshot)], 0);
          setInitialData(cloneMoneySnapshot(defaultSnapshot));
        }
        hasLoadedInitially.current = true;
      } catch (e) {
        console.error("[MoneyBox] 🔴 Load failed:", e);
        hasLoadedInitially.current = true;
      }
    };

    loadData();
  }, []);

  const handleCategoryInput = (
    userIndex: number,
    categoryIndex: number,
    value: string,
    type: "budget" | "current"
  ) => {
    const num = getNumber(value);

    if (type === "budget") {
      const updated = categoryBudget.map((row) => [...row]);
      updated[userIndex][categoryIndex] = num;
      applyMoneyChange({
        budget: updated,
        current: categoryCurrent,
        memo: categoryMemo,
        cumulative: categoryCumulative,
      });
    } else {
      const updated = categoryCurrent.map((row) => [...row]);
      updated[userIndex][categoryIndex] = num;
      applyMoneyChange({
        budget: categoryBudget,
        current: updated,
        memo: categoryMemo,
        cumulative: categoryCumulative,
      });
    }
  };

  // Firestore에 저장
  const handleSave = async () => {
    console.log("[MoneyBox] 💾 Saving money data...");
    try {
      const docRef = doc(db, "moneyData", "main");
      await setDoc(docRef, {
        users: {
          yuseop: {
            budget: categoryBudget[0] || Array(categories.length).fill(""),
            current: categoryCurrent[0] || Array(categories.length).fill("")
          },
          gyeongin: {
            budget: categoryBudget[1] || Array(categories.length).fill(""),
            current: categoryCurrent[1] || Array(categories.length).fill("")
          },
          aca: {
            budget: categoryBudget[2] || Array(categories.length).fill(""),
            current: categoryCurrent[2] || Array(categories.length).fill("")
          }
        },
        memo: categoryMemo,
        cumulative: categoryCumulative,
        categoryOrder: categories
      }, { merge: true });
      console.log("[MoneyBox] ✅ Save complete");

      // 저장 후 초기 데이터 상태 업데이트
      setInitialData(
        cloneMoneySnapshot({
          budget: categoryBudget,
          current: categoryCurrent,
          memo: categoryMemo,
          cumulative: categoryCumulative,
        })
      );
    } catch (err) {
      console.error("[MoneyBox] ❌ Save failed:", err);
    }
  };

  const categoryGridClass = showUsers
    ? "grid-cols-[minmax(74px,1.3fr)_repeat(5,minmax(64px,1fr))]"
    : "grid-cols-[minmax(74px,1.3fr)_repeat(2,minmax(64px,1fr))]";
  const categoryMinWidthClass = showUsers ? "min-w-[316px]" : "min-w-[160px]";

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
          MONEY
        </h2>
      </div>

      {showList && (
        <div className="mt-2 mb-[80px]">

          <div className="text-sm text-zinc-600 dark:text-zinc-400 rounded space-y-3">

            {/* 카테고리 표 */}
            <div className="show-scrollbar moneybox-scrollbar overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-600 scrollbar-track-transparent">

              <div className={`text-sm w-full ${categoryMinWidthClass}`}>

                <div className={`grid ${categoryGridClass} gap-1.5 font-medium mb-2 text-[12px]`}>
                  <span>카테고리</span>
                  <span className="text-center">{showUsers ? "예산" : "남은금액"}</span>
                  {showUsers && (
                  <span className="text-center">유섭</span>
                )}
                {showUsers && (
                  <span className="text-center">경인</span>
                )}
                {showUsers && (
                  <span className="text-center">아카</span>
                )}
                  <span className="text-center">{showUsers ? "이번달" : "%"}</span>
                </div>

                {categories.map((cat, i) => {
                  const budget = Number(categoryBudget[0][i]) || 0;
                  const yuseopCurrent = Number(categoryCurrent[0][i]) || 0;
                  const gyeonginCurrent = Number(categoryCurrent[1][i]) || 0;
                  const acaCurrent = Number(categoryCurrent[2][i]) || 0;
                  const sum = yuseopCurrent + gyeonginCurrent + acaCurrent;
                  const remaining = budget - sum;
                  const usagePercent = budget > 0 ? Math.round((sum / budget) * 100) : 0;
                  const usageBarPercent = Math.min(usagePercent, 100);

                  const isOver = sum > budget && budget !== 0;

                  return (
                    <div
                      key={cat}
                      className={`grid ${categoryGridClass} gap-1.5 items-center ${isOver ? "bg-red-100 dark:bg-red-900/40" : ""
                        }`}
                    >
                      <span className="text-[12px] xs:text-sm">{cat}</span>

                      {showUsers ? (
                        <input
                          type="text"
                          value={formatNumber(categoryBudget[0][i])}
                          onChange={(e) =>
                            handleCategoryInput(0, i, e.target.value, "budget")
                          }
                          className="text-[12px] xs:text-sm px-1.5 py-1 text-right bg-transparent border-none outline-none select-auto min-w-0"
                        />
                      ) : (
                        <span className={`text-[12px] xs:text-sm px-1.5 py-1 text-right font-medium ${remaining < 0 ? "text-red-500" : ""}`}>
                          {remaining === 0 ? "0" : formatNumber(remaining)}
                        </span>
                      )}

                      {showUsers && (
                      <input
                        type="text"
                        value={formatNumber(categoryCurrent[0][i])}
                        onChange={(e) =>
                          handleCategoryInput(0, i, e.target.value, "current")
                        }
                        className={`text-[12px] xs:text-sm px-1.5 py-1 text-right bg-transparent border border-zinc-300 dark:border-zinc-600 rounded select-auto min-w-0 ${yuseopCurrent > budget && budget !== 0 ? "text-red-500 border-red-400" : ""
                          }`}
                      />
                    )}
                    {showUsers && (
                      <input
                        type="text"
                        value={formatNumber(categoryCurrent[1][i])}
                        onChange={(e) =>
                          handleCategoryInput(1, i, e.target.value, "current")
                        }
                        className={`text-[12px] xs:text-sm px-1.5 py-1 text-right bg-transparent border border-zinc-300 dark:border-zinc-600 rounded select-auto min-w-0 ${gyeonginCurrent > budget && budget !== 0 ? "text-red-500 border-red-400" : ""
                          }`}
                      />
                    )}
                    {showUsers && (
                      <input
                        type="text"
                        value={formatNumber(categoryCurrent[2][i])}
                        onChange={(e) =>
                          handleCategoryInput(2, i, e.target.value, "current")
                        }
                        className={`text-[12px] xs:text-sm px-1.5 py-1 text-right bg-transparent border border-zinc-300 dark:border-zinc-600 rounded select-auto min-w-0 ${acaCurrent > budget && budget !== 0 ? "text-red-500 border-red-400" : ""
                          }`}
                      />
                    )}

                      {showUsers ? (
                        <span
                          title={categoryMemo[i] || ""}
                          onClick={() => {
                            const newMemo = prompt("메모 수정", categoryMemo[i] || "");
                            if (newMemo !== null) {
                              const updated = [...categoryMemo];
                              updated[i] = newMemo;
                              applyMoneyChange({
                                budget: categoryBudget,
                                current: categoryCurrent,
                                memo: updated,
                                cumulative: categoryCumulative,
                              });
                            }
                          }}
                          className={`text-[12px] xs:text-sm text-right font-medium cursor-pointer ${isOver ? "text-red-500" : ""
                            } ${categoryMemo[i] ? "underline decoration-dotted" : ""}`}
                        >
                          {formatNumber(sum)}
                        </span>
                      ) : (
                        <div
                          title={categoryMemo[i] || `${usagePercent}%`}
                          onClick={() => {
                            const newMemo = prompt("메모 수정", categoryMemo[i] || "");
                            if (newMemo !== null) {
                              const updated = [...categoryMemo];
                              updated[i] = newMemo;
                              applyMoneyChange({
                                budget: categoryBudget,
                                current: categoryCurrent,
                                memo: updated,
                                cumulative: categoryCumulative,
                              });
                            }
                          }}
                          className={`relative h-5 cursor-pointer overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800 ${categoryMemo[i] ? "ring-1 ring-zinc-400/60" : ""}`}
                        >
                          <div
                            className={`absolute inset-y-0 left-0 rounded ${isOver ? "bg-red-500" : "bg-blue-500"}`}
                            style={{ width: `${usageBarPercent}%` }}
                          />
                          <span className="relative z-10 flex h-full items-center justify-center text-[10px] font-bold text-zinc-800 dark:text-zinc-100">
                            {usagePercent}%
                          </span>
                        </div>
                      )}

                    </div>
                  );
                })}

              </div>
            </div>

            {/* 저장 버튼 */}
            <div className="pt-3 flex justify-center gap-2">
              <button
                onClick={() => setShowUsers(!showUsers)}
                className="px-3 py-1 text-xs rounded bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 transition"
              >
                자세히
              </button>
              {showUsers && (
                <button
                  onClick={handleSave}
                  className={`px-3 py-1 text-xs rounded transition ${hasChanges
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600"
                    }`}
                >
                  저장
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
