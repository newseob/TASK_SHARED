// src/components/Dashboard.tsx
import TodoBoxSection from "./TodoBoxSection";
import TodayRoutine from "./TodayRoutine";
import { useFirestoreHistory } from "../hooks/useFirestoreHistory";
import type { TodoBox } from "./TodoBoxSection";
import type { RoutineItem } from "./TodayRoutine";

export default function Dashboard() {
  // todoBoxes 로드·저장·undo 관리
  const [todoBoxes, setTodoBoxes] = useFirestoreHistory<TodoBox>(
    "todoBoxes",
    "config",
    [{ id: "", title: "기본 박스", items: [], mode: "default" }]
  );

  // routineItems 로드·저장·undo 관리
  const [routineItems, setRoutineItems] = useFirestoreHistory<RoutineItem>(
    "routineItems",
    "config",
    []
  );

  return (
    <div className="space-y-8 p-4">
      <TodoBoxSection
        todoBoxes={todoBoxes}
        setTodoBoxes={setTodoBoxes}
      />
      <TodayRoutine
        items={routineItems}
        setItems={setRoutineItems}
      />
    </div>
  );
}
