import { runTournament, type TournamentOptions } from "@/lib/game";

self.onmessage = (event: MessageEvent<TournamentOptions>) => {
  self.postMessage(runTournament(event.data));
};

export {};
