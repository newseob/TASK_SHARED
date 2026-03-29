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
  return (
    <div className="select-none overflow-x-hidden bg-gray-200 text-black dark:bg-black dark:text-white">
      <div className="mx-auto flex w-full max-w-screen-lg flex-col gap-3 px-1 py-1">
        <div className="grid w-full grid-cols-1 xs:grid-cols-2 gap-3">
          <section className="w-full">
            <div className="rounded-lg bg-white p-1 dark:bg-zinc-900">
              <TodoBoxSection />
            </div>
          </section>

          <section className="w-full">
            <div className="rounded-lg bg-white p-1 dark:bg-zinc-900">
              <DietBox />
            </div>
          </section>
        </div>

        <section className="w-full">
          <div className="grid h-full grid-cols-1 xs:grid-cols-2 gap-3 rounded-lg bg-white p-1 dark:bg-zinc-900">
            <TodayRoutine />
            <CycleRoutine />

            <div className="xs:col-span-2">
              <DateReference />
            </div>
          </div>
        </section>

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
      </div>
    </div>
  );
}
