// TodoTab.tsx
import TodayRoutine from "./Todo/TodayRoutine.tsx";
import TodoBoxSection from "./Todo/TodoBoxSection.tsx";
import CycleRoutine from "./Todo/CycleRoutine.tsx";
import OtherRoutine from "./Todo/OtherRoutine.tsx";

export default function TodoTab() {
  return (
    <div className="bg-white text-black dark:bg-zinc-900 dark:text-white overflow-x-hidden">
      <div className="mx-auto w-full max-w-screen-2xl px-4">
        {/* 499px 이하: 1열, 500px 이상: 2열 */}
        <div className="flex flex-col sm:flex-row justify-center gap-6 min-w-0">
          {/* 왼쪽 열 */}
          <div className="flex flex-col gap-6 w-full max-w-[400px] min-w-0 break-words [overflow-wrap:anywhere]">
            <TodayRoutine />
            <CycleRoutine />
            <OtherRoutine />
          </div>
          
          {/* 오른쪽 열 */}
          <section className="w-full max-w-[400px] min-w-0 break-words [overflow-wrap:anywhere]">
            <TodoBoxSection />
          </section>
        </div>
      </div>
    </div>
  );
}

