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
  const [userId, setUserId] = useState("cat001"); // 默认猫猫
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
  // 上班打卡
  const handleCheckIn = async () => {
    console.log("👆 触发上班打卡");
    const { error } = await supabase.from("work_sessions").insert([
      {
        user_id: userId, // 🐭 你可以写成你的昵称
        start: new Date().toLocaleString("sv-SE", { timeZone: "Asia/Tokyo" }),
      },
    ]);
    if (error) {
      console.error("打卡失败：", error);
    } else {
      console.log("✅ 打卡成功！");
      await loadSessions(); // 新增：打卡成功后刷新记录
    }
  };
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

  const handleCheckOut = async () => {
    // 1. 先查出最新一条未打下班卡的记录
    const { data, error: fetchError } = await supabase
      .from("work_sessions")
      .select("*")
      .eq("user_id", userId)
      .is("end", null)
      .order("start", { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error("查询失败：", fetchError);
      return;
    }
    if (!data || data.length === 0) return;

    const latest = data[0];

    // 2. 用 Luxon 构造开始与当前“下班”时间
    const start = DateTime.fromISO(latest.start, { zone: "Asia/Tokyo" });
    const end = DateTime.now().setZone("Asia/Tokyo");

    // 3. 定义午休/晚休时段（同补记逻辑）
    const restSpans = [
      [11, 30, 13, 30], // 午休 11:30–13:30
      [17, 0, 19, 0], // 晚休 17:00–19:00
    ];

    // 4. 判断这段上班与休息时段是否重叠
    let breakMinutes = 0;
    const overlapInfo = restSpans.find(([sh, sm, eh, em]) => {
      const restStart = DateTime.fromObject(
        {
          year: start.year,
          month: start.month,
          day: start.day,
          hour: sh,
          minute: sm,
        },
        { zone: "Asia/Tokyo" }
      );
      const restEnd = DateTime.fromObject(
        {
          year: start.year,
          month: start.month,
          day: start.day,
          hour: eh,
          minute: em,
        },
        { zone: "Asia/Tokyo" }
      );
      return start < restEnd && end > restStart;
    });

    if (overlapInfo) {
      const input = window.prompt(
        "🐭 本次打卡跨过了午休(11:30–13:30)或晚休(17:00–19:00)，请输入休息分钟数（0、60 或 120）：",
        "60"
      );
      const minutes = parseInt(input ?? "0", 10);
      if (!isNaN(minutes)) {
        breakMinutes = minutes;
      }
    }

    // 5. 更新这条记录：写入 end 和 break_minutes
    const { error: updateError } = await supabase
      .from("work_sessions")
      .update({
        end: end.toISO(),
        break_minutes: breakMinutes,
      })
      .eq("id", latest.id);

    if (updateError) {
      console.error("下班打卡失败", updateError);
    } else {
      console.log("✅ 下班打卡成功，break_minutes =", breakMinutes);
      await loadSessions();
    }
  };

  // 省略 import 部分...
  const handleManualSubmit = async () => {
    if (!manualDate || !manualStart || !manualEnd) return;

    // 1) 用 Luxon 构造开始/结束 DateTime
    const start = DateTime.fromISO(`${manualDate}T${manualStart}`, {
      zone: "Asia/Tokyo",
    });
    const end = DateTime.fromISO(`${manualDate}T${manualEnd}`, {
      zone: "Asia/Tokyo",
    });

    // 日志：确认 start/end 的 ISO 字符串，便于调试
    console.log("🟢 [调试] start:", start.toISO());
    console.log("🟢 [调试] end  :", end.toISO());

    // 2) 定义“午休”和“晚休”两个区间（小时+分钟），后面会用这些值来生成真实的 DateTime
    const restSpans = [
      [11, 30, 13, 30], // 午休 11:30–13:30
      [17, 0, 19, 0], // 晚休 17:00–19:00
    ];

    // 3) 先给一个变量，存最终要记录的休息分钟数
    let breakMinutes = 0;

    // 4) 用 any/find 之类的方法来判断：只要“start < 区间结束 && end > 区间开始”，就属于“跨过”这个休息时段
    const overlapInfo = restSpans.find(([sh, sm, eh, em]) => {
      // 注意：我们要把“同一天同样年月日”加到小时/分钟里，才能做精确比较
      const restStart = DateTime.fromObject(
        {
          year: start.year,
          month: start.month,
          day: start.day,
          hour: sh,
          minute: sm,
        },
        { zone: "Asia/Tokyo" }
      );
      const restEnd = DateTime.fromObject(
        {
          year: start.year,
          month: start.month,
          day: start.day,
          hour: eh,
          minute: em,
        },
        { zone: "Asia/Tokyo" }
      );

      // 日志：每一个休息区间的真实 DateTime
      console.log(
        "🟡 [调试] restSpan:",
        restStart.toISO(),
        "—",
        restEnd.toISO(),
        "，start < restEnd? ",
        start < restEnd,
        "，end > restStart? ",
        end > restStart
      );

      return start < restEnd && end > restStart;
    });

    // 5) 如果 overlapInfo 不为 undefined，就说明跨过了至少一个休息区间
    if (overlapInfo) {
      // 弹窗询问“实际休息分钟数”——最多给 0、60 或 120 的选项
      const input = window.prompt(
        "🐭 本次补记打卡时间跨过了“午休(11:30–13:30)或晚休(17:00–19:00)”，请输入本次休息分钟数（0、60 或 120）：",
        "60"
      );
      const minutes = parseInt(input ?? "0", 10);
      if (!isNaN(minutes)) {
        breakMinutes = minutes;
      }
      // 日志：看看用户到底输入了多少
      console.log("🟢 [调试] 用户输入的休息分钟数:", breakMinutes);
    }

    // 6) 最后真正插入数据库：start、end、break_minutes
    const { error } = await supabase.from("work_sessions").insert([
      {
        user_id: userId,
        start: start.toISO(),
        end: end.toISO(),
        break_minutes: breakMinutes,
      },
    ]);

    if (error) {
      console.error("❌ 补记失败", error);
    } else {
      console.log("✅ 补记成功，break_minutes =", breakMinutes);
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
            backgroundColor: userId === "userhsm" ? "#eee" : "",
          }}
        >
          七
        </button>
        <button
          onClick={() => setUserId("cat001")}
          style={{
            marginRight: "0.5rem",
            backgroundColor: userId === "cat001" ? "#eee" : "",
          }}
        >
          猫猫
        </button>
        <button
          onClick={() => setUserId("user27")}
          style={{
            marginRight: "0.5rem",
            backgroundColor: userId === "user27" ? "#eee" : "",
          }}
        >
          27
        </button>
        <button
          onClick={() => setUserId("guest")}
          style={{ backgroundColor: userId === "guest" ? "#eee" : "" }}
        >
          访客
        </button>
      </div>

      <button onClick={handleCheckIn}>上班打卡</button>
      <button onClick={handleCheckOut} style={{ marginLeft: "1rem" }}>
        下班打卡
      </button>

      <h2 style={{ marginTop: "3rem" }}>
        🧮 本月总工时：{hours}小时 {minutes}分钟
      </h2>
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
      <div style={{ marginTop: "3rem" }}>
        <h3>🛠 补记打卡</h3>
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
            style={{ marginRight: "0.5rem" }}
          />
          <input
            type="time"
            value={manualEnd}
            onChange={(e) => setManualEnd(e.target.value)}
            style={{ marginRight: "0.5rem" }}
          />
          <button onClick={handleManualSubmit}>补记</button>
        </div>
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
