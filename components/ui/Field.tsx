import type { ReactNode } from "react";

/**
 * A labelled form control.
 *
 * Always a real `<label>` bound to the control by id. Placeholder-as-label is
 * an anti-pattern: the placeholder disappears the moment someone types, so the
 * field loses its name exactly when the value needs checking.
 */
export interface FieldProps {
  /** Must match the control's id. */
  htmlFor: string;
  label: string;
  /** Persistent helper text. Rendered before any error. */
  hint?: ReactNode;
  /** Validation message. Announced, and referenced by aria-describedby. */
  error?: string;
  children: ReactNode;
}

/** Id conventions so the control and its descriptions stay wired together. */
export const hintId = (id: string) => `${id}-hint`;
export const errorId = (id: string) => `${id}-error`;

export function Field({ htmlFor, label, hint, error, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label-section block">
        {label}
      </label>
      <div className="mt-2">{children}</div>
      {hint ? (
        <p id={hintId(htmlFor)} className="caption mt-2">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId(htmlFor)} className="caption mt-2 text-cost">
          {error}
        </p>
      ) : null}
    </div>
  );
}
