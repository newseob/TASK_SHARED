import { useState } from "react";
import TodoTab from "./components/TodoTab.tsx";
import RoutineTab from "./components/RoutineTab.tsx";
import KyunginTab from "./components/KyunginTab.tsx";
import YuseopTab from "./components/YuseopTab.tsx";

function App() {
  const tabs = ["할일", "루틴", "경인", "유섭"];
  const [activeTab, setActiveTab] = useState("할일");

  return (
    <div className="min-h-screen bg-transparent pt-4 pb-16 font-sans ">
      {" "}
      {/* 아래 여백 확보 */}
      {/* 본문 영역 */}
      <div style={{ height: "calc(100dvh - 64px)" }} className="mx-2 pb-20 overflow-auto">
        {activeTab === "할일" && <TodoTab />}
        {activeTab === "루틴" && <RoutineTab />}
        {activeTab === "경인" && <KyunginTab />}
        {activeTab === "유섭" && <YuseopTab />}
      </div>
      {/* 하단 탭 메뉴 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-md flex z-20 h-16">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1 font-semibold transition-all duration-200 ${activeTab === tab
                ? "bg-white text-gray-700"
                : "bg-gray-100 text-gray-700"
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
