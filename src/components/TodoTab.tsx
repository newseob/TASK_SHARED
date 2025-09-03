// TodoTab.tsx
import TodayRoutine from "./Todo/TodayRoutine.tsx";
import TodoBoxSection from "./Todo/TodoBoxSection.tsx";
import HaruRecord from "./Todo/HaruRecord.tsx";

export default function TodoTab() {
  return (
    <div className="bg-white text-black dark:bg-zinc-900 dark:text-white">
      <div className="mx-auto w-full max-w-screen-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 justify-center">
          {/* 각 카드(열) 최대폭 제한 */}
          <section className="w-full max-w-[560px]">
            <TodayRoutine />
          </section>

          <section className="w-full max-w-[560px]">
            <TodoBoxSection />
          </section>

          <section className="w-full max-w-[560px]">
            <HaruRecord />
          </section>
        </div>
      </div>
    </div>
  );
}
