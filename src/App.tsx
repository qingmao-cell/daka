import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
// 定义你的打卡记录结构
type WorkSession = {
  id: number;
  start: string; // ISO 字符串
  end?: string;
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

  // 下班打卡
  const handleCheckOut = async () => {
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

    if (data && data.length > 0) {
      const latest = data[0];
      const { error: updateError } = await supabase
        .from("work_sessions")
        .update({
          end: new Date().toLocaleString("sv-SE", { timeZone: "Asia/Tokyo" }),
        })
        .eq("id", latest.id);
      if (updateError) {
        console.error("下班打卡失败", updateError);
      } else {
        console.log("✅ 下班打卡成功！");
        await loadSessions(); // ✅ 成功后再刷新
      }
    }
  };

  function getMonthlyTotalMinutes() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

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
      const diff = Math.floor((end.getTime() - start.getTime()) / 60000);
      return sum + diff;
    }, 0);

    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
    };
  }

  const { hours, minutes } = getMonthlyTotalMinutes();
  return (
    <div style={{ padding: "2rem" }}>
      <h1>🐭 工时打卡工具</h1>

      {/* 占位说明，提示身份切换按钮位置 */}
      <p style={{ fontSize: "0.9rem", color: "#888" }}>选择当前身份：</p>
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

      <h2>
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
    </div>
  );
}

export default App;
