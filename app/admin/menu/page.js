"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Logo from "@/components/Logo";
import PasscodeGate from "@/components/PasscodeGate";

const PASSCODE = process.env.NEXT_PUBLIC_STAFF_PASSCODE;

export default function AdminMenuPage() {
  const [unlocked, setUnlocked] = useState(!PASSCODE);

  if (!unlocked) {
    return <PasscodeGate onUnlock={() => setUnlocked(true)} />;
  }
  return <MenuManager />;
}

function MenuManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayOrdersCount, setTodayOrdersCount] = useState(0);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ category: "", name: "", price: "" });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const perItemFileInputs = useRef({});
  const [photoUploadingId, setPhotoUploadingId] = useState(null);

  async function loadItems() {
    setLoading(true);
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) {
      setError(error.message);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  }

  async function loadTodayRevenue() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("orders")
      .select("total")
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString());

    if (error) {
      setError(error.message);
      return;
    }

    const orders = data || [];
    const revenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    setTodayRevenue(revenue);
    setTodayOrdersCount(orders.length);
  }

  useEffect(() => {
    loadItems();
    loadTodayRevenue();
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category))),
    [items]
  );

  const grouped = useMemo(() => {
    const map = new Map();
    for (const item of items) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category).push(item);
    }
    return Array.from(map.entries());
  }, [items]);

  async function uploadPhoto(fileToUpload) {
    const safeName = fileToUpload.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const path = `${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("menu-images")
      .upload(path, fileToUpload, { cacheControl: "3600", upsert: false });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("menu-images").getPublicUrl(path);
    return data.publicUrl;
  }

  async function addItem(e) {
    e.preventDefault();
    if (!form.category.trim() || !form.name.trim() || !form.price) return;
    setSaving(true);
    setError("");
    try {
      let imageUrl = null;
      if (file) {
        imageUrl = await uploadPhoto(file);
      }
      const { error: insertError } = await supabase.from("menu_items").insert({
        category: form.category.trim(),
        name: form.name.trim(),
        price: Number(form.price),
        image_url: imageUrl,
        sort_order: 999,
      });
      if (insertError) throw insertError;
      setForm({ category: "", name: "", price: "" });
      setFile(null);
      await loadItems();
    } catch (err) {
      setError(err.message || "Не удалось добавить позицию");
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoChangeForItem(item, selectedFile) {
    if (!selectedFile) return;
    setPhotoUploadingId(item.id);
    setError("");
    try {
      const imageUrl = await uploadPhoto(selectedFile);
      const { error: updateError } = await supabase
        .from("menu_items")
        .update({ image_url: imageUrl })
        .eq("id", item.id);
      if (updateError) throw updateError;
      await loadItems();
    } catch (err) {
      setError(err.message || "Не удалось загрузить фото");
    } finally {
      setPhotoUploadingId(null);
    }
  }

  async function toggleAvailable(item) {
    const { error: updateError } = await supabase
      .from("menu_items")
      .update({ is_available: !item.is_available })
      .eq("id", item.id);
    if (updateError) setError(updateError.message);
    else loadItems();
  }

  async function deleteItem(item) {
    if (!confirm(`Удалить «${item.name}»?`)) return;
    const { error: deleteError } = await supabase
      .from("menu_items")
      .delete()
      .eq("id", item.id);
    if (deleteError) setError(deleteError.message);
    else loadItems();
  }

  return (
    <main className="page" style={{ maxWidth: 720 }}>
      <div className="brand">
        <Logo />
        <span className="tag">меню и фото</span>
      </div>

      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

      <div className="admin-section">
        <h2 className="section-title">Выручка сегодня</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 14,
              padding: "12px 16px",
              minWidth: 160,
              flex: 1,
            }}
          >
            <div style={{ color: "var(--ink-soft)", fontSize: 12 }}>Сумма</div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>
              {todayRevenue.toLocaleString("ru-RU")} с
            </div>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 14,
              padding: "12px 16px",
              minWidth: 160,
              flex: 1,
            }}
          >
            <div style={{ color: "var(--ink-soft)", fontSize: 12 }}>Заказов</div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>
              {todayOrdersCount}
            </div>
          </div>
        </div>
      </div>

      <div className="admin-section">
        <h2 className="section-title">Добавить позицию</h2>
        <form className="admin-form" onSubmit={addItem}>
          <div className="row2">
            <div>
              <div className="field-label" style={{ marginTop: 0 }}>
                Категория
              </div>
              <input
                type="text"
                list="category-options"
                placeholder="Например: Кофе"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
              <datalist id="category-options">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <div className="field-label" style={{ marginTop: 0 }}>
                Цена, с
              </div>
              <input
                type="text"
                inputMode="numeric"
                placeholder="180"
                value={form.price}
                onChange={(e) =>
                  setForm({ ...form, price: e.target.value.replace(/[^\d.]/g, "") })
                }
              />
            </div>
          </div>
          <div>
            <div className="field-label" style={{ marginTop: 0 }}>
              Название
            </div>
            <input
              type="text"
              placeholder="Капучино"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <label className="file-input-label">
            📷 {file ? file.name : "Добавить фото (необязательно)"}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <button className="primary-btn" type="submit" disabled={saving} style={{ marginTop: 0 }}>
            {saving ? "Сохраняем..." : "Добавить в меню"}
          </button>
        </form>
      </div>

      <div className="admin-section">
        <h2 className="section-title">Текущее меню</h2>
        {loading && <p style={{ color: "var(--ink-soft)" }}>Загружаем…</p>}
        {!loading && items.length === 0 && (
          <p style={{ color: "var(--ink-soft)" }}>Пока пусто — добавьте первую позицию выше.</p>
        )}
        {grouped.map(([category, list]) => (
          <div key={category} style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: 15, color: "var(--ink-soft)", fontWeight: 600, marginBottom: 4 }}>
              {category}
            </h3>
            {list.map((item) => (
              <div className="admin-item-row" key={item.id}>
                {item.image_url ? (
                  <img className="thumb" src={item.image_url} alt="" />
                ) : (
                  <span className="thumb" />
                )}
                <div className="info">
                  <div>{item.name}</div>
                  <div className="price">{Number(item.price)} с</div>
                </div>
                <div className="row-actions">
                  {!item.is_available && (
                    <span className="badge-unavailable">скрыто</span>
                  )}
                  <label className="small-btn">
                    {photoUploadingId === item.id ? "..." : "Фото"}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) =>
                        handlePhotoChangeForItem(item, e.target.files?.[0])
                      }
                    />
                  </label>
                  <button className="small-btn" onClick={() => toggleAvailable(item)}>
                    {item.is_available ? "Скрыть" : "Показать"}
                  </button>
                  <button className="small-btn danger" onClick={() => deleteItem(item)}>
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}
