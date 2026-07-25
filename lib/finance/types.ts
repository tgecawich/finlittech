/**
 * Core domain types and constructors.
 *
 * This module is framework-free by design (CLAUDE.md → Architecture). Nothing
 * under `lib/finance/` may import from `react`, `next`, or anything touching
 * the DOM — the constraint is what keeps this layer testable and liftable into
 * a plain Node script.
 */

// The brand is declared as a `unique symbol` on a const rather than inline in
// the type literal. TypeScript only permits `unique symbol` in a variable
// declaration or a readonly static property, so the inline form
// `number & { readonly __brand: unique symbol }` does not compile.
declare const centsBrand: unique symbol;

/**
 * An integer number of US cents.
 *
 * Money is integer cents everywhere in the domain. Floating-point dollars are a
 * correctness bug in a financial app — `0.1 + 0.2 !== 0.3` — so dollars exist
 * at exactly two boundaries: `toCents()` on the way in, `formatUSD()` on the
 * way out.
 *
 * The brand makes `Cents` structurally incompatible with a plain `number`, so a
 * dollar figure can never be passed where cents are expected.
 */
export type Cents = number & { readonly [centsBrand]: true };

/**
 * An interest rate as a decimal fraction: `0.2215` is 22.15%.
 *
 * Variable names must state the period — `annualRate`, `monthlyRate`, never
 * bare `rate`. A rate whose period is ambiguous is a bug waiting to happen.
 */
export type Rate = number;

/** A whole number of months. */
export type Months = number;

/**
 * Largest magnitude representable without losing integer precision.
 * `Number.MAX_SAFE_INTEGER` cents is roughly $90 trillion, so this bound only
 * ever fires on genuinely broken input.
 */
export const MAX_CENTS = Number.MAX_SAFE_INTEGER;

/**
 * The single place in the codebase where the `Cents` brand is applied.
 *
 * A branded type cannot be constructed without exactly one assertion somewhere;
 * the design goal is that there is precisely one, it is unexported, and every
 * path to it validates first. ESLint forbids `as Cents` everywhere else
 * (see eslint.config.mjs), so this function is the enforced chokepoint.
 */
function brand(value: number): Cents {
  return value as Cents;
}

/**
 * Round half away from zero — the convention used throughout the domain.
 *
 * "Half up" is ambiguous for negative values. This implementation rounds ties
 * away from zero, so `-0.5 → -1` and `0.5 → 1`, which gives the useful symmetry
 * `round(-x) === -round(x)`. `Math.round` alone rounds ties toward positive
 * infinity (`Math.round(-0.5) === -0`) and would break that symmetry, making a
 * refund behave differently from a charge of the same size.
 *
 * See docs/decisions/0001-rounding-convention.md.
 */
export function roundHalfAwayFromZero(value: number): number {
  const rounded = value < 0 ? -Math.round(-value) : Math.round(value);
  // Normalise -0, which would otherwise format as "-$0.00".
  return rounded === 0 ? 0 : rounded;
}

/**
 * Discard floating-point representation noise before rounding.
 *
 * A double carries just under 16 significant decimal digits, so re-reading a
 * value at 15 recovers the decimal the programmer actually wrote. Without this,
 * `1.005 * 100` is `100.49999999999999` and `toCents(1.005)` would yield 100
 * rather than 101 — the classic money-rounding bug, arrived at honestly.
 */
function shedFloatNoise(value: number): number {
  return Number(value.toPrecision(15));
}

/**
 * Convert dollars to `Cents`, rounding half away from zero.
 *
 * Exact for any amount up to 15 significant digits — roughly $10 trillion,
 * which is eleven orders of magnitude beyond anything this app will see. Past
 * that, the noise-shedding step that makes `toCents(1.005)` correct costs the
 * final digit. {@link centsFromInteger} has no such limit, because it never
 * scales through a float.
 *
 * Throws on non-finite or out-of-range input, because that means a caller is
 * broken and silently returning a plausible number would be worse than
 * crashing (CLAUDE.md → Error handling).
 */
export function toCents(dollars: number): Cents {
  if (typeof dollars !== 'number' || !Number.isFinite(dollars)) {
    throw new RangeError(
      `toCents: expected a finite number of dollars, received ${String(dollars)}`,
    );
  }

  const rounded = roundHalfAwayFromZero(shedFloatNoise(dollars * 100));

  if (!Number.isSafeInteger(rounded)) {
    throw new RangeError(
      `toCents: ${dollars} dollars exceeds the representable range of +/-${MAX_CENTS} cents`,
    );
  }

  return brand(rounded);
}

/**
 * Construct `Cents` from a value that is already an integer count of cents.
 *
 * This is the constructor the domain's own arithmetic uses. It validates rather
 * than asserts: a non-integer reaching this point means a calculation skipped
 * its rounding step, which is exactly the bug the branded type exists to catch.
 */
export function centsFromInteger(value: number): Cents {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(
      `centsFromInteger: expected a safe integer number of cents, received ${String(value)}`,
    );
  }
  // `value === 0` is true for -0, so this also normalises negative zero.
  return brand(value === 0 ? 0 : value);
}

/** Zero dollars. */
export const ZERO_CENTS: Cents = centsFromInteger(0);

/** One cent — the granularity of the domain, and the minimum useful payment. */
export const ONE_CENT: Cents = centsFromInteger(1);

/**
 * Validate an annual rate expressed as a decimal fraction.
 *
 * The upper bound catches the most common caller error by far: passing `22.15`
 * where `0.2215` was meant. A rate above 100% APR is out of scope for this app
 * (CLAUDE.md → Error handling).
 */
export function assertAnnualRate(annualRate: Rate): void {
  if (typeof annualRate !== 'number' || !Number.isFinite(annualRate)) {
    throw new RangeError(
      `assertAnnualRate: expected a finite rate, received ${String(annualRate)}`,
    );
  }
  if (annualRate < 0 || annualRate > 1) {
    throw new RangeError(
      `assertAnnualRate: expected a decimal fraction between 0 and 1, received ${annualRate}. ` +
        // Noise-shed so the hint reads "0.2215" rather than the raw double
        // 0.22149999999999997, which would undermine the advice it is giving.
        `An APR of ${annualRate}% should be passed as ${shedFloatNoise(annualRate / 100)}.`,
    );
  }
}

/**
 * Convert an annual rate to the monthly rate used by every period-by-period
 * simulation in this domain.
 *
 * This is the nominal rate divided by 12, which is how US card issuers and
 * lenders compute a monthly periodic rate — not the effective-rate conversion
 * `(1 + annual)^(1/12) - 1`. Matching the issuer's arithmetic matters more than
 * matching the textbook here, because the number has to agree with a statement.
 */
export function toMonthlyRate(annualRate: Rate): Rate {
  assertAnnualRate(annualRate);
  return annualRate / 12;
}
