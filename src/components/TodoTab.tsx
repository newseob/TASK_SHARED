"use client";

import TodoBoxSection from "./Todo/TodoBoxSection.tsx";
import CycleRoutine from "./Todo/CycleRoutine.tsx";
import MoneyBox from "./Todo/MoneyBox.tsx";
import DateReference from "./Todo/DateReference.tsx";
import Timetable from "./Todo/Timetable.tsx";

export default function TodoTab() {
  return (
    <div className="select-none overflow-x-hidden bg-gray-200 text-black dark:bg-black dark:text-white">
      <div className="mx-auto flex w-full max-w-screen-lg flex-col gap-3 px-1 pb-2 pt-1">
        <section className="w-full">
          <div className="rounded-lg bg-white p-1 dark:bg-zinc-900">
            <TodoBoxSection />
          </div>
        </section>

        <section className="w-full">
          <div className="rounded-lg bg-white p-1 dark:bg-zinc-900">
            <Timetable />
          </div>
        </section>

        <section className="w-full">
          <div className="grid h-full grid-cols-1 gap-4 rounded-lg bg-white p-1 md:grid-cols-2 dark:bg-zinc-900">
            <CycleRoutine />

            <div>
              <DateReference />
            </div>
          </div>
        </section>

        <section className="w-full">
          <div className="rounded-lg bg-white p-1 dark:bg-zinc-900">
            <MoneyBox />
          </div>
        </section>
      </div>
    </div>
  );
}
