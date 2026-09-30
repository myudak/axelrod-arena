import type { Move } from "@/lib/game";

export function MoveChip({ move, label, flipped }: { move: Move; label?: string; flipped?: boolean }) {
  const name = move === "C" ? "Cooperate" : "Defect";
  return (
    <span
      className={`move-chip move-chip--${move === "C" ? "cooperate" : "defect"}${flipped ? " move-chip--flipped" : ""}`}
      aria-label={label ?? (flipped ? `${name} (noise flipped the intended move)` : name)}
      title={flipped ? `${name}: noise flipped the intended move` : name}
    >
      {move}
    </span>
  );
}

export function EmptyMoveChip() {
  return <span className="move-chip move-chip--empty">·</span>;
}

