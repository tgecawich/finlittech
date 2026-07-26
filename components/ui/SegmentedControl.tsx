"use client";

import { useRef } from "react";

/**
 * A small set of mutually exclusive choices, rendered as text separated by
 * whitespace rather than as a pill group — boxes are not in this design's
 * vocabulary. Used where free text would be overkill, like a savings horizon.
 *
 * Implements the ARIA radiogroup keyboard contract: a roving tabindex (only the
 * selected option is in the tab order) and arrow / Home / End keys to move the
 * selection, which is what a keyboard user expects here and what Lighthouse's
 * automated pass does not check for.
 */
export interface SegmentedControlProps<T extends string | number> {
  /** Accessible name for the group. */
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /**
   * `figure` (default) sets options in the large serif, right for short numeric
   * labels like "40y". `text` uses body sans, right for words like "Every 2
   * weeks" that would wrap at figure size.
   */
  size?: "figure" | "text";
}

export function SegmentedControl<T extends string | number>({
  label,
  options,
  value,
  onChange,
  size = "figure",
}: SegmentedControlProps<T>) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  function selectAt(index: number) {
    const wrapped = (index + options.length) % options.length;
    const option = options[wrapped];
    if (option === undefined) return;
    onChange(option.value);
    buttons.current[wrapped]?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        selectAt(index + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        selectAt(index - 1);
        break;
      case "Home":
        event.preventDefault();
        selectAt(0);
        break;
      case "End":
        event.preventDefault();
        selectAt(options.length - 1);
        break;
      default:
        break;
    }
  }

  const typeClass = size === "figure" ? "figure-secondary" : "text-lg font-medium";

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`flex items-baseline ${size === "figure" ? "gap-5" : "gap-6"}`}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={String(option.value)}
            ref={(element) => {
              buttons.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={index === selectedIndex ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            // No opacity on the unselected state: opacity over --ink-muted drops
            // it below the contrast minimum. Full --ink-muted (6.33:1) already
            // reads as secondary next to --ink.
            className={`${typeClass} whitespace-nowrap transition-colors duration-150 ${
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
