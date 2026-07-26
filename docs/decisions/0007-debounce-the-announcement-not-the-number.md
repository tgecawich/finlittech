# 0007 — Debounce the announcement, not the number

**Context.** The brief asked for results that update as you type, debounced. But the calculation is a pure function over a few hundred integer operations and completes in microseconds, so debouncing the visible figure would add latency to something that has none and make a fast page feel slow.

**Decision.** The figure updates synchronously on every keystroke; only the `aria-live` region is debounced, by 700ms, because a live region that fires on each character is genuinely unusable with a screen reader.

**Consequence.** Sighted users get an instant response and screen reader users get one coherent sentence per pause instead of a stream of fragments — the delay is applied where the actual problem was, though it does mean the announced text can lag the visible figure by up to 700ms.
