/**
 * One place that knows each calculator's URL parameters and default scenario.
 *
 * The components, the URL codec, the share headlines, and the OG image all read
 * from here, so a default or a param name is defined once. Framework-free on
 * purpose — the OG route and the client components both import it.
 */

import { DEFAULT_CREDIT_CARD_APR } from './finance';

export type CalculatorId = 'credit-card' | 'compound' | 'loan' | 'paycheck';

export interface CalculatorConfig {
  /** Display name, e.g. for the OG image and page titles. */
  readonly name: string;
  /** Query-string parameter names, in stable order. */
  readonly keys: readonly string[];
  /** Default value for each key, as a clean numeric string. */
  readonly defaults: Readonly<Record<string, string>>;
}

export const CALCULATORS: Readonly<Record<CalculatorId, CalculatorConfig>> = {
  'credit-card': {
    name: 'Credit card',
    keys: ['balance', 'apr', 'payment'],
    defaults: {
      balance: '1200',
      // Mirrors DEFAULT_CREDIT_CARD_APR so the default can never drift from the
      // cited constant.
      apr: (DEFAULT_CREDIT_CARD_APR * 100).toFixed(2),
      payment: '35',
    },
  },
  compound: {
    name: 'Compound interest',
    keys: ['monthly', 'return', 'years'],
    defaults: { monthly: '100', return: '7', years: '40' },
  },
  loan: {
    name: 'Loan',
    keys: ['amount', 'rate', 'term'],
    defaults: { amount: '18000', rate: '7.5', term: '60' },
  },
  paycheck: {
    name: 'Paycheck',
    keys: ['salary', 'freq'],
    defaults: { salary: '45000', freq: '26' },
  },
};

/** True when `id` names a real calculator — the guard the OG route needs. */
export function isCalculatorId(id: string): id is CalculatorId {
  return Object.prototype.hasOwnProperty.call(CALCULATORS, id);
}

/**
 * A calculator's default for a key, as a definite string. The keys always
 * exist; this exists only so callers get a `string` rather than fighting
 * `noUncheckedIndexedAccess` at every use site.
 */
export function calcDefault(id: CalculatorId, key: string): string {
  return CALCULATORS[id].defaults[key] ?? '';
}
