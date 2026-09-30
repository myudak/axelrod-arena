import { useMemo, useRef, useState } from "react";
import type { Strategy } from "@/lib/game";

/**
 * Fixed categorical colours per entity (validated reference palette, light mode).
 * Colour follows the strategy, never its rank; everything else is "other" grey.
 */
export const SERIES_COLORS: Record<string, string> = {
  "tit-for-tat": "#2a78d6",
  "always-defect": "#eb6834",
  "generous-tit-for-tat": "#1baf7a",
  pavlov: "#eda100",
  "extort-2": "#e87ba4",
  "always-cooperate": "#008300",
  "grim-trigger": "#4a3aa7",
  detective: "#e34948",
};
const OTHER = "#b8b1a4";

const WIDTH = 760;
const HEIGHT = 300;
const PAD = { top: 16, right: 110, bottom: 30, left: 44 };

export function seriesColor(id: string) {
  return SERIES_COLORS[id] ?? OTHER;
}

export function EvolutionChart({
  ids,
  shares,
  upTo,
  lookup,
}: {
  ids: string[];
  shares: number[][];
  /** Draw generations 0..upTo (for the animated reveal). */
  upTo: number;
  lookup: (id: string) => Strategy;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const totalGenerations = shares.length - 1;
  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (generation: number) => PAD.left + (generation / Math.max(1, totalGenerations)) * plotW;
  const y = (share: number) => PAD.top + (1 - share) * plotH;
  const visible = Math.min(upTo, totalGenerations);

  // Draw grey "other" series first so highlighted ones sit on top.
  const order = useMemo(
    () => [...ids.keys()].sort((a, b) => Number(Boolean(SERIES_COLORS[ids[a]])) - Number(Boolean(SERIES_COLORS[ids[b]]))),
    [ids],
  );

  const paths = useMemo(
    () =>
      ids.map((_, index) => {
        let d = "";
        for (let generation = 0; generation <= visible; generation += 1) {
          d += `${generation === 0 ? "M" : "L"}${x(generation).toFixed(1)} ${y(shares[generation][index]).toFixed(1)}`;
        }
        return d;
      }),
    // x/y are pure functions of the constants and totalGenerations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids, shares, visible, totalGenerations],
  );

  const endLabels = ids
    .map((id, index) => ({ id, index, share: shares[visible][index] }))
    .filter((item) => item.share >= 0.06)
    .sort((a, b) => b.share - a.share)
    .slice(0, 5);
  // Nudge labels apart so they never collide.
  const placed: { id: string; y: number; share: number; index: number }[] = [];
  for (const label of endLabels) {
    let labelY = y(label.share);
    for (const other of placed) if (Math.abs(other.y - labelY) < 14) labelY = other.y + 14;
    placed.push({ ...label, y: Math.min(labelY, PAD.top + plotH) });
  }

  const onMove = (event: React.PointerEvent<SVGRectElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const box = svg.getBoundingClientRect();
    const px = ((event.clientX - box.left) / box.width) * WIDTH;
    const generation = Math.round(((px - PAD.left) / plotW) * totalGenerations);
    setHover(Math.max(0, Math.min(visible, generation)));
  };

  const hoverRows =
    hover === null
      ? []
      : ids
          .map((id, index) => ({ id, share: shares[hover][index] }))
          .filter((row) => row.share > 0.001)
          .sort((a, b) => b.share - a.share)
          .slice(0, 8);

  return (
    <div className="evo-chart">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Population share of each strategy over ${totalGenerations} generations`}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={PAD.left + plotW} y1={y(tick)} y2={y(tick)} className="evo-chart__grid" />
            <text x={PAD.left - 8} y={y(tick) + 4} textAnchor="end" className="evo-chart__tick">
              {tick * 100}%
            </text>
          </g>
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
          const generation = Math.round(fraction * totalGenerations);
          return (
            <text key={fraction} x={x(generation)} y={HEIGHT - 8} textAnchor="middle" className="evo-chart__tick">
              {generation}
            </text>
          );
        })}
        <text x={PAD.left + plotW} y={HEIGHT - 8} dx={18} className="evo-chart__tick" textAnchor="start">
          GEN
        </text>
        {order.map((index) => (
          <path
            key={ids[index]}
            d={paths[index]}
            fill="none"
            stroke={seriesColor(ids[index])}
            strokeWidth={SERIES_COLORS[ids[index]] ? 2 : 1.25}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {placed.map((label) => (
          <g key={label.id}>
            <circle cx={x(visible)} cy={y(label.share)} r={4} fill={seriesColor(label.id)} stroke="var(--card)" strokeWidth={2} />
            <text x={x(visible) + 8} y={label.y + 4} className="evo-chart__label">
              {lookup(label.id).symbol} {Math.round(label.share * 100)}%
            </text>
          </g>
        ))}
        {hover !== null ? (
          <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + plotH} className="evo-chart__crosshair" />
        ) : null}
        <rect
          x={PAD.left}
          y={PAD.top}
          width={plotW}
          height={plotH}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {hover !== null ? (
        <div
          className="evo-chart__tooltip"
          style={{ left: `${(x(hover) / WIDTH) * 100}%` }}
          data-flip={x(hover) > WIDTH * 0.6 ? "left" : "right"}
        >
          <strong>GENERATION {hover}</strong>
          {hoverRows.map((row) => (
            <span key={row.id}>
              <i style={{ background: seriesColor(row.id) }} />
              {lookup(row.id).shortName}
              <b>{(row.share * 100).toFixed(1)}%</b>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
