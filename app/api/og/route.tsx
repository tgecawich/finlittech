import { ImageResponse } from "next/og";

import { isCalculatorId } from "@/lib/calculators";
import { headlineFor, type Headline } from "@/lib/headlines";

// Edge so `fetch(new URL(..., import.meta.url))` can read the bundled fonts;
// the finance domain is pure JS and runs here without a Node runtime.
export const runtime = "edge";

// Satori cannot read CSS custom properties, so the design tokens are inlined as
// their literal hex values here — the one place in the codebase raw hex is
// correct, because this renders a PNG, not a page. Kept in sync with globals.css.
const PAPER = "#FDFCF9";
const INK = "#2C2C2A";
const INK_MUTED = "#5F5E5A";
const RULE = "#D3D1C7";
const TONE = { ink: INK, cost: "#A32D2D", gain: "#0F6E56" } as const;

function Card({ headline }: { headline: Headline }) {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: PAPER,
        padding: "72px 80px",
        fontFamily: "Source Serif 4",
      }}
    >
      <div style={{ display: "flex", fontSize: 30, letterSpacing: 1, color: INK_MUTED }}>
        FinLitTech · {headline.calculator}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontSize: 128,
            fontWeight: 600,
            letterSpacing: -2,
            lineHeight: 1,
            color: TONE[headline.tone],
          }}
        >
          {headline.value}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 32,
            maxWidth: 900,
            fontSize: 42,
            lineHeight: 1.35,
            color: INK,
          }}
        >
          {headline.sentence}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", height: 1, backgroundColor: RULE, marginBottom: 24 }} />
        <div style={{ display: "flex", fontSize: 28, color: INK_MUTED }}>
          finlittech.vercel.app
        </div>
      </div>
    </div>
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const calc = searchParams.get("calc") ?? "credit-card";
  const id = isCalculatorId(calc) ? calc : "credit-card";
  const headline = headlineFor(id, Object.fromEntries(searchParams.entries()));

  const [serif400, serif600] = await Promise.all([
    fetch(new URL("./SourceSerif4-400.ttf", import.meta.url)).then((r) => r.arrayBuffer()),
    fetch(new URL("./SourceSerif4-600.ttf", import.meta.url)).then((r) => r.arrayBuffer()),
  ]);

  return new ImageResponse(<Card headline={headline} />, {
    width: 1200,
    height: 630,
    fonts: [
      { name: "Source Serif 4", data: serif400, weight: 400, style: "normal" },
      { name: "Source Serif 4", data: serif600, weight: 600, style: "normal" },
    ],
    headers: {
      // The image is a pure function of the query, so it can be cached hard —
      // a crawler that fetches the same shared link should not re-render it.
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
