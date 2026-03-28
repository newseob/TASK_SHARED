import { useEffect, useState } from "react";
import TodoTab from "./components/TodoTab.tsx";
import RoutineTab from "./components/RoutineTab.tsx";
import KyunginTab from "./components/KyunginTab.tsx";
import YuseopTab from "./components/YuseopTab.tsx";
import LoginScreen from "./components/LoginScreen.tsx";

type TabId = "todo" | "routine" | "kyungin" | "yuseop";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "todo", label: "\uD560\uC77C" },
  { id: "routine", label: "\uB8E8\uD2F4" },
  { id: "kyungin", label: "\uACBD\uC778" },
  { id: "yuseop", label: "\uC720\uC12D" },
];

function App() {
  const [activeTab, setActiveTab] = useState<TabId>("todo");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(
    () => localStorage.getItem("theme") === "dark"
  );

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

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="flex h-screen flex-col bg-white text-black dark:bg-zinc-900 dark:text-white">
      <div className="flex-1 overflow-auto">
        {activeTab === "todo" && <TodoTab />}
        {activeTab === "routine" && <RoutineTab />}
        {activeTab === "kyungin" && <KyunginTab />}
        {activeTab === "yuseop" && <YuseopTab />}
      </div>

      <div
        className="flex h-10 items-center justify-between border-t px-2 shadow-md
        border-zinc-300 bg-zinc-100 text-gray-800
        dark:border-zinc-700 dark:bg-zinc-800 dark:text-gray-200"
      >
        <div className="flex flex-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-1 font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? "text-blue-600 dark:text-blue-300"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsDarkMode((prev) => !prev)}
          className="ml-2 rounded border border-gray-400 bg-white px-2 py-0.5 text-xs text-black hover:opacity-80 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
        >
          {isDarkMode ? "\u2600\uFE0F" : "\uD83C\uDF19"}
        </button>
      </div>
    </div>
  );
}

export default App;
