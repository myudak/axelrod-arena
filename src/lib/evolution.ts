/**
 * Axelrod's "ecological" tournament (Axelrod & Hamilton 1981): each
 * generation, a strategy's population share grows in proportion to its
 * average score against the current population (discrete replicator dynamics).
 */
export interface EvolutionResult {
  ids: string[];
  /** shares[generation][i] — population share of ids[i]; rows sum to 1. */
  shares: number[][];
  /** Generation at which each id went extinct (share fell below threshold), if it did. */
  extinctAt: Record<string, number>;
}

export const EXTINCTION_THRESHOLD = 1e-4;

export function runEvolution(
  ids: string[],
  matrix: Record<string, Record<string, number>>,
  generations: number,
  initial?: Record<string, number>,
): EvolutionResult {
  const count = ids.length;
  let current = ids.map((id) => Math.max(0, initial?.[id] ?? 1));
  const total = current.reduce((sum, value) => sum + value, 0) || 1;
  current = current.map((value) => value / total);
  const shares = [current];
  const extinctAt: Record<string, number> = {};
  ids.forEach((id, index) => {
    if (current[index] === 0) extinctAt[id] = 0;
  });

  for (let generation = 1; generation <= generations; generation += 1) {
    const fitness = ids.map((row) =>
      ids.reduce((sum, col, j) => sum + current[j] * (matrix[row]?.[col] ?? 0), 0),
    );
    const mean = current.reduce((sum, share, i) => sum + share * fitness[i], 0);
    let next = current.map((share, i) => (mean > 0 ? (share * fitness[i]) / mean : share));
    next = next.map((share, i) => {
      if (share < EXTINCTION_THRESHOLD && share > 0) {
        extinctAt[ids[i]] = generation;
        return 0;
      }
      return share;
    });
    const sum = next.reduce((acc, value) => acc + value, 0) || 1;
    current = next.map((value) => value / sum);
    shares.push(current);
    if (count === 0) break;
  }
  return { ids, shares, extinctAt };
}
