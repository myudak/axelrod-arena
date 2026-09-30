/**
 * 8-bit sound effects synthesized with the Web Audio API — no audio assets.
 * The AudioContext is created lazily on the first cue, which always follows a
 * user gesture (browsers block audio before that).
 */
import { settingsStore } from "@/lib/settings";

export type Cue =
  | "click"
  | "cooperate"
  | "defect"
  | "trust"
  | "exploit"
  | "betrayed"
  | "distrust"
  | "tick"
  | "win"
  | "lose"
  | "draw"
  | "unlock"
  | "levelup"
  | "star"
  | "flip";

type Wave = OscillatorType;

let context: AudioContext | null = null;
let master: GainNode | null = null;

function audio() {
  if (typeof window === "undefined") return null;
  const AudioContextClass =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!context) {
    context = new AudioContextClass();
    master = context.createGain();
    master.connect(context.destination);
  }
  if (context.state === "suspended") void context.resume();
  master!.gain.value = settingsStore.get().volume * 0.5;
  return context;
}

function tone(
  ctx: AudioContext,
  {
    frequency,
    at = 0,
    duration = 0.1,
    wave = "square",
    gain = 0.25,
    slideTo,
  }: { frequency: number; at?: number; duration?: number; wave?: Wave; gain?: number; slideTo?: number },
) {
  const start = ctx.currentTime + at;
  const oscillator = ctx.createOscillator();
  const envelope = ctx.createGain();
  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(gain, start + 0.005);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(envelope).connect(master!);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function noise(ctx: AudioContext, { at = 0, duration = 0.12, gain = 0.2 } = {}) {
  const start = ctx.currentTime + at;
  const frames = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  // Stepped noise sounds crunchier / more "8-bit" than white noise.
  let value = 0;
  for (let index = 0; index < frames; index += 1) {
    if (index % 8 === 0) value = Math.random() * 2 - 1;
    data[index] = value * (1 - index / frames);
  }
  const source = ctx.createBufferSource();
  const envelope = ctx.createGain();
  envelope.gain.value = gain;
  source.buffer = buffer;
  source.connect(envelope).connect(master!);
  source.start(start);
}

const NOTE = (semitonesFromA4: number) => 440 * 2 ** (semitonesFromA4 / 12);

/** Plays a cue. `intensity` (e.g. a combo count) raises the pitch of some cues. */
export function playCue(cue: Cue, intensity = 0) {
  if (settingsStore.get().muted) return;
  const ctx = audio();
  if (!ctx) return;
  const lift = Math.min(intensity, 12);

  switch (cue) {
    case "click":
      tone(ctx, { frequency: 880, duration: 0.03, gain: 0.12 });
      break;
    case "flip":
      tone(ctx, { frequency: 520, slideTo: 780, duration: 0.06, wave: "triangle", gain: 0.15 });
      break;
    case "cooperate":
      tone(ctx, { frequency: NOTE(3 + lift), duration: 0.07, gain: 0.18 });
      break;
    case "defect":
      tone(ctx, { frequency: 180, slideTo: 120, duration: 0.09, gain: 0.18 });
      break;
    case "tick":
      tone(ctx, { frequency: 1200, duration: 0.015, wave: "triangle", gain: 0.06 });
      break;
    case "trust": {
      const root = 3 + lift;
      [0, 4, 7].forEach((step, index) =>
        tone(ctx, { frequency: NOTE(root + step), at: index * 0.055, duration: 0.09, gain: 0.16 }),
      );
      break;
    }
    case "exploit":
      tone(ctx, { frequency: NOTE(10), slideTo: NOTE(22), duration: 0.14, wave: "sawtooth", gain: 0.14 });
      tone(ctx, { frequency: NOTE(17), at: 0.1, duration: 0.08, gain: 0.12 });
      break;
    case "betrayed":
      noise(ctx, { duration: 0.18, gain: 0.3 });
      tone(ctx, { frequency: 220, slideTo: 70, duration: 0.3, gain: 0.22 });
      break;
    case "distrust":
      tone(ctx, { frequency: 110, slideTo: 90, duration: 0.18, wave: "triangle", gain: 0.3 });
      noise(ctx, { duration: 0.05, gain: 0.08 });
      break;
    case "win":
      [0, 4, 7, 12, 7, 12, 16].forEach((step, index) =>
        tone(ctx, {
          frequency: NOTE(3 + step),
          at: index * 0.09,
          duration: index === 6 ? 0.4 : 0.1,
          gain: 0.18,
        }),
      );
      break;
    case "lose":
      [7, 6, 5, 4].forEach((step, index) =>
        tone(ctx, {
          frequency: NOTE(step - 5),
          at: index * 0.18,
          duration: index === 3 ? 0.5 : 0.16,
          wave: "triangle",
          gain: 0.25,
        }),
      );
      break;
    case "draw":
      [0, 5, 0].forEach((step, index) =>
        tone(ctx, { frequency: NOTE(step), at: index * 0.12, duration: 0.12, gain: 0.16 }),
      );
      break;
    case "star":
      tone(ctx, { frequency: NOTE(15 + lift * 2), duration: 0.12, wave: "triangle", gain: 0.22 });
      tone(ctx, { frequency: NOTE(22 + lift * 2), at: 0.06, duration: 0.18, wave: "triangle", gain: 0.18 });
      break;
    case "unlock":
      [0, 4, 7, 11, 14].forEach((step, index) =>
        tone(ctx, { frequency: NOTE(8 + step), at: index * 0.05, duration: 0.12, gain: 0.14 }),
      );
      break;
    case "levelup":
      [0, 2, 4, 5, 7, 9, 11, 12].forEach((step, index) =>
        tone(ctx, { frequency: NOTE(3 + step), at: index * 0.05, duration: 0.08, gain: 0.15 }),
      );
      tone(ctx, { frequency: NOTE(15), at: 0.42, duration: 0.45, gain: 0.18 });
      break;
  }
}

/** The cue for one exchange, from the listener's (player A's) point of view. */
export function outcomeCue(moveA: "C" | "D", moveB: "C" | "D"): Cue {
  if (moveA === "C" && moveB === "C") return "trust";
  if (moveA === "D" && moveB === "D") return "distrust";
  return moveA === "D" ? "exploit" : "betrayed";
}
