import { describe, expect, it } from 'vitest';

import { headlineFor } from '@/lib/headlines';
import { CALCULATORS } from '@/lib/calculators';

describe('headlineFor — credit card', () => {
  it('describes a balance that pays off', () => {
    const h = headlineFor('credit-card', { balance: '1200', apr: '22.15', payment: '100' });
    expect(h.calculator).toBe('Credit card');
    expect(h.tone).toBe('cost');
    expect(h.value).toMatch(/^\$\d/);
    expect(h.sentence).toContain('$1,200 at 22.15% APR');
    expect(h.sentence).toMatch(/costs \$\d+ in interest/);
  });

  it('describes a balance that never pays off', () => {
    const h = headlineFor('credit-card', { balance: '3000', apr: '24', payment: '20' });
    expect(h.value).toBe('Never pays off');
    expect(h.sentence).toContain('never gets paid off');
    expect(h.sentence).toMatch(/you need at least \$\d/);
  });
});

describe('headlineFor — the other three', () => {
  it('compound reports the cost of waiting in --gain', () => {
    const h = headlineFor('compound', { monthly: '100', return: '7', years: '40' });
    expect(h.calculator).toBe('Compound interest');
    expect(h.tone).toBe('gain');
    expect(h.sentence).toContain('starting now instead of in ten years');
    expect(h.sentence).toContain('over 40 years');
  });

  it('loan reports a monthly payment', () => {
    const h = headlineFor('loan', { amount: '18000', rate: '7.5', term: '60' });
    expect(h.value).toMatch(/\/mo$/);
    expect(h.sentence).toContain('$18,000 at 7.5% over 5 years');
    expect(h.sentence).toMatch(/in interest\.$/);
  });

  it('paycheck reports take-home and the kept percentage', () => {
    const h = headlineFor('paycheck', { salary: '45000', freq: '26' });
    expect(h.tone).toBe('gain');
    expect(h.sentence).toMatch(/take home \$[\d,]+ — you keep \d+%/);
  });
});

describe('headlineFor — robustness', () => {
  it('falls back to defaults for missing params, so a bare link still previews', () => {
    for (const id of Object.keys(CALCULATORS) as (keyof typeof CALCULATORS)[]) {
      const h = headlineFor(id, {});
      expect(h.calculator).toBe(CALCULATORS[id].name);
      expect(h.sentence.length).toBeGreaterThan(0);
    }
  });

  it('falls back to defaults for a garbage param rather than throwing', () => {
    // A hand-mangled URL that survives cleaning but is not a number.
    const h = headlineFor('credit-card', { balance: '...', apr: '', payment: '-' });
    expect(h.sentence).toContain('$1,200 at 22.15% APR');
  });

  it('matches the default scenario exactly when given no params', () => {
    // The default credit-card sentence is the spec's canonical example.
    const h = headlineFor('credit-card', {});
    expect(h.sentence).toBe(
      '$1,200 at 22.15% APR takes 4 years 7 months to pay off and costs $718 in interest.',
    );
  });
});
