import React from "react";

type DateInputProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  maxDate?: string; // 可选：最大日期（yyyy-mm-dd）
  minDate?: string; // 可选：最小日期
};

const getTodayJST = (): string => {
  return new Date()
    .toLocaleString("sv-SE", { timeZone: "Asia/Tokyo" }) // "2025-06-04 22:00:00"
    .split(" ")[0]; // "2025-06-04"
};

const DateInput: React.FC<DateInputProps> = ({
  label,
  value,
  onChange,
  maxDate,
  minDate,
}) => {
  const today = getTodayJST();

  return (
    <label
      style={{
        display: "inline-flex",
      }}
    >
      {label}
      <input
        type="date"
        value={value}
        max={maxDate || today}
        min={minDate}
        onChange={(e) => onChange(e.target.value)}
        style={{ marginLeft: "0.5rem" }}
      />
    </label>
  );
};

export default DateInput;
