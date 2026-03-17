// TodoTab.tsx
import TodayRoutine from "./Todo/TodayRoutine.tsx";
import TodoBoxSection from "./Todo/TodoBoxSection.tsx";
import CycleRoutine from "./Todo/CycleRoutine.tsx";
import MoneyBox from "./Todo/MoneyBox.tsx";
import LinkBox from "./Todo/LinkBox.tsx";
import DateReference from "./Todo/DateReference.tsx";

export default function TodoTab() {
  return (
    <div className="bg-gray-200 text-black dark:bg-black dark:text-white overflow-x-hidden select-none">
      <div className="mx-auto w-full max-w-screen-lg px-0 py-4 grid gap-2 grid-cols-1 xs:grid-cols-3">


        {/* 루틴 */}
        <section className="w-full">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-1">
            <div className="grid gap-3">
              <TodayRoutine />
              <DateReference />
              <CycleRoutine />
            </div>
          </div>
        </section>

        {/* Todo */}
        <section className="w-full">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-1">
            <div className="grid gap-3">
              <TodoBoxSection />
            </div>
          </div>
        </section>

        {/* 링크 */}
        <section className="w-full">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-1">
            <LinkBox />
          </div>
        </section>

        {/* Money */}
        <section className="w-full col-span-3">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-1">
            <MoneyBox />
          </div>
        </section>
      </div>
    </div>
  );
}