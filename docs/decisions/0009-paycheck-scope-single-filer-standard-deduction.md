# 0009 — The paycheck estimate is single-filer, standard-deduction only

**Context.** A full withholding engine would need filing status, pre-tax deductions, credits, other income, itemizing, and the IRS Publication 15-T per-payperiod tables — a large surface for an audience of students who mostly have one summer or part-time job and no dependents.

**Decision.** v1 estimates a single filer taking the standard deduction with no other income, computing the year-end liability (federal marginal tax, FICA with the wage-base cap and Additional Medicare surtax, and Rhode Island tax) rather than per-payperiod withholding, and it does not model the Rhode Island standard-deduction phase-out, which only affects incomes above ~$261,000.

**Consequence.** The number is accurate for the common case and honest about its assumptions in the UI hint and a docs note, but it will diverge for married filers, high earners in the phase-out band, or anyone with pre-tax deductions — additions that are deliberately deferred, not overlooked.
