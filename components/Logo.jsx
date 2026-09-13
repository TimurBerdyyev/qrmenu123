export default function Logo({ variant = "light", size = 28 }) {
  const ink = variant === "dark" ? "#f2ede1" : "#211d16";
  const accent = "#b5792b";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        lineHeight: 1,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* чашка */}
        <path
          d="M10 20h22v10a11 11 0 0 1-11 11v0a11 11 0 0 1-11-11V20Z"
          stroke={ink}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        {/* ручка */}
        <path
          d="M32 23h3.5a4.5 4.5 0 0 1 0 9H32"
          stroke={ink}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        {/* пар — акцентный цвет, единственный цветной элемент */}
        <path
          d="M17 14c1.5-2 1.5-3.5 0-5.5M23 14c1.5-2 1.5-3.5 0-5.5"
          stroke={accent}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
      <span
        style={{
          fontFamily: "var(--font-display), serif",
          fontWeight: 600,
          fontSize: size * 0.75,
          color: ink,
          letterSpacing: "-0.01em",
        }}
      >
        nerbe
      </span>
    </span>
  );
}
