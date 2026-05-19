"use client";

import { useEffect, useState } from "react";
import TodayRoutine from "./Todo/TodayRoutine.tsx";
import TodoBoxSection from "./Todo/TodoBoxSection.tsx";
import CycleRoutine from "./Todo/CycleRoutine.tsx";
import MoneyBox from "./Todo/MoneyBox.tsx";
import LinkBox from "./Todo/LinkBox.tsx";
import DateReference from "./Todo/DateReference.tsx";
import Timetable from "./Todo/Timetable.tsx";

type TodoSectionId = "todo" | "routine" | "money" | "link" | "timetable";

const TODO_SECTIONS: Array<{ id: TodoSectionId; label: string }> = [
  { id: "timetable", label: "🗓️" },
  { id: "todo", label: "✅" },
  { id: "routine", label: "🔁" },
  { id: "money", label: "💰" },
  { id: "link", label: "🔗" },
];

export default function TodoTab() {
  const [activeSection, setActiveSection] = useState<TodoSectionId>(() => {
    const saved = localStorage.getItem("todoTab_activeSection");
    return TODO_SECTIONS.some((section) => section.id === saved)
      ? (saved as TodoSectionId)
      : "timetable";
  });

  useEffect(() => {
    localStorage.setItem("todoTab_activeSection", activeSection);
  }, [activeSection]);

  return (
    <div className="select-none overflow-x-hidden bg-gray-200 text-black dark:bg-black dark:text-white">
      <div className="fixed left-0 right-0 top-0 z-30 border-b border-zinc-300 bg-gray-200 px-1 py-1 dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto grid w-full max-w-screen-lg grid-cols-5 gap-1 rounded-md bg-white p-1 shadow-sm dark:bg-zinc-900">
          {TODO_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`h-8 rounded text-xs font-semibold transition ${
                activeSection === section.id
                  ? "bg-blue-600 text-white dark:bg-blue-500"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-screen-lg flex-col gap-3 px-1 pb-2 pt-12">
        {activeSection === "todo" && (
          <section className="w-full">
            <div className="rounded-lg bg-white p-1 dark:bg-zinc-900">
              <TodoBoxSection />
            </div>
          </section>
        )}

        {activeSection === "routine" && (
          <section className="w-full">
            <div className="grid h-full grid-cols-1 gap-4 rounded-lg bg-white p-1 xs:grid-cols-2 md:grid-cols-3 dark:bg-zinc-900">
              <TodayRoutine />
              <CycleRoutine />

              <div className="xs:col-span-2 md:col-span-1">
                <DateReference />
              </div>
            </div>
          </section>
        )}

        {activeSection === "money" && (
          <section className="w-full">
            <div className="rounded-lg bg-white p-1 dark:bg-zinc-900">
              <MoneyBox />
            </div>
          </section>
        )}

        {activeSection === "link" && (
          <section className="w-full">
            <div className="rounded-lg bg-white p-1 dark:bg-zinc-900">
              <LinkBox />
            </div>
          </section>
        )}

        {activeSection === "timetable" && (
          <section className="w-full">
            <Timetable />
          </section>
        )}
      </div>
    </div>
  );
}
