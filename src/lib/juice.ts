import confetti from "canvas-confetti";
import { prefersReducedMotion } from "@/lib/settings";

const PALETTE = ["#177647", "#c74316", "#f0b91b", "#2368ae", "#b72735"];

/** Chunky pixel confetti burst. No-op when reduced motion is preferred. */
export function celebrate(power = 1) {
  if (prefersReducedMotion()) return;
  const burst = (originX: number, angle: number) =>
    confetti({
      particleCount: Math.round(60 * power),
      angle,
      spread: 70,
      startVelocity: 45,
      origin: { x: originX, y: 0.7 },
      colors: PALETTE,
      shapes: ["square"],
      scalar: 1.1,
      ticks: 160,
      flat: true,
    });
  burst(0.1, 60);
  burst(0.9, 120);
}

/** Restarts a CSS shake animation on an element. */
export function shake(element: HTMLElement | null, strength: "soft" | "hard" = "hard") {
  if (!element || prefersReducedMotion()) return;
  const className = strength === "hard" ? "is-shaking" : "is-nudging";
  element.classList.remove("is-shaking", "is-nudging");
  // Force a reflow so the animation restarts even when triggered twice in a row.
  void element.offsetWidth;
  element.classList.add(className);
}
