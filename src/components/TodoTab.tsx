// TodoTab.tsx
import TodayRoutine from "./Todo/TodayRoutine.tsx";
import TodoBoxSection from "./Todo/TodoBoxSection.tsx";
import CycleRoutine from "./Todo/CycleRoutine.tsx";
import OtherRoutine from "./Todo/OtherRoutine.tsx";
import MoneyBox from "./Todo/MoneyBox.tsx";
import LinkBox from "./Todo/LinkBox.tsx";

export default function TodoTab() {
  return (
    <div className="bg-white text-black dark:bg-zinc-900 dark:text-white overflow-x-hidden">
      <div className="mx-auto w-full max-w-screen-2xl px-4 flex flex-col gap-6">

        {/* 1행 - 루틴 3열 */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <TodayRoutine />
          <CycleRoutine />
          <OtherRoutine />
        </section>

        {/* 2행 - Todo */}
        <section className="w-full">
          <TodoBoxSection />
        </section>

        {/* 3행 - 링크 */}
        <section className="w-full">
          <LinkBox />
        </section>

        {/* 4행 - Money */}
        <section className="w-full">
          <MoneyBox />
        </section>

      </div>
    </div>
  );
}
