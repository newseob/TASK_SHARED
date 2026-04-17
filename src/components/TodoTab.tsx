"use client";

import TodayRoutine from "./Todo/TodayRoutine.tsx";
import TodoBoxSection from "./Todo/TodoBoxSection.tsx";
import CycleRoutine from "./Todo/CycleRoutine.tsx";
import MoneyBox from "./Todo/MoneyBox.tsx";
import LinkBox from "./Todo/LinkBox.tsx";
import DateReference from "./Todo/DateReference.tsx";

export default function TodoTab() {
  return (
    <div className="select-none overflow-x-hidden bg-gray-200 text-black dark:bg-black dark:text-white">
      <div className="mx-auto flex w-full max-w-screen-lg flex-col gap-3 px-1 py-1">
        <section className="w-full">
          <div className="rounded-lg bg-white p-1 dark:bg-zinc-900">
            <TodoBoxSection />
          </div>
        </section>

        <section className="w-full">
          <div className="grid h-full grid-cols-1 gap-4 rounded-lg bg-white p-1 xs:grid-cols-2 md:grid-cols-3 dark:bg-zinc-900">
            <TodayRoutine />
            <CycleRoutine />

            <div className="xs:col-span-2 md:col-span-1">
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
