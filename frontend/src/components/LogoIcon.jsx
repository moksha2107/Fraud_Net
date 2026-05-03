/**
 * FraudNet custom shield+F logo.
 * Use color="#000" (or any dark hex) on bright-background boxes,
 * or color="#00ff88" on dark backgrounds.
 */
export default function LogoIcon({ size = 24, color = 'currentColor' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="FraudNet logo"
    >
      {/* Shield outline */}
      <path
        d="M12 2L4 6v5c0 5.25 3.6 10.15 8 11.35C16.4 21.15 20 16.25 20 11V6L12 2Z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="none"
      />
      {/* F letterform inside the shield */}
      <path
        d="M9.5 8.5h5M9.5 8.5v7M9.5 12.5h4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
