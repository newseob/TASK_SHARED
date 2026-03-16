// TodoTab.tsx
import TodayRoutine from "./Todo/TodayRoutine.tsx";
import TodoBoxSection from "./Todo/TodoBoxSection.tsx";
import CycleRoutine from "./Todo/CycleRoutine.tsx";
import MoneyBox from "./Todo/MoneyBox.tsx";
import LinkBox from "./Todo/LinkBox.tsx";

export default function TodoTab() {
  return (
    <div className="bg-gray-200 text-black dark:bg-black dark:text-white overflow-x-hidden select-none">
      <div className="mx-auto w-full max-w-screen-2xl px-1 flex flex-col gap-2 py-2">

        {/* 1행 - 루틴 3열 */}
        <section className="w-full">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-1">
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
              <TodayRoutine />
              <CycleRoutine />
            </div>
          </div>
        </section>

        {/* 2행 - Todo */}
        <section className="w-full">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-1">
            <TodoBoxSection />
          </div>
        </section>

        {/* 3행 - 링크 */}
        <section className="w-full">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-1">
            <LinkBox />
          </div>
        </section>

        {/* 4행 - Money */}
        <section className="w-full">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-1">
            <MoneyBox />
          </div>
        </section>
      </div>
    </div>
  );
}
