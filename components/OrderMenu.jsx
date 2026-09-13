"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Logo from "@/components/Logo";

export default function OrderMenu({ tableNumber, isTakeaway }) {
  const [items, setItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState("");

  const [cart, setCart] = useState({}); // { [itemId]: qty }
  const [sheetOpen, setSheetOpen] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [placedOrder, setPlacedOrder] = useState(null);

  useEffect(() => {
    let active = true;
    async function loadMenu() {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("is_available", true)
        .order("category", { ascending: true })
        .order("sort_order", { ascending: true });

      if (!active) return;
      if (error) {
        setMenuError(error.message);
      } else {
        setItems(data || []);
      }
      setMenuLoading(false);
    }
    loadMenu();
    return () => {
      active = false;
    };
  }, []);

  const sections = useMemo(() => {
    const map = new Map();
    for (const item of items) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category).push(item);
    }
    return Array.from(map.entries()).map(([category, list]) => ({
      category,
      items: list,
    }));
  }, [items]);

  const itemsById = useMemo(() => {
    const m = new Map();
    for (const item of items) m.set(item.id, item);
    return m;
  }, [items]);

  const lines = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({ item: itemsById.get(id), qty }))
      .filter((line) => line.item);
  }, [cart, itemsById]);

  const total = lines.reduce((sum, l) => sum + Number(l.item.price) * l.qty, 0);
  const count = lines.reduce((sum, l) => sum + l.qty, 0);

  function changeQty(id, delta) {
    setCart((prev) => {
      const next = { ...prev };
      const current = next[id] || 0;
      const updated = Math.max(0, current + delta);
      if (updated === 0) {
        delete next[id];
      } else {
        next[id] = updated;
      }
      return next;
    });
  }

  async function submitOrder() {
    if (lines.length === 0) return;
    setSubmitting(true);
    setError("");
    try {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          table_number: isTakeaway ? null : Number(tableNumber),
          is_takeaway: isTakeaway,
          status: "new",
          total,
          customer_note: note || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const itemsPayload = lines.map((l) => ({
        order_id: order.id,
        name: l.item.name,
        price: l.item.price,
        quantity: l.qty,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(itemsPayload);

      if (itemsError) throw itemsError;

      setPlacedOrder(order);
      setCart({});
      setSheetOpen(false);
      setNote("");
    } catch (e) {
      console.error(e);
      setError(
        e?.message
          ? `Не удалось отправить заказ: ${e.message}`
          : "Не удалось отправить заказ. Проверьте соединение и попробуйте ещё раз."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (placedOrder) {
    return (
      <main className="page">
        <div className="confirm-screen">
          <div className="mark">✓</div>
          <h2>Заказ принят</h2>
          <p>
            {isTakeaway
              ? "Готовим с собой. Заберите заказ на стойке, когда позовём."
              : `Стол ${tableNumber}. Несём, как только приготовим.`}
          </p>
          <button
            className="ghost-btn"
            style={{ marginTop: 24 }}
            onClick={() => setPlacedOrder(null)}
          >
            Заказать ещё
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="brand">
        <Logo />
        <span className="tag">
          {isTakeaway ? "заказ с собой" : `стол ${tableNumber}`}
        </span>
      </div>

      {menuLoading && <p style={{ color: "var(--ink-soft)" }}>Загружаем меню…</p>}

      {menuError && (
        <p style={{ color: "var(--danger)" }}>
          Не удалось загрузить меню: {menuError}
        </p>
      )}

      {!menuLoading && !menuError && items.length === 0 && (
        <p style={{ color: "var(--ink-soft)" }}>
          Меню пока пустое. Добавьте позиции в{" "}
          <code>/admin/menu</code>.
        </p>
      )}

      {sections.map((section) => (
        <section key={section.category}>
          <h2 className="section-title">{section.category}</h2>
          {section.items.map((item) => {
            const qty = cart[item.id] || 0;
            return (
              <div className="menu-item" key={item.id}>
                {item.image_url ? (
                  <img className="thumb" src={item.image_url} alt="" />
                ) : (
                  <span className="thumb thumb-empty" aria-hidden="true" />
                )}
                <span className="name">{item.name}</span>
                <span className="leader" />
                <span className="price">{Number(item.price)} с</span>
                <span className="qty-control">
                  {qty > 0 && (
                    <>
                      <button
                        className="qty-btn"
                        onClick={() => changeQty(item.id, -1)}
                        aria-label="Убрать одну порцию"
                      >
                        −
                      </button>
                      <span className="qty-num">{qty}</span>
                    </>
                  )}
                  <button
                    className="qty-btn"
                    onClick={() => changeQty(item.id, 1)}
                    aria-label="Добавить в заказ"
                  >
                    +
                  </button>
                </span>
              </div>
            );
          })}
        </section>
      ))}

      {error && (
        <p style={{ color: "var(--danger)", marginTop: 16 }}>{error}</p>
      )}

      {count > 0 && (
        <div className="cart-bar">
          <div>
            <div className="count">{count} поз.</div>
            <div className="total">{total} с</div>
          </div>
          <button onClick={() => setSheetOpen(true)}>Оформить заказ</button>
        </div>
      )}

      {sheetOpen && (
        <div className="overlay" onClick={() => setSheetOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>Ваш заказ</h2>
            {lines.map((l) => (
              <div className="sheet-row" key={l.item.id}>
                <span>
                  {l.item.name} × {l.qty}
                </span>
                <span>{Number(l.item.price) * l.qty} с</span>
              </div>
            ))}
            <div className="sheet-row" style={{ fontWeight: 600, border: "none" }}>
              <span>Итого</span>
              <span>{total} с</span>
            </div>

            <div className="field-label">Комментарий (необязательно)</div>
            <textarea
              rows={2}
              placeholder="Например: без лука, острее"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            {error && (
              <p style={{ color: "var(--danger)", marginTop: 10, fontSize: 14 }}>
                {error}
              </p>
            )}

            <button
              className="primary-btn"
              onClick={submitOrder}
              disabled={submitting}
            >
              {submitting ? "Отправляем..." : "Подтвердить заказ"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
