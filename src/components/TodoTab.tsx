"use client";

import TodoBoxSection from "./Todo/TodoBoxSection.tsx";
import CycleRoutine from "./Todo/CycleRoutine.tsx";
import MoneyBox from "./Todo/MoneyBox.tsx";
import DateReference from "./Todo/DateReference.tsx";
import Timetable from "./Todo/Timetable.tsx";
import PlanBox from "./Todo/PlanBox.tsx";

export default function TodoTab() {
  return (
    <div className="select-none overflow-x-hidden bg-gray-200 text-black dark:bg-black dark:text-white">
      <div className="mx-auto flex w-full max-w-screen-lg flex-col gap-3 px-1 pb-2 pt-1">
        <section className="w-full">
          <div className="rounded-lg bg-white p-1 dark:bg-zinc-900">
            <TodoBoxSection />
          </div>
        </section>

        <div className="grid w-full grid-cols-1 gap-3 xs:grid-cols-2">
          <section className="w-full min-w-0">
            <div className="h-full rounded-lg bg-white p-1 dark:bg-zinc-900">
              <Timetable />
            </div>
          </section>

          <section className="w-full min-w-0">
            <div className="grid h-full grid-cols-1 gap-3 rounded-lg bg-white p-1 dark:bg-zinc-900">
              <CycleRoutine />

              <div>
                <DateReference />
              </div>
            </div>
          </section>
        </div>

        <section className="w-full">
          <div className="rounded-lg bg-white p-1 dark:bg-zinc-900">
            <PlanBox />
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
