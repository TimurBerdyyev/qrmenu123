import Link from "next/link";
import Logo from "@/components/Logo";

export default function Home() {
  return (
    <main className="page">
      <div className="brand">
        <Logo size={34} />
        <span className="tag">для персонала</span>
      </div>

      <p style={{ color: "var(--ink-soft)", lineHeight: 1.6 }}>
        Гости попадают в меню, отсканировав QR-код на столе — им сюда
        заходить не нужно. Здесь — служебные страницы.
      </p>

      <h2 className="section-title">Монитор кухни / бара</h2>
      <p style={{ color: "var(--ink-soft)" }}>
        Откройте на планшете или мониторе за стойкой — заказы появляются
        живьём.
      </p>
      <Link href="/kitchen" className="ghost-btn" style={{ display: "inline-block", marginTop: 10 }}>
        Открыть монитор →
      </Link>

      <h2 className="section-title">Меню и фото блюд</h2>
      <p style={{ color: "var(--ink-soft)" }}>
        Добавляйте позиции, цены и фотографии — гости увидят изменения сразу.
      </p>
      <Link href="/admin/menu" className="ghost-btn" style={{ display: "inline-block", marginTop: 10 }}>
        Редактировать меню →
      </Link>

      <h2 className="section-title">QR-коды для столов</h2>
      <p style={{ color: "var(--ink-soft)" }}>
        Сгенерируйте и распечатайте таблички со своими QR-кодами.
      </p>
      <Link href="/admin/qr" className="ghost-btn" style={{ display: "inline-block", marginTop: 10 }}>
        Сгенерировать QR-коды →
      </Link>
    </main>
  );
}
