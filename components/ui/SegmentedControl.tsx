"use client";

/**
 * A small set of mutually exclusive choices, rendered as text separated by
 * rules rather than as a pill group — boxes are not in this design's
 * vocabulary. Used where free text would be overkill, like a savings horizon.
 */
export interface SegmentedControlProps<T extends string | number> {
  /** Accessible name for the group. */
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-baseline gap-5">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            // No opacity on the unselected state: opacity over --ink-muted
            // drops it to ~2.6:1, under the 3:1 large-text minimum. Full
            // --ink-muted (6.33:1) already reads as secondary next to --ink.
            className={`figure-secondary transition-colors duration-150 ${
              selected ? "text-ink" : "text-ink-muted hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
