import { useState, useEffect, useRef } from "react";
import { db } from "../../firebase";
import { doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";

interface QuestItem {
  id: string;
  name: string;
  cycle: number;
  lastChecked: string;
  origLastChecked?: string;
  origRecordedAt?: string;
  importanceValue?: number;
}

function getReferenceDate(date: Date): Date {
  const d = new Date(date);
  if (d.getHours() < 6) d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function calculateRemainingDays(cycle: number, lastChecked: string): number {
  const last = new Date(lastChecked);
  const todayRef = getReferenceDate(new Date()).getTime();
  const lastRef = getReferenceDate(last).getTime();
  const diffDays = Math.floor((todayRef - lastRef) / (1000 * 60 * 60 * 24));
  return cycle - diffDays;
}

export default function TodayRoutineSection() {
  const [routineItems, setRoutineItems] = useState<QuestItem[]>([]);
  const [collapsedRoutine, setCollapsedRoutine] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pickerDate, setPickerDate] = useState<string>("");
  const [pickerPosition, setPickerPosition] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const refDoc = doc(db, "routineItems", "config");

  useEffect(() => {
    const unsubscribe = onSnapshot(refDoc, (snap) => {
      const items = (snap.data()?.items as QuestItem[]) || [];
      const filtered = items
        .filter((it) => it.cycle !== 0)
        .filter((it) => {
          const refDate = it.origLastChecked || it.lastChecked;
          return calculateRemainingDays(it.cycle, refDate) <= 3;
        });
      setRoutineItems(filtered);
    });

    let timer: NodeJS.Timeout;
    const scheduleNext6am = () => {
      const now = new Date();
      const next6 = new Date(now);
      next6.setHours(6, 0, 0, 0);
      if (now.getTime() >= next6.getTime()) next6.setDate(next6.getDate() + 1);
      const ms = next6.getTime() - now.getTime();
      timer = setTimeout(() => {
        setRoutineItems((prev) => [...prev]);
        scheduleNext6am();
      }, ms);
    };
    scheduleNext6am();

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const openDatePicker = (
    item: QuestItem,
    e: React.MouseEvent<HTMLLIElement, MouseEvent>
  ) => {
    const base = item.origLastChecked || item.lastChecked;
    const iso = new Date(base).toISOString().substring(0, 10);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPickerDate(iso);
    setPickerPosition({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
    setEditingId(item.id);
  };

  useEffect(() => {
    if (!editingId) return;
    const handleClickOutside = (e: MouseEvent) => {
      const el = inputRefs.current[editingId];
      if (el && !el.contains(e.target as Node)) {
        setEditingId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editingId]);

  const handleDateChange = async (newDate: string) => {
    if (!editingId) return;
    const snap = await getDoc(refDoc);
    const items = (snap.data()?.items as QuestItem[]) || [];
    const updated = items.map((it) =>
      it.id === editingId
        ? { ...it, lastChecked: new Date(newDate).toISOString() }
        : it
    );
    await updateDoc(refDoc, { items: updated });
    setEditingId(null);
  };

  const renderItems = (items: QuestItem[]) => (
    <ul className="space-y-2">
      {items.map((item) => {
        const remain = calculateRemainingDays(item.cycle, item.lastChecked);
        const isToday = remain === 0;
        const isOverdue = remain <= -2;
        let bg = "bg-white";
        let color = "text-black";
        let label = "";
        if (isToday) {
          bg = "bg-green-100";
          color = "text-green-600";
        } else if (isOverdue) {
          bg = "bg-red-100";
          color = "text-red-600";
          label = `+${Math.abs(remain)}`;
        }
        return (
          <li
            key={item.id}
            className={`flex items-center justify-between border rounded p-2 cursor-pointer ${bg}`}
            onClick={(e) => openDatePicker(item, e)}
          >
            <div className="flex-1 flex items-center justify-between">
              <span className={`text-sm ${color}`}>{item.name}</span>
              <span className={`text-xs ${color}`}>{label}</span>
            </div>
            {editingId === item.id && (
              <input
                ref={(el) => {
                  inputRefs.current[item.id] = el;
                }}
                type="date"
                value={pickerDate}
                onChange={async (e) => {
                  await handleDateChange(e.target.value);
                }}
                style={{
                  position: "fixed",
                  top: pickerPosition.y,
                  left: pickerPosition.x,
                  transform: "translate(-50%, 0)",
                }}
                className="p-2 border bg-white shadow-lg z-50"
              />
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="">
      <div className="flex justify-between items-center mb-2">
        <button
          onClick={() => setCollapsedRoutine((prev) => !prev)}
          className="mx-1 text-gray-500 cursor-pointer text-xl transition"
          title={collapsedRoutine ? "펼치기" : "숨기기"}
        >
          {collapsedRoutine ? "▷" : "▽"}
        </button>
        <h3 className="flex-1 font-bold truncate">집안일 루틴</h3>
      </div>
      {!collapsedRoutine && renderItems(routineItems)}
    </div>
  );
}
