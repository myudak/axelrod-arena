import { useCallback, useEffect, useRef, useState } from "react";
import { runTournament, type TournamentOptions, type TournamentResult } from "@/lib/game";

/** Runs tournaments in a Web Worker (falling back to the main thread) and tracks status. */
export function useTournamentRunner(initialOptions: TournamentOptions) {
  const [result, setResult] = useState<TournamentResult | null>(null);
  const [running, setRunning] = useState(true);
  const workerRef = useRef<Worker | null>(null);
  const initialRef = useRef(initialOptions);

  const start = useCallback((options: TournamentOptions) => {
    workerRef.current?.terminate();
    workerRef.current = null;
    const finish = (next: TournamentResult) => {
      setResult(next);
      setRunning(false);
      workerRef.current?.terminate();
      workerRef.current = null;
    };
    if (typeof Worker === "undefined") {
      finish(runTournament(options));
      return;
    }
    const worker = new Worker(new URL("../workers/tournament.worker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<TournamentResult>) => finish(event.data);
    worker.onerror = () => finish(runTournament(options));
    worker.postMessage(options);
  }, []);

  const run = useCallback(
    (options: TournamentOptions) => {
      setRunning(true);
      start(options);
    },
    [start],
  );

  useEffect(() => {
    start(initialRef.current);
    return () => workerRef.current?.terminate();
  }, [start]);

  return { result, running, run };
}
