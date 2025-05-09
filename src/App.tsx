import { useState } from "react";
import TodoTab from "./components/TodoTab.tsx";
import RoutineTab from "./components/RoutineTab.tsx";
import KyunginTab from "./components/KyunginTab.tsx";
import YuseopTab from "./components/YuseopTab.tsx";


function App() {
  const tabs = ["할일", "루틴", "경인", "유섭"];
  const [activeTab, setActiveTab] = useState("할일");

  return (
    <div className="h-screen flex flex-col">
      {/* 본문 + 탭 위 영역 전체를 스크롤 가능한 영역으로 */}
      <div className="flex-1 overflow-auto">
        {/* 본문 탭들 */}
        {activeTab === "할일" && <TodoTab />}
        {activeTab === "루틴" && <RoutineTab />}
        {activeTab === "경인" && <KyunginTab />}
        {activeTab === "유섭" && <YuseopTab />}
      </div>

      {/* 하단 탭 메뉴 고정 */}
      <div className="h-10 bg-white border-t shadow-md flex z-20">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1 font-semibold transition-all duration-200 ${
              activeTab === tab ? "bg-white text-gray-700" : "bg-gray-100 text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}

export default App;
