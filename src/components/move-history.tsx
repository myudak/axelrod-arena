import type { Move } from "@/lib/game";

export function MoveChip({ move, label }: { move: Move; label?: string }) {
  return (
    <span
      className={`move-chip move-chip--${move === "C" ? "cooperate" : "defect"}`}
      aria-label={label ?? (move === "C" ? "Cooperate" : "Defect")}
      title={move === "C" ? "Cooperate" : "Defect"}
    >
      {move}
    </span>
  );
}

export function EmptyMoveChip() {
  return <span className="move-chip move-chip--empty">·</span>;
}

