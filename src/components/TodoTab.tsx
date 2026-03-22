"use client";

import { useState, useEffect } from "react";
import TodayRoutine from "./Todo/TodayRoutine.tsx";
import TodoBoxSection from "./Todo/TodoBoxSection.tsx";
import CycleRoutine from "./Todo/CycleRoutine.tsx";
import MoneyBox from "./Todo/MoneyBox.tsx";
import LinkBox from "./Todo/LinkBox.tsx";
import DateReference from "./Todo/DateReference.tsx";

type BoxKey = "todo" | "routine" | "link";

const STORAGE_KEY = "todoTabOrder";

export default function TodoTab() {
  const defaultOrder: BoxKey[] = ["todo", "routine", "link"];

  // 🔥 localStorage에서 초기값 읽기
  const [order, setOrder] = useState<BoxKey[]>(() => {
    if (typeof window === "undefined") return defaultOrder;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }

    return defaultOrder;
  });

  const [isEditMode, setIsEditMode] = useState(false);

  // 🔥 order 변경될 때 저장
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  }, [order]);

  // 🔥 박스 이동 함수
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return;

    const newOrder = [...order];
    const [removed] = newOrder.splice(from, 1);
    newOrder.splice(to, 0, removed);

    setOrder(newOrder);
  };

  // 🔥 박스 렌더링
  const renderBox = (key: BoxKey) => {
    switch (key) {
      case "todo":
        return (
          <section className="w-full">
            <div className="bg-white dark:bg-zinc-900 rounded-lg p-1">
              <TodoBoxSection />
            </div>
          </section>
        );

      case "routine":
        return (
          <section className="w-full">
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-1 gap-3 bg-white dark:bg-zinc-900 rounded-lg p-1 h-full">
              <TodayRoutine />
              <CycleRoutine />

              <div className="xs:col-span-2 md:col-span-1">
                <DateReference />
              </div>
            </div>
          </section>
        );

      case "link":
        return (
          <section className="w-full">
            <div className="bg-white dark:bg-zinc-900 rounded-lg p-1">
              <LinkBox />
            </div>
          </section>
        );
    }
  };

  return (
    <div className="bg-gray-200 text-black dark:bg-black dark:text-white overflow-x-hidden select-none">
      <div className="mx-auto w-full max-w-screen-lg px-1 flex flex-col gap-3 py-1">
  
        {/* 🔥 3개 박스 (순서 변경됨) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
          {order.map((key) => (
            <div key={key}>
              {renderBox(key)}
            </div>
          ))}
        </div>

        {/* 💰 MoneyBox (항상 고정) */}
        <section className="w-full">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-1">
            <MoneyBox />
          </div>
        </section>

        {/* 🔽 순서 설정 버튼 */}
        <div className="flex justify-center">
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className="px-4 py-2 text-black dark:text-white rounded-lg"
          >
            {isEditMode ? "설정 닫기" : "순서 설정"}
          </button>
        </div>

        {/* 🔧 순서 관리 패널 */}
        {isEditMode && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-3 flex flex-col gap-2">

            {order.map((key, index) => (
              <div
                key={key}
                className="flex justify-between items-center bg-gray-100 dark:bg-zinc-800 p-2 rounded"
              >
                <span>
                  {key === "todo" && "Todo"}
                  {key === "routine" && "루틴"}
                  {key === "link" && "링크"}
                </span>

                <div className="flex gap-2">
                  <button
                    onClick={() => move(index, index - 1)}
                    disabled={index === 0}
                    className="px-2 py-1 bg-gray-300 dark:bg-zinc-700 rounded disabled:opacity-30"
                  >
                    ▲
                  </button>

                  <button
                    onClick={() => move(index, index + 1)}
                    disabled={index === order.length - 1}
                    className="px-2 py-1 bg-gray-300 dark:bg-zinc-700 rounded disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>
              </div>
            ))}

          </div>
        )}

      </div>
    </div>
  );
}