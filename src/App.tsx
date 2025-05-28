import { useState, useEffect } from "react";
import TodoTab from "./components/TodoTab.tsx";
import RoutineTab from "./components/RoutineTab.tsx";
import KyunginTab from "./components/KyunginTab.tsx";
import YuseopTab from "./components/YuseopTab.tsx";

function App() {
  const tabs = ["할일", "루틴", "경인", "유섭"];
  const [activeTab, setActiveTab] = useState("할일");

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") return true;
    if (savedTheme === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  return (
    <div className="h-screen flex flex-col bg-white text-black dark:bg-zinc-900 dark:text-white">
      {/* 메인 콘텐츠 */}
      <div className="flex-1 overflow-auto">
        {activeTab === "할일" && <TodoTab />}
        {activeTab === "루틴" && <RoutineTab />}
        {activeTab === "경인" && <KyunginTab />}
        {activeTab === "유섭" && <YuseopTab />}
      </div>

      {/* 하단 탭 + 모드 토글 */}
      <div className="h-10 flex items-center justify-between px-2 border-t shadow-md 
        bg-zinc-100 border-zinc-300 text-gray-800 
        dark:bg-zinc-800 dark:border-zinc-700 dark:text-gray-200">

        <div className="flex flex-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1 font-semibold transition-all duration-200 
                ${activeTab === tab
                  ? "text-blue-600 dark:text-blue-300"
                  : "text-gray-500 dark:text-gray-400"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsDarkMode((prev) => !prev)}
          className="ml-2 px-2 py-0.5 text-xs rounded border 
            border-gray-400 dark:border-zinc-600 
            bg-white dark:bg-zinc-700 
            text-black dark:text-white hover:opacity-80"
        >
          {isDarkMode ? "🌙" : "☀️"}
        </button>
      </div>
    </div>
  );
}

export default App;