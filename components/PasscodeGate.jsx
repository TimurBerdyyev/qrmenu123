"use client";

import { useState } from "react";

export default function PasscodeGate({ onUnlock, dark = false }) {
  const [value, setValue] = useState("");
  const [err, setErr] = useState(false);
  const passcode = process.env.NEXT_PUBLIC_STAFF_PASSCODE;

  function submit(e) {
    e.preventDefault();
    if (value === passcode) {
      onUnlock();
    } else {
      setErr(true);
    }
  }

  const bg = dark ? "#16140f" : "var(--bg)";
  const fieldBg = dark ? "#211d16" : "var(--paper)";
  const fieldColor = dark ? "#f2ede1" : "var(--ink)";
  const border = dark ? "#4a4433" : "var(--line)";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <form onSubmit={submit} style={{ width: 280, color: fieldColor }}>
        <h1
          style={{
            marginBottom: 16,
            fontFamily: "var(--font-display), serif",
            color: fieldColor,
          }}
        >
          Код персонала
        </h1>
        <input
          type="password"
          inputMode="numeric"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setErr(false);
          }}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 6,
            border: `1px solid ${border}`,
            background: fieldBg,
            color: fieldColor,
          }}
          autoFocus
        />
        {err && (
          <p style={{ color: "#c1584a", fontSize: 13, marginTop: 8 }}>
            Неверный код
          </p>
        )}
        <button className="primary-btn" style={{ marginTop: 16 }} type="submit">
          Войти
        </button>
      </form>
    </div>
  );
}
