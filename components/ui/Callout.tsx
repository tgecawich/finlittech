import type { ReactNode } from "react";

/**
 * A passage set apart by rules rather than by a box.
 *
 * Used for the states that matter most — chiefly a balance that never pays off.
 * That is not an error message, so it does not get error styling; it gets the
 * most carefully designed state in the app.
 */
export interface CalloutProps {
  children: ReactNode;
  /** Colours the leading rule and the label. */
  tone?: "ink" | "cost" | "gain";
  label?: string;
}

const TONE_RULE = {
  ink: "border-rule",
  cost: "border-cost",
  gain: "border-gain",
} as const;

const TONE_TEXT = {
  ink: "text-ink-muted",
  cost: "text-cost",
  gain: "text-gain",
} as const;

export function Callout({ children, tone = "ink", label }: CalloutProps) {
  return (
    <div className={`border-l-2 ${TONE_RULE[tone]} pl-4`}>
      {label ? (
        <p className={`label-section ${TONE_TEXT[tone]}`}>{label}</p>
      ) : null}
      <div className={label ? "mt-2" : ""}>{children}</div>
    </div>
  );
}
