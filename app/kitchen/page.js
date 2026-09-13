"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Logo from "@/components/Logo";
import PasscodeGate from "@/components/PasscodeGate";

const STATUS_FLOW = {
  new: { next: "preparing", label: "Новый", cta: "Взяли в работу" },
  preparing: { next: "ready", label: "Готовится", cta: "Готово" },
  ready: { next: "completed", label: "Готово", cta: "Выдали" },
};

const COLUMNS = [
  { key: "new", title: "Новые" },
  { key: "preparing", title: "Готовятся" },
  { key: "ready", title: "Готовы" },
];

const PASSCODE = process.env.NEXT_PUBLIC_STAFF_PASSCODE;

function useClock() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function elapsedLabel(createdAt, now) {
  const mins = Math.max(0, Math.round((now - new Date(createdAt).getTime()) / 60000));
  if (mins < 1) return "только что";
  return `${mins} мин`;
}

export default function KitchenPage() {
  const [unlocked, setUnlocked] = useState(!PASSCODE);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const now = useClock();

  useEffect(() => {
    if (!unlocked) return;

    let active = true;

    async function loadOrders() {
      const since = new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString();
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .neq("status", "completed")
        .gte("created_at", since)
        .order("created_at", { ascending: true });

      if (!active) return;
      if (error) {
        console.error(error);
      } else {
        setOrders(data || []);
      }
      setLoading(false);
    }

    loadOrders();

    const channel = supabase
      .channel("kitchen-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        loadOrders
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        loadOrders
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [unlocked]);

  const grouped = useMemo(() => {
    const g = { new: [], preparing: [], ready: [] };
    for (const o of orders) {
      if (g[o.status]) g[o.status].push(o);
    }
    return g;
  }, [orders]);

  async function advance(order) {
    const next = STATUS_FLOW[order.status]?.next;
    if (!next) return;
    const { error } = await supabase
      .from("orders")
      .update({ status: next })
      .eq("id", order.id);
    if (error) console.error(error);
  }

  if (!unlocked) {
    return <PasscodeGate dark onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <div className="kitchen">
      <div className="kitchen-header">
        <Logo variant="dark" size={26} />
        <span className="kitchen-clock">
          {new Date(now).toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {loading ? (
        <p style={{ color: "#b8ae95" }}>Загружаем заказы…</p>
      ) : (
        <div className="kitchen-columns">
          {COLUMNS.map((col) => (
            <div className="kitchen-column" key={col.key}>
              <h2>
                <span>{col.title}</span>
                <span>{grouped[col.key].length}</span>
              </h2>
              {grouped[col.key].length === 0 && (
                <div className="empty-column">Пусто</div>
              )}
              {grouped[col.key].map((order) => (
                <div
                  className={`order-card status-${order.status}`}
                  key={order.id}
                >
                  <div className="row1">
                    <span className="table-tag">
                      {order.is_takeaway
                        ? "С собой"
                        : `Стол ${order.table_number}`}
                    </span>
                    <span className="elapsed">
                      {elapsedLabel(order.created_at, now)}
                    </span>
                  </div>
                  <ul>
                    {order.order_items?.map((it) => (
                      <li key={it.id}>
                        {it.quantity} × {it.name}
                      </li>
                    ))}
                  </ul>
                  {order.customer_note && (
                    <div className="note">« {order.customer_note} »</div>
                  )}
                  <div className="actions">
                    <button className="advance" onClick={() => advance(order)}>
                      {STATUS_FLOW[order.status]?.cta}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
