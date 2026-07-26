# 0008 — The chart is hand-rolled SVG, no charting library

**Context.** The brief assumed a charting library ("load the charting library only on this route"), but the chart is two smooth curves with hairline axes, no gridlines, serif numerals, and a single accent — and every real library ships 30–100 KB and imposes its own axis chrome, fonts, and gridlines that then have to be fought back off.

**Decision.** The chart is plain SVG drawn from the domain series, with coordinates computed in real pixels against the measured container width so text stays crisp at any size; the only dependency is React, already present.

**Consequence.** The route carries zero charting weight and the editorial styling is exact and fully ours, at the cost of owning ~200 lines of chart component and a pointer scrubber — a fair trade, since the thing being drawn is two monotonic curves and the alternative was a library we would have spent as long restyling.
