import TodoBoxSection from "./Todo/TodoBoxSection.tsx";
import TodayRoutine from "./Todo/TodayRoutine.tsx";

export default function TodoTab() {
  return (
    <div className="space-y-6 bg-white text-black dark:bg-zinc-900 dark:text-white">
      <TodayRoutine />
      <TodoBoxSection />
    </div>
  );
}
