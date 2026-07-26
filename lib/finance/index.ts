/**
 * Public API surface of the finance domain.
 *
 * Components import from here, never from a module inside the directory. That
 * keeps the internal layout free to change and makes the boundary between
 * "does arithmetic on money" and "renders" a single import away from obvious.
 */

export {
  MAX_CENTS,
  ONE_CENT,
  ZERO_CENTS,
  assertAnnualRate,
  centsFromInteger,
  roundHalfAwayFromZero,
  toCents,
  toMonthlyRate,
  type Cents,
  type Months,
  type Rate,
} from './types';

export {
  addCents,
  compareCents,
  formatCompactUSD,
  formatDuration,
  formatUSD,
  maxCents,
  minCents,
  multiplyCentsByRate,
  negateCents,
  subtractCents,
  sumCents,
  toDollars,
  type FormatUSDOptions,
} from './money';

export { payoffMonths, type PayoffResult, type Period } from './credit-card';

export {
  costOfWaiting,
  projectSavings,
  type CompoundPoint,
  type WaitingCostResult,
} from './compound';

export {
  MAX_INPUT_APR_PERCENT,
  MAX_INPUT_DOLLARS,
  parseMoney,
  parseNonNegativeMoney,
  parsePercent,
  type MoneyParseResult,
  type RateParseResult,
} from './parse';

export {
  DEFAULT_CREDIT_CARD_APR,
  DEFAULT_CREDIT_CARD_APR_AS_OF,
  MINIMUM_PAYMENT_BALANCE_FRACTION,
  MINIMUM_PAYMENT_FLOOR,
} from './constants';
