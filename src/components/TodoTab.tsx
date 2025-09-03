// TodoTab.tsx
import TodayRoutine from "./Todo/TodayRoutine.tsx";
import TodoBoxSection from "./Todo/TodoBoxSection.tsx";
import HaruRecord from "./Todo/HaruRecord.tsx";

export default function TodoTab() {
  return (
    <div className="bg-white text-black dark:bg-zinc-900 dark:text-white overflow-x-hidden">
      <div className="mx-auto w-full max-w-screen-2xl px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-center min-w-0">
          <section className="w-full max-w-[560px] min-w-0 break-words [overflow-wrap:anywhere]">
            <TodayRoutine />
          </section>
          <section className="w-full max-w-[560px] min-w-0 break-words [overflow-wrap:anywhere]">
            <TodoBoxSection />
          </section>
          <section className="w-full max-w-[560px] min-w-0 break-words [overflow-wrap:anywhere]">
            <HaruRecord />
          </section>
        </div>
      </div>
    </div>
  );
}

