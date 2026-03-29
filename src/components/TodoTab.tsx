"use client";

import { useEffect, useState } from "react";
import TodayRoutine from "./Todo/TodayRoutine.tsx";
import TodoBoxSection from "./Todo/TodoBoxSection.tsx";
import CycleRoutine from "./Todo/CycleRoutine.tsx";
import MoneyBox from "./Todo/MoneyBox.tsx";
import LinkBox from "./Todo/LinkBox.tsx";
import DietBox from "./Todo/DietBox.tsx";
import DateReference from "./Todo/DateReference.tsx";

type BoxKey = "todo" | "routine" | "diet";

const STORAGE_KEY = "todoTabOrder";
const DEFAULT_ORDER: BoxKey[] = ["todo", "routine", "diet"];

function normalizeOrder(value: unknown): BoxKey[] {
  if (!Array.isArray(value)) {
    return DEFAULT_ORDER;
  }

  const mapped = value
    .map((item) => (item === "link" ? "diet" : item))
    .filter(
      (item): item is BoxKey =>
        item === "todo" || item === "routine" || item === "diet"
    );

  const unique = mapped.filter((item, index) => mapped.indexOf(item) === index);

  if (unique.length !== DEFAULT_ORDER.length) {
    return DEFAULT_ORDER;
  }

  return unique;
}

export default function TodoTab() {
  const [order, setOrder] = useState<BoxKey[]>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_ORDER;
    }

    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return DEFAULT_ORDER;
    }

    try {
      return normalizeOrder(JSON.parse(saved));
    } catch {
      return DEFAULT_ORDER;
    }
  });

  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  }, [order]);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length) {
      return;
    }

    const nextOrder = [...order];
    const [removed] = nextOrder.splice(from, 1);
    nextOrder.splice(to, 0, removed);
    setOrder(nextOrder);
  };

  const renderBox = (key: BoxKey) => {
    switch (key) {
      case "todo":
        return (
          <section className="w-full">
            <div className="rounded-lg bg-white p-1 dark:bg-zinc-900">
              <TodoBoxSection />
            </div>
          </section>
        );

      case "routine":
        return (
          <section className="w-full">
            <div className="grid h-full grid-cols-1 gap-3 rounded-lg bg-white p-1 dark:bg-zinc-900 xs:grid-cols-2 md:grid-cols-1">
              <TodayRoutine />
              <CycleRoutine />

              <div className="xs:col-span-2 md:col-span-1">
                <DateReference />
              </div>
            </div>
          </section>
        );

      case "diet":
        return (
          <section className="w-full">
            <div className="rounded-lg bg-white p-1 dark:bg-zinc-900">
              <DietBox />
            </div>
          </section>
        );
    }
  };

  return (
    <div className="select-none overflow-x-hidden bg-gray-200 text-black dark:bg-black dark:text-white">
      <div className="mx-auto flex w-full max-w-screen-lg flex-col gap-3 px-1 py-1">
        <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-3">
          {order.map((key) => (
            <div key={key}>{renderBox(key)}</div>
          ))}
        </div>

        <section className="w-full">
          <div className="rounded-lg bg-white p-1 dark:bg-zinc-900">
            <MoneyBox />
          </div>
        </section>

        <section className="w-full">
          <div className="rounded-lg bg-white p-1 dark:bg-zinc-900">
            <LinkBox />
          </div>
        </section>

        <div className="flex justify-center">
          <button
            onClick={() => setIsEditMode((prev) => !prev)}
            className="rounded-lg px-4 py-2 text-black dark:text-white"
          >
            {isEditMode ? "\uC21C\uC11C \uB2EB\uAE30" : "\uC21C\uC11C \uC218\uC815"}
          </button>
        </div>

        {isEditMode && (
          <div className="flex flex-col gap-2 rounded-lg bg-white p-3 dark:bg-zinc-900">
            {order.map((key, index) => (
              <div
                key={key}
                className="flex items-center justify-between rounded bg-gray-100 p-2 dark:bg-zinc-800"
              >
                <span>
                  {key === "todo" && "\uD560\uC77C"}
                  {key === "routine" && "\uB8E8\uD2F4"}
                  {key === "diet" && "\uBA54\uBAA8"}
                </span>

                <div className="flex gap-2">
                  <button
                    onClick={() => move(index, index - 1)}
                    disabled={index === 0}
                    className="rounded bg-gray-300 px-2 py-1 disabled:opacity-30 dark:bg-zinc-700"
                  >
                    {"\uC704"}
                  </button>

                  <button
                    onClick={() => move(index, index + 1)}
                    disabled={index === order.length - 1}
                    className="rounded bg-gray-300 px-2 py-1 disabled:opacity-30 dark:bg-zinc-700"
                  >
                    {"\uC544\uB798"}
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
