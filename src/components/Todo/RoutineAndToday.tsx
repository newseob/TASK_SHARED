import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { doc, onSnapshot, getDoc, updateDoc } from "firebase/firestore";
import TodayRoutineSection from "./TodayRoutineSection";

interface QuestItem {
  id: string;
  name: string;
  cycle: number;
  lastChecked: string;
  origLastChecked?: string;
  origRecordedAt?: string; // YYYY-MM-DD of when origLastChecked was recorded
  importanceValue?: number;
}

/**
 * 날짜를 아침 6시 기준으로 조정하여 해당 날짜의 00:00로 반환
 */
function getReferenceDate(date: Date): Date {
  const d = new Date(date);
  if (d.getHours() < 6) d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * cycle에서 경과일(diffDays)을 빼서
 * 남은 일수 = cycle - diffDays
 */
function calculateRemainingDays(cycle: number, lastChecked: string): number {
  const last = new Date(lastChecked);
  const todayRefTime = getReferenceDate(new Date()).getTime();
  const lastRefTime = getReferenceDate(last).getTime();
  const diffDays = Math.floor(
    (todayRefTime - lastRefTime) / (1000 * 60 * 60 * 24)
  );
  return cycle - diffDays;
}

export default function TodoBoxSection() {
  const [dailyItems, setDailyItems] = useState<QuestItem[]>([]);
  const [collapsedDaily, setCollapsedDaily] = useState(false);

  const refDoc = doc(db, "routineItems", "config");

  // 실시간으로 일일 퀘스트 가져오기
  useEffect(() => {
    const unsub = onSnapshot(refDoc, (snap) => {
      const items = (snap.data()?.items as QuestItem[]) || [];
      setDailyItems(items.filter((it) => it.cycle === 0));
    });
    return () => unsub();
  }, []);

  // 매일 오전 6시에 origLastChecked 및 origRecordedAt 필드를 JSON에 저장
  useEffect(() => {
    const refreshOrigLastChecked = async () => {
      const snap = await getDoc(refDoc);
      const items = (snap.data()?.items as QuestItem[]) || [];
      // 오늘 기준 YYYY-MM-DD
      const todayStr = getReferenceDate(new Date())
        .toISOString()
        .substring(0, 10);
      const updated = items.map((it) => {
        // origRecordedAt이 오늘 날짜가 아니면 새로 기록
        if (it.origRecordedAt !== todayStr) {
          return {
            ...it,
            origLastChecked: it.lastChecked,
            origRecordedAt: todayStr,
          };
        }
        return it;
      });
      // Firestore에 반영
      await updateDoc(refDoc, { items: updated });
    };

    let timer: NodeJS.Timeout;
    const scheduleNext6am = () => {
      const now = new Date();
      const next6 = new Date(now);
      next6.setHours(6, 0, 0, 0);
      if (now.getTime() >= next6.getTime()) next6.setDate(next6.getDate() + 1);
      const msUntilNext6 = next6.getTime() - now.getTime();
      timer = setTimeout(async () => {
        await refreshOrigLastChecked();
        scheduleNext6am();
      }, msUntilNext6);
    };

    // 초기 기록 및 스케줄링
    refreshOrigLastChecked();
    scheduleNext6am();

    return () => clearTimeout(timer);
  }, []);

  // 토글 클릭: 오늘 날짜로 설정 or origLastChecked로 복원
  const handleToggle = async (itemId: string) => {
    const now = new Date();
    const nowIso = now.toISOString();
    const todayRef = getReferenceDate(now).getTime();

    const snap = await getDoc(refDoc);
    const items = (snap.data()?.items as QuestItem[]) || [];
    const updated = items.map((it) => {
      if (it.id === itemId) {
        const lastRef = getReferenceDate(new Date(it.lastChecked)).getTime();
        if (lastRef === todayRef && it.origLastChecked) {
          return { ...it, lastChecked: it.origLastChecked };
        }
        return { ...it, lastChecked: nowIso };
      }
      return it;
    });
    await updateDoc(refDoc, { items: updated });
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
          bg = "bg-blue-100";
          color = "text-blue-500";
        } else if (isOverdue) {
          bg = "bg-red-100";
          color = "text-red-500";
          label = `+${Math.abs(remain)}`;
        }
        return (
          <li
            key={item.id}
            onClick={() => handleToggle(item.id)}
            className={`flex items-center justify-between border rounded p-2 cursor-pointer ${bg}`}
          >
            <span className={`text-sm ${color}`}>{item.name}</span>
            <span className={`text-xs ${color}`}>{label}</span>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="flex flex-wrap justify-between gap-4">
      {/* 일일 퀘스트 */}
      <div className="flex-1 border p-2 rounded-lg shadow bg-white">
        <div className="flex justify-between items-center mb-2">
          <button
            onClick={() => setCollapsedDaily((prev) => !prev)}
            className="mx-1 text-gray-500 cursor-pointer text-sm transition"
            title={collapsedDaily ? "펼치기" : "숨기기"}
          >
            {collapsedDaily ? "▷" : "▽"}
          </button>
          <h3 className="flex-1 font-bold truncate">일일 퀘스트</h3>
        </div>
        {!collapsedDaily && renderItems(dailyItems)}
      </div>

      {/* 오늘 루틴 */}
      <div className="flex-1 border p-2 rounded-lg shadow bg-white">
        <TodayRoutineSection />
      </div>
    </div>
  );
}
