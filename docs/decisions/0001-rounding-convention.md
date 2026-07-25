# 0001 — Interest rounds half away from zero, once per period

**Context.** Interest on a real balance is almost never a whole number of cents, so every schedule needs a rounding rule, and "round half up" is ambiguous for negative amounts — JavaScript's `Math.round` rounds ties toward positive infinity, which makes `Math.round(-0.5)` equal `-0`.

**Decision.** Interest is rounded to a whole cent at the close of each period, before it is added to the balance, and ties round away from zero so that `round(-x) === -round(x)`.

**Consequence.** Schedules sum exactly and a refund rounds to the same magnitude as an equivalent charge, but the simulation now legitimately disagrees with the continuous closed-form formula — most visibly when a month's interest rounds to under a cent, where the balance behaves as interest-free and pays off sooner than the formula predicts.
