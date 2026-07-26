"use client";

import { errorId, hintId } from "./Field";

/**
 * A text input for a money amount.
 *
 * Deliberately holds a raw string and reports a raw string. It does no parsing
 * of its own — `parseMoney` in the domain does that, under test — so this stays
 * a rendering concern and no unvalidated string ever reaches a calculation.
 *
 * `inputMode="decimal"` gets the numeric keypad on a phone without the spinner
 * and scroll-to-change behaviour of `type="number"`, which is hostile on mobile
 * and silently rejects "1,200" anyway.
 */
export interface MoneyInputProps {
  id: string;
  value: string;
  onValueChange: (raw: string) => void;
  /** Rendered inside the field, before the value. */
  prefix?: string;
  /** Rendered inside the field, after the value. */
  suffix?: string;
  placeholder?: string;
  hasHint?: boolean;
  hasError?: boolean;
}

export function MoneyInput({
  id,
  value,
  onValueChange,
  prefix,
  suffix,
  placeholder,
  hasHint = false,
  hasError = false,
}: MoneyInputProps) {
  const describedBy =
    [hasHint ? hintId(id) : null, hasError ? errorId(id) : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div
      // --rule is 1.49:1 against paper, which is right for a decorative
      // separator and wrong for a control boundary: WCAG 1.4.11 wants 3:1 for
      // the visual information that identifies a component. --ink-muted is
      // 6.33:1 and still reads as a hairline.
      className={`flex items-baseline gap-1 border-b ${
        hasError ? "border-cost" : "border-ink-muted"
      } focus-within:border-ink transition-colors duration-150`}
    >
      {prefix ? (
        <span aria-hidden="true" className="figure-secondary text-ink-muted">
          {prefix}
        </span>
      ) : null}
      <input
        id={id}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        aria-describedby={describedBy}
        aria-invalid={hasError || undefined}
        // A suffix has to sit against the value to read as a unit ("22.15%"),
        // so the field sizes to its content. A prefix does not, and a full-width
        // field there gives a much larger tap target.
        size={suffix ? Math.max(value.length, 1) : undefined}
        className={`figure-secondary ${
          // field-sizing tracks the text exactly; the size attribute above is
          // the fallback where it is unsupported, and is only ever a shade wide.
          suffix ? "w-auto [field-sizing:content]" : "w-full"
        // No outline-none here. The global :focus-visible rule draws the
        // --focus ring, which is the only focus indicator strong enough to
        // satisfy 2.4.7 — the border darkening below is a supplement, not a
        // replacement.
        } bg-transparent py-2 text-ink placeholder:text-ink-muted`}
      />
      {suffix ? (
        <span aria-hidden="true" className="figure-secondary text-ink-muted">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}
