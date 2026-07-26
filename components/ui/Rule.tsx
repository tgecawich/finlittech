/**
 * A hairline.
 *
 * Separation in this design comes from whitespace and rules, never from cards
 * or boxes. If you find yourself wanting a border on four sides, the layout is
 * fighting the design rather than using it.
 */
export function Rule({ className = "" }: { className?: string }) {
  return <hr className={`border-0 border-t border-rule ${className}`} />;
}
