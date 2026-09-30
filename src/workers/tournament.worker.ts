import { runTournament } from "@/lib/game";

self.onmessage = (
  event: MessageEvent<{
    strategyIds: string[];
    rounds: number;
    repetitions: number;
    seed: string;
  }>,
) => {
  const result = runTournament(event.data);
  self.postMessage(result);
};

export {};

