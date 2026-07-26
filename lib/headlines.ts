/**
 * The one-line headline a shared link previews with — the number and the
 * sentence that turn a bare URL into "$1,200 at 22.15% APR takes 4 years to pay
 * off and costs $718."
 *
 * Both the OG image and each page's meta description read from here, so the
 * sentence a crawler sees and the picture it renders always agree. Every field
 * falls back to the calculator's default, so even a hand-mangled URL produces a
 * sensible headline rather than an error.
 */

import { CALCULATORS, type CalculatorId } from './calculators';
import {
  addCents,
  amortize,
  costOfWaiting,
  estimatePaycheck,
  formatDuration,
  formatUSD,
  parseNonNegativeMoney,
  parsePercent,
  payoffMonths,
  ZERO_CENTS,
  type Cents,
} from './finance';

export interface Headline {
  /** Display name of the calculator. */
  readonly calculator: string;
  /** The headline figure, already formatted. */
  readonly value: string;
  /** Semantic tone for the figure. */
  readonly tone: 'ink' | 'cost' | 'gain';
  /** The full sentence, for the meta description and the OG image. */
  readonly sentence: string;
}

type Params = Record<string, string | undefined>;
type Defaults = Record<string, string | undefined>;

function moneyOr(raw: string | undefined, fallback: string | undefined): Cents {
  const parsed = parseNonNegativeMoney(raw ?? '');
  if (parsed.kind === 'valid') return parsed.value;
  const fromDefault = parseNonNegativeMoney(fallback ?? '');
  return fromDefault.kind === 'valid' ? fromDefault.value : ZERO_CENTS;
}

function rateOr(raw: string | undefined, fallback: string | undefined): number {
  const parsed = parsePercent(raw ?? '');
  if (parsed.kind === 'valid') return parsed.value;
  const fromDefault = parsePercent(fallback ?? '');
  return fromDefault.kind === 'valid' ? fromDefault.value : 0;
}

function intOr(raw: string | undefined, fallback: string | undefined): number {
  const value = Math.round(Number(raw));
  if (Number.isFinite(value) && value > 0) return value;
  const fromDefault = Math.round(Number(fallback));
  return Number.isFinite(fromDefault) && fromDefault > 0 ? fromDefault : 1;
}

/** The percentage as it should read in prose: "22.15", "7", "7.5". */
function percentText(raw: string | undefined, fallback: string | undefined): string {
  const source = raw && raw.trim() !== '' ? raw : (fallback ?? '0');
  return String(Number(source));
}

function creditCard(params: Params, d: Defaults): Headline {
  const balance = moneyOr(params.balance, d.balance);
  const annualRate = rateOr(params.apr, d.apr);
  const payment = moneyOr(params.payment, d.payment);
  const apr = percentText(params.apr, d.apr);
  const result = payoffMonths(balance, annualRate, payment);
  const name = CALCULATORS['credit-card'].name;

  if (result.kind === 'never') {
    const required = addCents(payment, result.shortfall);
    return {
      calculator: name,
      value: 'Never pays off',
      tone: 'cost',
      sentence: `At ${formatUSD(payment, { cents: 'auto' })}/month, ${formatUSD(balance, { cents: false })} at ${apr}% APR never gets paid off — you need at least ${formatUSD(required)}/month.`,
    };
  }
  if (result.months === 0) {
    return { calculator: name, value: '$0', tone: 'ink', sentence: 'Nothing owed on this card.' };
  }
  return {
    calculator: name,
    value: formatUSD(result.totalInterest, { cents: false }),
    tone: 'cost',
    sentence: `${formatUSD(balance, { cents: false })} at ${apr}% APR takes ${formatDuration(result.months)} to pay off and costs ${formatUSD(result.totalInterest, { cents: false })} in interest.`,
  };
}

function compound(params: Params, d: Defaults): Headline {
  const monthly = moneyOr(params.monthly, d.monthly);
  const annualReturn = rateOr(params.return, d.return);
  const years = intOr(params.years, d.years);
  const result = costOfWaiting(monthly, annualReturn, years * 12, 120);
  return {
    calculator: CALCULATORS.compound.name,
    value: formatUSD(result.costOfWaiting, { cents: false }),
    tone: 'gain',
    sentence: `Investing ${formatUSD(monthly, { cents: 'auto' })}/month, starting now instead of in ten years is worth ${formatUSD(result.costOfWaiting, { cents: false })} more over ${years} years.`,
  };
}

function loan(params: Params, d: Defaults): Headline {
  const amount = moneyOr(params.amount, d.amount);
  const annualRate = rateOr(params.rate, d.rate);
  const term = intOr(params.term, d.term);
  const rate = percentText(params.rate, d.rate);
  const result = amortize(amount, annualRate, term);
  return {
    calculator: CALCULATORS.loan.name,
    value: `${formatUSD(result.monthlyPayment)}/mo`,
    tone: 'ink',
    sentence: `${formatUSD(amount, { cents: false })} at ${rate}% over ${formatDuration(term)} is ${formatUSD(result.monthlyPayment)}/month and ${formatUSD(result.totalInterest, { cents: false })} in interest.`,
  };
}

function paycheck(params: Params, d: Defaults): Headline {
  const salary = moneyOr(params.salary, d.salary);
  const result = estimatePaycheck(salary);
  const keptPercent = Math.round((1 - result.effectiveRate) * 100);
  return {
    calculator: CALCULATORS.paycheck.name,
    value: formatUSD(result.net, { cents: false }),
    tone: 'gain',
    sentence: `On ${formatUSD(salary, { cents: false })} a year, you take home ${formatUSD(result.net, { cents: false })} — you keep ${keptPercent}%.`,
  };
}

const BUILDERS: Record<CalculatorId, (params: Params, defaults: Defaults) => Headline> = {
  'credit-card': creditCard,
  compound,
  loan,
  paycheck,
};

/** Build the share headline for a calculator from its (possibly partial) URL params. */
export function headlineFor(id: CalculatorId, params: Params): Headline {
  return BUILDERS[id](params, CALCULATORS[id].defaults);
}
