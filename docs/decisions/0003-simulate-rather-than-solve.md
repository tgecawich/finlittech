# 0003 — Simulate the payoff month by month rather than solving it

**Context.** The number of payments on a declining balance has a closed form, `n = -log(1 - Bi/P) / log(1 + i)`, which is one line and instant, whereas simulating is a loop over up to a few hundred iterations.

**Decision.** The domain simulates month by month, because the UI needs the full schedule for the chart anyway, the loop is verifiable by reading it, and the closed form silently disagrees with a real statement — it accrues fractional cents that no issuer can post.

**Consequence.** The closed form is still valuable as an *independent* test oracle, since it is a genuinely different algorithm, but it is only a fair comparison when monthly interest is well above a cent; the tests state that precondition explicitly rather than loosening the tolerance until it passes.
