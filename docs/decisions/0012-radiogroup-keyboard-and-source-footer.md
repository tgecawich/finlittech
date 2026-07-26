# 0012 — The segmented control is a real radiogroup, and the footer cites every default

**Context.** Lighthouse's automated accessibility pass scored 100 while two things it cannot check were still wrong: the `SegmentedControl` claimed `role="radiogroup"` but had no arrow-key navigation or roving tabindex, and the footer cited only the credit-card APR even though the paycheck tool ships a dozen tax constants as defaults.

**Decision.** The segmented control now implements the ARIA radiogroup keyboard contract (roving tabindex, arrow/Home/End keys that move selection and focus together) and gained a `text` size so word labels like "Every 2 weeks" set in sans rather than wrapping at figure size; the footer takes a calculator id and lists that calculator's defaults with their sources, read from the constants so a citation cannot drift, and an illustrative default is labelled an assumption rather than given a false authority.

**Consequence.** Keyboard users get the interaction the role promises, and every number the app shows by default is traceable to the IRS, SSA, Rhode Island Division of Taxation, or the Federal Reserve — or is honestly marked as an estimate.
