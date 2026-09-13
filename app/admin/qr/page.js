"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import Logo from "@/components/Logo";

export default function QrAdminPage() {
  const [tableCount, setTableCount] = useState(10);
  const [origin, setOrigin] = useState("");
  const [codes, setCodes] = useState([]); // [{label, url, dataUrl}]

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!origin) return;
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, tableCount]);

  async function generate() {
    const targets = [];
    for (let i = 1; i <= tableCount; i++) {
      targets.push({ label: `Стол ${i}`, url: `${origin}/table/${i}` });
    }
    targets.push({ label: "С собой", url: `${origin}/takeaway` });

    const withCodes = await Promise.all(
      targets.map(async (t) => ({
        ...t,
        dataUrl: await QRCode.toDataURL(t.url, {
          margin: 1,
          width: 320,
          color: { dark: "#211d16", light: "#fffdf8" },
        }),
      }))
    );
    setCodes(withCodes);
  }

  return (
    <main className="page" style={{ maxWidth: 960 }}>
      <div className="brand no-print">
        <Logo />
        <span className="tag">QR-коды для печати</span>
      </div>

      <div className="no-print" style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
        <label className="field-label" style={{ margin: 0 }}>
          Количество столов:
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={tableCount}
          onChange={(e) => {
            const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
            setTableCount(Number.isNaN(n) ? 0 : Math.min(n, 200));
          }}
          style={{ width: 80 }}
        />
        <button className="ghost-btn" onClick={() => window.print()}>
          Печать
        </button>
      </div>
      <p className="no-print" style={{ color: "var(--ink-soft)", fontSize: 14 }}>
        Каждый QR ведёт на страницу заказа для конкретного стола. Наклейте
        распечатанные карточки на соответствующие столы. Последняя карточка —
        общая для заказов «с собой» (например, у кассы).
      </p>

      <div className="qr-grid">
        {codes.map((c) => (
          <div className="qr-card" key={c.url}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.dataUrl} alt={c.label} />
            <div className="label">{c.label}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
