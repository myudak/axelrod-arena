import { useState } from "react";
import type { Strategy } from "@/lib/game";

/** Sequential single-hue (blue) ramp, light → dark, for payoff 0 → 5. */
const RAMP = [
  "#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7", "#3987e5",
  "#2a78d6", "#256abf", "#1c5cab", "#184f95", "#104281", "#0d366b",
];
const MAX_PAYOFF = 5;

function cellStyle(value: number) {
  const index = Math.round((Math.min(Math.max(value, 0), MAX_PAYOFF) / MAX_PAYOFF) * (RAMP.length - 1));
  return { background: RAMP[index], color: index >= 7 ? "#ffffff" : "#181512" };
}

/**
 * Payoff matrix as an accessible table: row strategy's average points per turn
 * against each column strategy. Hover/focus highlights the pairing.
 */
export function PayoffHeatmap({
  ids,
  matrix,
  lookup,
}: {
  ids: string[];
  matrix: Record<string, Record<string, number>>;
  lookup: (id: string) => Strategy;
}) {
  const [active, setActive] = useState<{ row: string; col: string } | null>(null);
  const activeText = active
    ? `${lookup(active.row).name} earns ${matrix[active.row][active.col].toFixed(2)} per turn vs ${lookup(active.col).name}` +
      (active.row !== active.col
        ? ` (which earns ${matrix[active.col][active.row].toFixed(2)} back)`
        : " (self-play)")
    : "Hover or focus a cell to compare a pairing.";

  return (
    <div className="heatmap">
      <p className="heatmap__readout" aria-live="polite">
        {activeText}
      </p>
      <div className="heatmap__scroll">
        <table>
          <caption className="sr-only">
            Average payoff per turn earned by the row strategy against the column strategy
          </caption>
          <thead>
            <tr>
              <th scope="col" className="heatmap__corner">
                ROW EARNS VS COL
              </th>
              {ids.map((id) => (
                <th
                  scope="col"
                  key={id}
                  title={lookup(id).name}
                  className={active?.col === id ? "is-active" : ""}
                >
                  {lookup(id).symbol}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ids.map((row) => (
              <tr key={row}>
                <th scope="row" title={lookup(row).name} className={active?.row === row ? "is-active" : ""}>
                  {lookup(row).symbol}
                </th>
                {ids.map((col) => {
                  const value = matrix[row][col];
                  const isActive = active?.row === row && active?.col === col;
                  const inCross = active && (active.row === row || active.col === col);
                  return (
                    <td
                      key={col}
                      style={cellStyle(value)}
                      tabIndex={0}
                      className={`${isActive ? "is-active" : ""} ${inCross && !isActive ? "is-cross" : ""}`}
                      onMouseEnter={() => setActive({ row, col })}
                      onFocus={() => setActive({ row, col })}
                      onMouseLeave={() => setActive(null)}
                      aria-label={`${lookup(row).name} versus ${lookup(col).name}: ${value.toFixed(2)} per turn`}
                    >
                      {value.toFixed(1)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="heatmap__legend" aria-hidden="true">
        <span>0</span>
        <i style={{ background: `linear-gradient(90deg, ${RAMP.join(", ")})` }} />
        <span>5 pts / turn</span>
      </div>
    </div>
  );
}
