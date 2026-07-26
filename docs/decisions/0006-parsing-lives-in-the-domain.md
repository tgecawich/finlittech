# 0006 — Input parsing lives in the domain, not in the input component

**Context.** The brief said the `MoneyInput` component should parse "1,200", "$1200" and "1200.00" and that raw string state must never reach `lib/finance`, but parsing money rounds, validates, and has a long tail of edge cases — "$", "-", "1.2.3", a four-hundred-digit number — which is exactly the kind of code that needs tests, and components are required to contain no logic.

**Decision.** `parseMoney`, `parseNonNegativeMoney` and `parsePercent` live in `lib/finance/parse.ts`, return discriminated unions rather than throwing, and are the only place a typed string becomes `Cents`; `MoneyInput` holds a raw string and reports a raw string, doing no interpretation of its own.

**Consequence.** The intent behind the original rule is met more strongly than the letter of it — no unvalidated value reaches a calculation, and the compiler enforces it because the calculator has to narrow a union before it can call `payoffMonths` — at the cost of `lib/finance` having one module that accepts a string.
