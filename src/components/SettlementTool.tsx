// components/SettlementTool.tsx
import { useState, useMemo } from "react";
import { DateTime } from "luxon";
import { supabase } from "../lib/supabase";
import DateInput from "./DateInput";

interface Session {
  id: number;
  start: string;
  end?: string;
  paid?: boolean;
  break_minutes?: number;
}

interface Props {
  sessions: Session[];
  userId: string;
  onRefresh: () => void;
}

export default function SettlementTool(props: Props) {
  const { sessions, userId, onRefresh } = props;
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  console.log("settlement tool received userId", userId);
  const filtered = useMemo(() => {
    if (!rangeStart || !rangeEnd) return [];
    const start = DateTime.fromISO(rangeStart);
    const end = DateTime.fromISO(rangeEnd).endOf("day");

    return sessions.filter((s) => {
      const sStart = DateTime.fromISO(s.start);
      return sStart >= start && sStart <= end;
    });
  }, [rangeStart, rangeEnd, sessions]);

  const totalMinutes = useMemo(() => {
    return filtered.reduce((sum, s) => {
      if (!s.end) return sum;

      // 1) 计算这一条记录的“上班-下班”的总分钟数
      const sStart = DateTime.fromISO(s.start);
      const sEnd = DateTime.fromISO(s.end);
      const rawMinutes = sEnd.diff(sStart, "minutes").minutes; // e.g. 420 分钟

      // 2) 取出这条记录里存的休息分钟数（没有记录则默认为 0）
      const breakMinutes = s.break_minutes ?? 0; // e.g. 60

      // 3) 用 “rawMinutes - breakMinutes” 得到这条记录的“实际工作分钟数”
      const workMinutes = Math.max(0, Math.floor(rawMinutes) - breakMinutes);

      // 累加到总和
      return sum + workMinutes;
    }, 0);
  }, [filtered]);

  const handleMarkPaid = async () => {
    const ids = filtered.map((s) => s.id);
    if (ids.length === 0) return;
    const { error } = await supabase
      .from("work_sessions")
      .update({ paid: true })
      .in("id", ids);
    if (error) console.error("清算失败", error);
    else onRefresh();
  };

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const [hourlyRate, setHourlyRate] = useState(45);
  const totalWage = hours * hourlyRate;
  const todayJST = new Date()
    .toLocaleString("sv-SE", { timeZone: "Asia/Tokyo" }) // "2025-06-04 21:30:00"
    .split(" ")[0]; // 👉 "2025-06-04"

  return (
    <div
      style={{
        marginTop: "2rem",
        borderTop: "1px solid #ccc",
        paddingTop: "1rem",
      }}
    >
      <h3>💰 工资结算工具</h3>
      <div
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <DateInput
          label="开始日期："
          value={rangeStart}
          onChange={(value: string) => setRangeStart(value)}
          maxDate={todayJST}
        />
        <DateInput
          label="结束日期："
          value={rangeEnd}
          onChange={(value: string) => setRangeEnd(value)}
          maxDate={todayJST}
        />
      </div>
      <p>
        🧮 工时统计：{hours}小时 {minutes}分钟
      </p>
      <div>
        <label>
          时薪（元/小时）:
          <input
            type="number"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(Number(e.target.value))}
            style={{ marginLeft: "0.5rem", width: "80px" }}
          />
        </label>
      </div>
      <p style={{ marginTop: "1rem", fontWeight: "bold" }}>
        💴 总工资估算：{totalWage.toLocaleString()} 元
      </p>
      <button onClick={handleMarkPaid}>✅ 标记这些为已清算</button>
    </div>
  );
}
