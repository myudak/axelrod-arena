import { useEffect } from "react";
import { PixelIcon } from "@/components/pixel-icon";
import { playCue } from "@/lib/sound";
import { settingsStore, useSettings } from "@/lib/settings";

/** Mirrors the motion preference onto <html data-motion> so CSS can honour it. */
export function MotionPreference() {
  const { motion } = useSettings();
  useEffect(() => {
    document.documentElement.dataset.motion = motion;
  }, [motion]);
  return null;
}

export function SoundToggle() {
  const { muted } = useSettings();
  return (
    <button
      type="button"
      className="icon-toggle"
      aria-pressed={!muted}
      aria-label={muted ? "Sound off. Turn sound on" : "Sound on. Turn sound off"}
      title={muted ? "Sound off" : "Sound on"}
      onClick={() => {
        settingsStore.set((current) => ({ ...current, muted: !current.muted }));
        if (muted) playCue("click");
      }}
    >
      <PixelIcon name={muted ? "soundOff" : "soundOn"} size={18} />
    </button>
  );
}

export function MotionToggle() {
  const { motion } = useSettings();
  const reduced = motion === "reduced";
  return (
    <button
      type="button"
      className="icon-toggle"
      aria-pressed={!reduced}
      aria-label={reduced ? "Effects reduced. Turn effects on" : "Effects on. Reduce effects"}
      title={reduced ? "Effects reduced" : "Effects on"}
      onClick={() =>
        settingsStore.set((current) => ({
          ...current,
          motion: current.motion === "reduced" ? "system" : "reduced",
        }))
      }
    >
      <PixelIcon name="bolt" size={18} className={reduced ? "is-dim" : ""} />
    </button>
  );
}
