// MoneyBox.tsx

import { useState, useEffect, useRef } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";

interface MoneyData {
  categoryBudget: string[];
  categoryCurrent: string[];
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

  const categories = [
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

  // 초기 데이터 상태 저장 (변경 감지용)
  const [initialData, setInitialData] = useState<{
    budget: string[][];
    current: string[][];
    memo: string[];
    cumulative: string[];
  } | null>(null);

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

          if (data.cumulative) {
            loadedCumulative = data.cumulative;
          } else {
            loadedCumulative = Array(categories.length).fill("");
          }

          setCategoryCumulative(loadedCumulative);

          if (data.memo) {
            setCategoryMemo(data.memo);
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

          setCategoryBudget(loadedBudget);
          setCategoryCurrent(loadedCurrent);

          // 초기 데이터 상태 저장
          setInitialData({
            budget: loadedBudget,
            current: loadedCurrent,
            memo: loadedMemo,
            cumulative: loadedCumulative
          });
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
            cumulative: defaultCumulative
          }, { merge: true });
          console.log("[MoneyBox] 🟢 Created money data");

          // 초기 데이터 상태 저장
          setInitialData({
            budget: defaultBudget,
            current: defaultCurrent,
            memo: defaultMemo,
            cumulative: defaultCumulative
          });
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
      setCategoryBudget(updated);
    } else {
      const updated = categoryCurrent.map((row) => [...row]);
      updated[userIndex][categoryIndex] = num;
      setCategoryCurrent(updated);
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
        cumulative: categoryCumulative
      }, { merge: true });
      console.log("[MoneyBox] ✅ Save complete");

      // 저장 후 초기 데이터 상태 업데이트
      setInitialData({
        budget: categoryBudget,
        current: categoryCurrent,
        memo: categoryMemo,
        cumulative: categoryCumulative
      });
    } catch (err) {
      console.error("[MoneyBox] ❌ Save failed:", err);
    }
  };

  const totalBudget = categoryBudget[0].reduce(
    (sum, v) => sum + (Number(v) || 0),
    0
  );

  const totalExpense = categories.reduce((sum, _, i) => {
    const yuseop = Number(categoryCurrent[0][i]) || 0;
    const gyeongin = Number(categoryCurrent[1][i]) || 0;
    const aca = Number(categoryCurrent[2][i]) || 0;

    return sum + yuseop + gyeongin + aca;
  }, 0);

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

            {/* 통계 */}
            <div className="grid grid-cols-2 gap-2 text-base">

              {/* 1행 */}
              <div className="flex justify-between border border-zinc-200 dark:border-zinc-700 rounded p-2">
                <span className="font-medium">총예산</span>
                <span className="font-semibold">{formatNumber(totalBudget)}</span>
              </div>

              <div className="flex justify-between border border-zinc-200 dark:border-zinc-700 rounded p-2">
                <span className="font-medium">지출</span>
                <span className="font-semibold">{formatNumber(totalExpense)}</span>
              </div>
            </div>

            {/* 카테고리 표 */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-600 scrollbar-track-transparent">

              <div className="text-base min-w-[480px] w-full">

                <div className={`grid ${showUsers ? 'grid-cols-7' : 'grid-cols-4'} text- font-medium mb-2`}>
                  <span>카테고리</span>
                  <span className="text-center">예산</span>
                  {showUsers && (
                  <span className="text-center">유섭</span>
                )}
                {showUsers && (
                  <span className="text-center">경인</span>
                )}
                {showUsers && (
                  <span className="text-center">아카</span>
                )}
                  <span className="text-center">이번달</span>
                  <span className="text-center opacity-50">올해누적</span>
                </div>

                {categories.map((cat, i) => {
                  const budget = Number(categoryBudget[0][i]) || 0;
                  const yuseopCurrent = Number(categoryCurrent[0][i]) || 0;
                  const gyeonginCurrent = Number(categoryCurrent[1][i]) || 0;
                  const acaCurrent = Number(categoryCurrent[2][i]) || 0;
                  const sum = yuseopCurrent + gyeonginCurrent + acaCurrent;

                  const isOver = sum > budget && budget !== 0;

                  return (
                    <div
                      key={cat}
                      className={`grid ${showUsers ? 'grid-cols-7' : 'grid-cols-4'} gap-2 items-center ${isOver ? "bg-red-100 dark:bg-red-900/40" : ""
                        }`}
                    >
                      <span className="text-base">{cat}</span>

                      <input
                        type="text"
                        value={formatNumber(categoryBudget[0][i])}
                        onChange={(e) =>
                          handleCategoryInput(0, i, e.target.value, "budget")
                        }
                        className="text-base px-2 py-1 text-right bg-transparent border-none outline-none select-auto"
                      />

                      {showUsers && (
                      <input
                        type="text"
                        value={formatNumber(categoryCurrent[0][i])}
                        onChange={(e) =>
                          handleCategoryInput(0, i, e.target.value, "current")
                        }
                        className={`text-base px-2 py-1 text-right bg-transparent border border-zinc-300 dark:border-zinc-600 rounded select-auto ${yuseopCurrent > budget && budget !== 0 ? "text-red-500 border-red-400" : ""
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
                        className={`text-base px-2 py-1 text-right bg-transparent border border-zinc-300 dark:border-zinc-600 rounded select-auto ${gyeonginCurrent > budget && budget !== 0 ? "text-red-500 border-red-400" : ""
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
                        className={`text-base px-2 py-1 text-right bg-transparent border border-zinc-300 dark:border-zinc-600 rounded select-auto ${acaCurrent > budget && budget !== 0 ? "text-red-500 border-red-400" : ""
                          }`}
                      />
                    )}

                      <span
                        title={categoryMemo[i] || ""}
                        onClick={() => {
                          const newMemo = prompt("메모 수정", categoryMemo[i] || "");
                          if (newMemo !== null) {
                            const updated = [...categoryMemo];
                            updated[i] = newMemo;
                            setCategoryMemo(updated);
                          }
                        }}
                        className={`text-base text-right font-medium cursor-pointer ${isOver ? "text-red-500" : ""
                          } ${categoryMemo[i] ? "underline decoration-dotted" : ""}`}
                      >
                        {formatNumber(sum)}
                      </span>

                      <input
                        type="text"
                        value={
                          categoryCumulative[i]
                            ? Number(categoryCumulative[i]).toLocaleString()
                            : ""
                        }
                        onChange={(e) => {
                          let value = e.target.value;

                          // 숫자만 허용
                          value = value.replace(/[^0-9-]/g, "");

                          // -는 맨 앞에만 허용
                          if (value.indexOf("-") > 0) {
                            value = value.replace(/-/g, "");
                          }

                          const updated = [...categoryCumulative];
                          updated[i] = value;
                          setCategoryCumulative(updated);
                        }}
                        className={`text-base px-2 py-1 text-right bg-transparent border-none outline-none select-auto opacity-50 ${Number(categoryCumulative[i]) < 0 ? "text-red-500" : ""
                          }`}
                      />
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
                편집
              </button>
              <button
                onClick={handleSave}
                className={`px-3 py-1 text-xs rounded transition ${hasChanges
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600"
                  }`}
              >
                저장
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}