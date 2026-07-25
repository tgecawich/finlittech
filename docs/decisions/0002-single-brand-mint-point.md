# 0002 — One unexported mint point for the `Cents` brand

**Context.** A branded type cannot be constructed without at least one type assertion somewhere, but the project bans `as Cents` outright, and arithmetic on `Cents` has to produce `Cents` without laundering values through a cast at every call site.

**Decision.** A single unexported `brand()` function in `lib/finance/types.ts` holds the only assertion in the codebase; every path to it — `toCents()` for dollar input, `centsFromInteger()` for domain arithmetic — validates first, and an ESLint `no-restricted-syntax` rule fails the build on `as Cents` anywhere except that one file.

**Consequence.** The invariant is enforced mechanically rather than by review, at the cost of one deliberate assertion and a second constructor that the original spec did not anticipate; `centsFromInteger` throwing on a fractional value also turns "a calculation skipped its rounding step" into a loud failure instead of a silent sub-cent balance.
