# 0010 — Tax constants are dated, cited, and tripwired

**Context.** Tax brackets, the standard deduction, the Social Security wage base, and state figures change every year, and a finance tool that silently keeps last year's numbers is worse than one that admits it is out of date.

**Decision.** Every payroll figure lives in `constants.ts` with a source URL and belongs to a single `TAX_YEAR = 2026`, verified against the IRS tax-year-2026 release and RI Division of Taxation advisory ADV 2025-22; a test asserts `TAX_YEAR` is not older than the current calendar year.

**Consequence.** The build goes red on 1 January of the year after the constants were last refreshed, forcing a review against the new figures rather than letting them rot — the same discipline already applied to the credit-card APR vintage.
