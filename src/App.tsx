import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import { DateTime } from "luxon";
import SettlementTool from "./components/SettlementTool";
import DateInput from "./components/DateInput";

// 定义你的打卡记录结构
type WorkSession = {
  id: number;
  start: string; // ISO 字符串
  end?: string;
  paid: boolean; // true 表示这笔工时已清算
  break_minutes: number;
};

function App() {
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });
  const [manualDate, setManualDate] = useState("");
  const [manualStart, setManualStart] = useState("");
  const [manualEnd, setManualEnd] = useState("");
  const [manualBreak, setManualBreak] = useState<number>(0);
  // 在组件最上方，先生成这些时间选项
  const timeOptions = Array.from({ length: 24 * 4 }, (_, i) => {
    const totalMinutes = i * 15;
    const h = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const m = String(totalMinutes % 60).padStart(2, "0");
    return `${h}:${m}`;
  });
  // // 上班打卡
  // const handleCheckIn = async () => {
  //   console.log("👆 触发上班打卡");
  //   const { error } = await supabase.from("work_sessions").insert([
  //     {
  //       user_id: userId, // 🐭 你可以写成你的昵称
  //       start: new Date().toLocaleString("sv-SE", { timeZone: "Asia/Tokyo" }),
  //     },
  //   ]);
  //   if (error) {
  //     console.error("打卡失败：", error);
  //   } else {
  //     console.log("✅ 打卡成功！");
  //     await loadSessions(); // 新增：打卡成功后刷新记录
  //   }
  // };
  const loadSessions = async () => {
    const [year, month] = currentMonth.split("-").map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0, 23, 59, 59); // 本月最后一天 23:59:59

    const { data, error } = await supabase
      .from("work_sessions")
      .select("*")
      .eq("user_id", userId)
      .gte("start", firstDay.toISOString())
      .lte("start", lastDay.toISOString())
      .order("start", { ascending: true });

    if (!error && data) {
      setSessions(data);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [userId, currentMonth]);

  const handleManualSubmit = async () => {
    // 1. 校验必填
    if (!manualDate || !manualStart || !manualEnd) {
      alert("请先选择日期和时间");
      return;
    }

    // 2. 构造开始/结束的 Luxon DateTime
    const startDT = DateTime.fromISO(`${manualDate}T${manualStart}`, {
      zone: "Asia/Tokyo",
    });
    const endDT = DateTime.fromISO(`${manualDate}T${manualEnd}`, {
      zone: "Asia/Tokyo",
    });

    // 3. 计算工时（小时）
    const totalHoursRaw = endDT.diff(startDT, "hours").hours - manualBreak / 60;
    const workHours = Number(totalHoursRaw.toFixed(2));
    const breakHours = manualBreak / 60;

    // 4. 弹窗确认
    const confirmMsg =
      `你确认要提交以下记录吗？\n` +
      `日期： ${manualDate}\n` +
      `时间： ${manualStart} — ${manualEnd}\n` +
      `休息： ${breakHours} 小时\n` +
      `工时： ${workHours} 小时\n\n` +
      `点击“确定”提交，点击“取消”放弃。`;
    if (!window.confirm(confirmMsg)) {
      // 用户点了取消
      return;
    }

    // 5. 用户确认后，真正写入数据库
    const { error } = await supabase.from("work_sessions").insert([
      {
        user_id: userId,
        start: startDT.toISO(),
        end: endDT.toISO(),
        break_minutes: manualBreak,
      },
    ]);

    if (error) {
      console.error("提交失败", error);
      alert("提交出错，请重试");
    } else {
      // 刷新记录
      await loadSessions();
    }
  };
  // const formatBreakTotal = (breaks: { start: string; end: string }[]) => {
  //   const totalMinutes = breaks.reduce((sum, b) => {
  //     const bStart = new Date(b.start);
  //     const bEnd = new Date(b.end);
  //     return sum + Math.floor((bEnd.getTime() - bStart.getTime()) / 60000);
  //   }, 0);

  //   const h = Math.floor(totalMinutes / 60);
  //   const m = totalMinutes % 60;
  //   return `${h > 0 ? `${h}小时` : ""}${m > 0 ? `${m}分钟` : ""}`;
  // };
  function getMonthlyTotalMinutes() {
    const now = DateTime.now().setZone("Asia/Tokyo");
    const currentYear = now.year;
    const currentMonth = now.month - 1; // 注意：Luxon 的 month 是 1-12，而 JS 的 getMonth 是 0-11

    const monthlySessions = sessions.filter((s) => {
      const start = new Date(
        new Date(s.start).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
      );
      return (
        start.getFullYear() === currentYear && start.getMonth() === currentMonth
      );
    });

    const totalMinutes = monthlySessions.reduce((sum, s) => {
      if (!s.end) return sum;

      const start = new Date(
        new Date(s.start).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
      );
      const end = new Date(
        new Date(s.end).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
      );

      const totalWorkMinutes = Math.floor(
        (end.getTime() - start.getTime()) / 60000
      );

      const totalBreakMinutes = s.break_minutes ?? 0;

      const workMinutes = totalWorkMinutes - totalBreakMinutes;

      return sum + workMinutes;
    }, 0);
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
    };
  }
  const todayJST = new Date()
    .toLocaleString("sv-SE", { timeZone: "Asia/Tokyo" }) // "2025-06-04 21:30:00"
    .split(" ")[0]; // 👉 "2025-06-04"
  const { hours, minutes } = getMonthlyTotalMinutes();
  // 一开始未选择用户时，仅显示选择用户界面
  if (!userId) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1>🐭 工时打卡工具</h1>
        <h2>请选择用户</h2>
        <div style={{ marginBottom: "1rem" }}>
          <button
            onClick={() => setUserId("userhsm")}
            style={{
              marginRight: "0.5rem",
              marginTop: "0.5rem",
            }}
          >
            七
          </button>
          <button
            onClick={() => setUserId("cat001")}
            style={{ marginTop: "0.5rem", marginRight: "0.5rem" }}
          >
            胡椒
          </button>
          <button
            onClick={() => setUserId("user27")}
            style={{ marginTop: "0.5rem", marginRight: "0.5rem" }}
          >
            27
          </button>
          <button
            onClick={() => setUserId("tantan")}
            style={{ marginTop: "0.5rem", marginRight: "0.5rem" }}
          >
            炭炭
          </button>
          <button
            onClick={() => setUserId("guest")}
            style={{ marginTop: "0.5rem", marginRight: "0.5rem" }}
          >
            测试
          </button>
        </div>
      </div>
    );
  }
  return (
    <div style={{ padding: "2rem" }}>
      <h1>🐭 工时打卡工具</h1>

      {/* 占位说明，提示身份切换按钮位置 */}

      <div style={{ marginBottom: "1rem" }}>
        <span>当前身份：</span>
        <button
          onClick={() => setUserId("userhsm")}
          style={{
            marginRight: "0.5rem",
            marginTop: "0.5rem",
            backgroundColor: userId === "userhsm" ? "#eee" : "",
          }}
        >
          七
        </button>
        <button
          onClick={() => setUserId("cat001")}
          style={{
            marginRight: "0.5rem",
            marginTop: "0.5rem",
            backgroundColor: userId === "cat001" ? "#eee" : "",
          }}
        >
          胡椒
        </button>
        <button
          onClick={() => setUserId("user27")}
          style={{
            marginRight: "0.5rem",
            marginTop: "0.5rem",
            backgroundColor: userId === "user27" ? "#eee" : "",
          }}
        >
          27
        </button>
        <button
          onClick={() => setUserId("tantan")}
          style={{
            marginRight: "0.5rem",
            marginTop: "0.5rem",
            backgroundColor: userId === "tantan" ? "#eee" : "",
          }}
        >
          炭炭
        </button>
        <button
          onClick={() => setUserId("guest")}
          style={{
            marginRight: "0.5rem",
            marginTop: "0.5rem",
            backgroundColor: userId === "guest" ? "#eee" : "",
          }}
        >
          测试
        </button>
      </div>
      <div style={{ marginTop: "3rem" }}>
        <div style={{ display: "block" }}>
          <h3>🛠 登记打卡</h3>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <DateInput
              value={manualDate}
              onChange={(value: string) => setManualDate(value)}
              maxDate={todayJST}
            />
            <input
              type="time"
              value={manualStart}
              onChange={(e) => setManualStart(e.target.value)}
              step={900}
              style={{ marginRight: "0.5rem" }}
              placeholder="开始时间"
              list="time-list"
            />
            <datalist id="time-list">
              {timeOptions.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <input
              type="time"
              value={manualEnd}
              onChange={(e) => setManualEnd(e.target.value)}
              step={900}
              style={{ marginRight: "0.5rem" }}
              list="time-list"
            />
            <datalist id="time-list">
              {timeOptions.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>

          <div style={{ display: "flex", gap: "1rem", margin: "1rem 0" }}>
            <span>休息：</span>
            {[0, 60, 120].map((m) => (
              <label key={m} style={{ cursor: "pointer" }}>
                <input
                  type="radio"
                  name="break-time"
                  value={m}
                  checked={manualBreak === m}
                  onChange={() => setManualBreak(m)}
                />{" "}
                {m / 60} 小时
              </label>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: "1rem" }}>
            <button style={{ width: "270px" }} onClick={handleManualSubmit}>
              提交
            </button>
          </div>
        </div>
      </div>
      <h3 style={{ marginTop: "3rem" }}>
        🧮 本月总工时：{hours}小时 {minutes}分钟
      </h3>
      <ul>
        {sessions.map((s, i) => (
          <li key={i}>
            {new Date(s.start).toLocaleTimeString("ja-JP", {
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
              timeZone: "Asia/Tokyo",
            })}{" "}
            -{" "}
            {s.end
              ? new Date(s.end).toLocaleTimeString("ja-JP", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                  timeZone: "Asia/Tokyo",
                })
              : "（未打下班卡）"}
            {s.break_minutes > 0 && (
              <span> 💤 含休息 {s.break_minutes / 60}小时</span>
            )}
            {s.paid && " ✅"}
          </li>
        ))}
      </ul>

      <div style={{ marginBottom: "1rem" }}>
        <label>
          选择月份：
          <input
            type="month"
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
          />
        </label>
      </div>

      <SettlementTool
        sessions={sessions}
        userId={userId}
        onRefresh={loadSessions}
      ></SettlementTool>
    </div>
  );
}

export default App;
