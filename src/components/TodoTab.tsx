// TodoTab.tsx
import TodayRoutine from "./Todo/TodayRoutine.tsx";
import TodoBoxSection from "./Todo/TodoBoxSection.tsx";
import CycleRoutine from "./Todo/CycleRoutine.tsx";
import OtherRoutine from "./Todo/OtherRoutine.tsx";
import MoneyBox from "./Todo/MoneyBox.tsx";

export default function TodoTab() {
  return (
    <div className="bg-white text-black dark:bg-zinc-900 dark:text-white overflow-x-hidden">
      <div className="mx-auto w-full max-w-screen-2xl px-4">
        {/* 499px 이하: 1열, 500px 이상: 2열 */}
        <div className="flex flex-col sm:flex-row justify-center gap-6 min-w-0">
          {/* 1열일 때 가운데 정렬, 2열일 때 왼쪽 열 */}
          <div className="flex flex-col items-center sm:items-start gap-6 w-full max-w-[500px] min-w-0 break-words [overflow-wrap:anywhere]">
            <TodayRoutine />
            <CycleRoutine />
            <OtherRoutine />
            {/* 1열일 때만 TodoBoxSection 표시 */}
            <section className="sm:hidden w-full max-w-[500px] min-w-0 break-words [overflow-wrap:anywhere]">
              <TodoBoxSection />
            </section>
          </div>
          
          {/* 오른쪽 열 (2열일 때만 표시) */}
          <section className="hidden sm:block w-full max-w-[500px] min-w-0 break-words [overflow-wrap:anywhere]">
            <TodoBoxSection />
          </section>
        </div>
        
        {/* MONEY 항목 - 전체 너비 차지 */}
        <div className="w-full max-w-screen-2xl px-4 mt-6">
          <MoneyBox />
        </div>
      </div>
    </div>
  );
}

