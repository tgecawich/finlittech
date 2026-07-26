# FinLitTech

Free personal finance calculators for high school students.

**Live:** <https://finlittech.vercel.app>

Rhode Island requires a consumer education course to graduate (RIGL 16-22-13). This
project accompanies original research on that requirement, and starts from the
assumption that the requirement isn't the problem. Students sit through the lesson.
What they rarely do is see their own numbers.

So this is not a course. It's four calculators that answer four questions in under a
minute, on a phone, without an account:

- **Credit card** — how long a balance takes to pay off, and what the interest costs.
  Including the case where the minimum payment never pays it off at all.
- **Compound interest** — what starting now is worth versus starting ten years later.
- **Loan** — a full amortization schedule for a car or student loan.
- **Paycheck** — gross to net, with federal, FICA, and Rhode Island withholding.

No accounts, no tracking of anything typed, no advice. Enter a number, see a number.

## How the math works

Everything financial lives in [`lib/finance/`](lib/finance/) and nothing else does
arithmetic on money. Those modules are pure and framework-free — no React, no Next.js,
no DOM — so they can be run from a plain Node script and are tested on their own terms.

Money is **integer cents** end to end. Floating-point dollars are a correctness bug in
a financial app (`0.1 + 0.2 !== 0.3`), so amounts are converted to cents on input and
back to a string exactly once, at the render boundary. Interest accrues on integer
cents and rounds half **away from zero** at the close of each period — one convention,
applied everywhere, which is what makes the schedules sum cleanly and the closing
balance land on exactly zero rather than a few cents off. (Away from zero rather than
up, so that a refund rounds to the same magnitude as an equivalent charge; see
[ADR 0001](docs/decisions/0001-rounding-convention.md).)

| Module | What it does |
| --- | --- |
| `types.ts` | `Cents`, `Rate`, `Months`, and the validating constructors |
| `money.ts` | Arithmetic on cents, and `formatUSD()` at the boundary |
| `parse.ts` | Turns typed text into cents, returning a union instead of throwing |
| `credit-card.ts` | Month-by-month payoff simulation |
| `compound.ts` | Future value of an ordinary annuity, and the cost of waiting to start |
| `loan.ts` | Amortization, with the final payment absorbing the rounding residual |
| `paycheck.ts` | Gross to net: federal, FICA, and Rhode Island withholding |
| `constants.ts` | Every rate, bracket, and default — each with a source URL |

Default rates and tax brackets are cited in `constants.ts` with the year they apply to.
The test suite fails if the tax year falls behind the current one, so the numbers
can't quietly go stale.

Design decisions worth explaining are recorded in [`docs/decisions/`](docs/decisions/).

## Running it

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

```bash
npm test          # unit and property tests
npm run coverage  # the same suite, enforcing 100% branch coverage on lib/finance
npm run typecheck # tsc --noEmit
npm run lint
```

## License

MIT — see [LICENSE](LICENSE).
