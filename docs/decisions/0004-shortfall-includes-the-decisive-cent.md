# 0004 — The reported shortfall includes the cent that makes progress

**Context.** When a payment fails to cover monthly interest the balance never reaches zero, and the UI has to name how much more per month is required; a payment exactly equal to the interest is the subtle case, because it leaves the balance unchanged forever rather than reducing it.

**Decision.** The required payment is monthly interest plus one cent, so `shortfall = monthlyInterest + 1¢ − payment`, and paying exactly the interest is reported as never paying off with a shortfall of one cent.

**Consequence.** The advertised number is guaranteed to work — a property test asserts that adding the shortfall always converts a `never` result into a `paid` one, and that one cent less does not — which matters because this is the single most important figure the app produces and a student may act on it.
