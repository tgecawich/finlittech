# 0011 — Shareable URLs drive dynamic OG images, at the cost of static rendering

**Context.** The distribution feature needs a shared link to preview as its headline number ("$1,200 at 22.15% APR … costs $718"), which means the `og:image` meta tag in the page's initial HTML must reflect the URL's parameters — and a crawler reads that HTML, not the client-rendered result.

**Decision.** Calculator state encodes to the query string (cleaned to bare numerics), the pages read `searchParams` in `generateMetadata` and pass the decoded state to the client component as `initial`, and `app/api/og/route.tsx` renders the headline into a PNG with the bundled Source Serif font; this makes the four calculator routes server-rendered on demand rather than static.

**Consequence.** Every result is a self-contained, no-flash shareable link that unfurls correctly, and the single source of truth for keys and defaults (`lib/calculators.ts`) keeps the form, the URL, the headline, and the image in agreement — the trade is that the calculator pages lost static prerendering, which is acceptable because they render in milliseconds and the landing page stays static.
