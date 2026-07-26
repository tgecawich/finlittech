import type { ReactNode } from "react";

/**
 * A rendered figure — the thing the whole app exists to show.
 *
 * Takes an already-formatted string. Formatting money is the domain's job via
 * `formatUSD`, and a component that did its own would be doing arithmetic.
 */
export interface FigureProps {
  /** The formatted value, e.g. "$1,200.00". */
  children: ReactNode;
  /** Small label above the figure. */
  label?: string;
  /** Clarifying line below, e.g. "at 22.15% APR". */
  note?: ReactNode;
  /**
   * Semantic colour. `cost` is money lost, `gain` is money kept. Default `ink`
   * is for neutral figures like a duration.
   */
  tone?: "ink" | "cost" | "gain";
  /** `primary` is the hero numeral; `secondary` is a supporting figure. */
  size?: "primary" | "secondary";
}

const TONE_CLASS = {
  ink: "text-ink",
  cost: "text-cost",
  gain: "text-gain",
} as const;

export function Figure({
  children,
  label,
  note,
  tone = "ink",
  size = "primary",
}: FigureProps) {
  return (
    <div>
      {label ? <p className="label-section">{label}</p> : null}
      <p
        className={`${size === "primary" ? "figure-primary" : "figure-secondary"} ${TONE_CLASS[tone]} ${label ? "mt-2" : ""}`}
      >
        {children}
      </p>
      {note ? <p className="caption mt-2">{note}</p> : null}
    </div>
  );
}
