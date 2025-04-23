import TodoBoxSection from "./Todo/TodoBoxSection.tsx";
import TodayRoutine from "./Todo/TodayRoutine.tsx";


export default function TodoTab() {
  return (
    <div className="space-y-6">
      <TodayRoutine />
      <TodoBoxSection />
    </div>
  );
}
