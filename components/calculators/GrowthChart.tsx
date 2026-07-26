"use client";

import { useEffect, useRef, useState } from "react";

import { formatCompactUSD, type Cents, type CompoundPoint } from "@/lib/finance";

/**
 * Two savings trajectories on one timeline, drawn by hand in SVG.
 *
 * No charting library: the data is two smooth curves, and a library would cost
 * bundle weight on a budget-sensitive route while fighting every part of the
 * editorial spec — hairline axes, no gridlines, serif numerals, a single
 * accent. Plain SVG gives all of that and is pure DOM, so the conclusion is
 * available to assistive tech through the `role="img"` label and the sentence
 * beneath the chart. See docs/decisions/0008-hand-rolled-svg-chart.md.
 *
 * Coordinates are computed in real pixels against the measured container width,
 * so text stays crisp at any size rather than scaling with a fixed viewBox.
 */

const HEIGHT = 320;
const PAD = { top: 30, right: 16, bottom: 30, left: 14 } as const;
const MONTHS_PER_YEAR = 12;

export interface GrowthChartProps {
  immediate: readonly CompoundPoint[];
  delayed: readonly CompoundPoint[];
  delayMonths: number;
  /** The gap between the two endpoints, computed in the domain — never here. */
  costOfWaiting: Cents;
  /** The one-sentence conclusion, used as the accessible name for the graphic. */
  altText: string;
}

function lastOf(series: readonly CompoundPoint[]): CompoundPoint {
  const point = series[series.length - 1];
  if (point === undefined) throw new Error("GrowthChart: empty series");
  return point;
}

export function GrowthChart({
  immediate,
  delayed,
  delayMonths,
  costOfWaiting,
  altText,
}: GrowthChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [activeMonth, setActiveMonth] = useState<number | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (element === null) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const totalMonths = lastOf(immediate).month;
  const immediateFinal = lastOf(immediate);
  const delayedFinal = lastOf(delayed);

  const w = Math.max(width, 260);
  const plotW = w - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;

  // Headroom above the taller curve so its end label has room to breathe.
  const yMax = immediateFinal.value * 1.12 || 1;

  const xOf = (month: number) =>
    PAD.left + (totalMonths === 0 ? 0 : (month / totalMonths) * plotW);
  const yOf = (value: number) => PAD.top + plotH - (value / yMax) * plotH;

  // Cap the path at ~160 segments; the curve is smooth enough that sampling
  // every few months is indistinguishable from every month and keeps the DOM
  // string small.
  const step = Math.max(1, Math.floor(totalMonths / 160));
  const pathOf = (series: readonly CompoundPoint[]): string => {
    const parts: string[] = [];
    for (let i = 0; i < series.length; i += step) {
      const point = series[i] as CompoundPoint;
      parts.push(
        `${parts.length === 0 ? "M" : "L"}${xOf(point.month).toFixed(1)},${yOf(point.value).toFixed(1)}`,
      );
    }
    const final = lastOf(series);
    parts.push(`L${xOf(final.month).toFixed(1)},${yOf(final.value).toFixed(1)}`);
    return parts.join(" ");
  };

  // Year gridline positions for x labels — every ten years, plus the end.
  const years = totalMonths / MONTHS_PER_YEAR;
  const yearTicks: number[] = [];
  for (let year = 0; year <= years; year += 10) yearTicks.push(year);

  const baselineY = yOf(0);
  const active =
    activeMonth === null
      ? null
      : {
          month: activeMonth,
          now: immediate[activeMonth] ?? immediateFinal,
          waited: delayed[activeMonth] ?? delayedFinal,
        };

  const handlePointer = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const ratio = (px - PAD.left) / plotW;
    const month = Math.round(ratio * totalMonths);
    setActiveMonth(Math.min(Math.max(month, 0), totalMonths));
  };

  return (
    <div ref={containerRef} className="w-full" style={{ height: HEIGHT }}>
      <svg
        width={w}
        height={HEIGHT}
        viewBox={`0 0 ${w} ${HEIGHT}`}
        role="img"
        aria-label={altText}
        className="touch-none select-none"
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        onPointerLeave={() => setActiveMonth(null)}
      >
        {/* x baseline — the only axis rule, hairline, no gridlines */}
        <line
          x1={PAD.left}
          y1={baselineY}
          x2={w - PAD.right}
          y2={baselineY}
          stroke="var(--rule)"
          strokeWidth={1}
        />

        {/* year ticks */}
        {yearTicks.map((year) => {
          const x = xOf(year * MONTHS_PER_YEAR);
          return (
            <text
              key={year}
              x={x}
              y={HEIGHT - 10}
              textAnchor={year === 0 ? "start" : "middle"}
              className="fill-[var(--ink-muted)] font-serif"
              style={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}
            >
              {year === 0 ? "now" : `${year}y`}
            </text>
          );
        })}

        {/* the delayed trajectory — neutral, so the accent stays singular */}
        <path
          d={pathOf(delayed)}
          fill="none"
          stroke="var(--ink-muted)"
          strokeWidth={1.5}
        />
        {/* the immediate trajectory — the one accent, --gain */}
        <path
          d={pathOf(immediate)}
          fill="none"
          stroke="var(--gain)"
          strokeWidth={2.5}
        />

        {/* endpoints */}
        <circle cx={xOf(totalMonths)} cy={yOf(delayedFinal.value)} r={3} fill="var(--ink-muted)" />
        <circle cx={xOf(totalMonths)} cy={yOf(immediateFinal.value)} r={3.5} fill="var(--gain)" />

        {/* delta bracket between the two endpoints */}
        <DeltaBracket
          x={xOf(totalMonths)}
          yTop={yOf(immediateFinal.value)}
          yBottom={yOf(delayedFinal.value)}
          label={formatCompactUSD(costOfWaiting)}
        />

        {/* direct line labels, no legend */}
        <text
          x={xOf(totalMonths * 0.45)}
          y={yOf(immediate[Math.floor(immediate.length * 0.45)]?.value ?? 0) - 22}
          className="fill-[var(--gain)] font-sans"
          style={{ fontSize: 12, fontWeight: 500 }}
        >
          Start now
        </text>
        <text
          x={xOf(totalMonths * 0.62)}
          y={yOf(delayed[Math.floor(delayed.length * 0.62)]?.value ?? 0) + 22}
          className="fill-[var(--ink-muted)] font-sans"
          style={{ fontSize: 12, fontWeight: 500 }}
        >
          Wait {Math.round(delayMonths / MONTHS_PER_YEAR)} years
        </text>

        {/* scrubber */}
        {active ? (
          <g>
            <line
              x1={xOf(active.month)}
              y1={PAD.top - 6}
              x2={xOf(active.month)}
              y2={baselineY}
              stroke="var(--focus)"
              strokeWidth={1}
            />
            <circle cx={xOf(active.month)} cy={yOf(active.now.value)} r={3.5} fill="var(--gain)" />
            <circle cx={xOf(active.month)} cy={yOf(active.waited.value)} r={3} fill="var(--ink-muted)" />
            <ScrubReadout
              x={xOf(active.month)}
              chartWidth={w}
              year={Math.round(active.month / MONTHS_PER_YEAR)}
              now={formatCompactUSD(active.now.value)}
              waited={formatCompactUSD(active.waited.value)}
            />
          </g>
        ) : null}
      </svg>
    </div>
  );
}

function DeltaBracket({
  x,
  yTop,
  yBottom,
  label,
}: {
  x: number;
  yTop: number;
  yBottom: number;
  label: string;
}) {
  const capLength = 5;
  return (
    <g>
      <line x1={x} y1={yTop} x2={x} y2={yBottom} stroke="var(--gain)" strokeWidth={1} />
      <line x1={x - capLength} y1={yTop} x2={x} y2={yTop} stroke="var(--gain)" strokeWidth={1} />
      <line x1={x - capLength} y1={yBottom} x2={x} y2={yBottom} stroke="var(--gain)" strokeWidth={1} />
      <text
        x={x - 8}
        y={yTop - 6}
        textAnchor="end"
        className="fill-[var(--gain)] font-serif"
        style={{ fontSize: 15, fontVariantNumeric: "tabular-nums" }}
      >
        {label} more
      </text>
    </g>
  );
}

function ScrubReadout({
  x,
  chartWidth,
  year,
  now,
  waited,
}: {
  x: number;
  chartWidth: number;
  year: number;
  now: string;
  waited: string;
}) {
  // Flip the label to the left of the scrub line as it nears the right edge, so
  // it never runs off the plot.
  const flip = x > chartWidth - 120;
  const anchor = flip ? "end" : "start";
  const dx = flip ? -8 : 8;
  return (
    <text
      x={x + dx}
      y={PAD.top + 4}
      textAnchor={anchor}
      className="fill-[var(--ink)] font-sans"
      style={{ fontSize: 12 }}
    >
      <tspan style={{ fontWeight: 500 }}>Year {year}</tspan>
      <tspan dx={6} className="fill-[var(--gain)]">
        {now}
      </tspan>
      <tspan dx={6} className="fill-[var(--ink-muted)]">
        {waited}
      </tspan>
    </text>
  );
}
