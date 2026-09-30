import { createPersistentStore, useStore } from "@/lib/store";

export interface Settings {
  muted: boolean;
  /** 0..1 master volume. */
  volume: number;
  /** "system" follows prefers-reduced-motion. */
  motion: "system" | "reduced" | "full";
}

export const settingsStore = createPersistentStore<Settings>("axelrod:settings", {
  muted: false,
  volume: 0.6,
  motion: "system",
});

export function useSettings() {
  return useStore(settingsStore);
}

export function prefersReducedMotion() {
  const { motion } = settingsStore.get();
  if (motion !== "system") return motion === "reduced";
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}
