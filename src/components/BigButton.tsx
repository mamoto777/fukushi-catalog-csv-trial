import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface Props {
  children: ReactNode;
  to?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  selected?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}

/** 大型タップボタン(最小48px)。to があれば Link、なければ button として描画する */
export default function BigButton({
  children,
  to,
  onClick,
  variant = "primary",
  selected = false,
  disabled = false,
  ariaLabel,
}: Props) {
  const className = [
    "big-button",
    `big-button--${variant}`,
    selected ? "big-button--selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (to) {
    return (
      <Link to={to} className={className} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={selected || undefined}
    >
      {children}
    </button>
  );
}
