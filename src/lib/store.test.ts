import { describe, expect, it, vi } from "vitest";
import { createPersistentStore } from "@/lib/store";
import { playCue } from "@/lib/sound";
import { settingsStore } from "@/lib/settings";
import { computeStats } from "@/lib/use-human-match";

describe("persistent store", () => {
  it("merges saved state over defaults and notifies subscribers", () => {
    window.localStorage.setItem("test:store", JSON.stringify({ a: 5 }));
    const store = createPersistentStore("test:store", { a: 1, b: 2 });
    expect(store.get()).toEqual({ a: 5, b: 2 });
    const listener = vi.fn();
    store.subscribe(listener);
    store.set((previous) => ({ ...previous, b: 9 }));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(JSON.parse(window.localStorage.getItem("test:store")!)).toEqual({ a: 5, b: 9 });
  });

  it("survives corrupt or blocked storage", () => {
    window.localStorage.setItem("test:bad", "{not json");
    expect(createPersistentStore("test:bad", { ok: true }).get()).toEqual({ ok: true });
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceeded");
    });
    const store = createPersistentStore("test:blocked", { n: 0 });
    expect(() => store.set({ n: 1 })).not.toThrow();
    expect(store.get()).toEqual({ n: 1 });
    spy.mockRestore();
  });
});

describe("sound", () => {
  it("is a silent no-op without Web Audio or when muted", () => {
    expect(() => playCue("win")).not.toThrow();
    settingsStore.set((current) => ({ ...current, muted: true }));
    expect(() => playCue("betrayed")).not.toThrow();
  });
});

describe("match stats", () => {
  it("tracks the mutual-cooperation combo", () => {
    const round = (moveA: "C" | "D", moveB: "C" | "D") => ({ round: 0, moveA, moveB, payoffA: 0, payoffB: 0 });
    const stats = computeStats([round("C", "C"), round("C", "C"), round("D", "C"), round("C", "C")]);
    expect(stats.streak).toBe(1);
    expect(stats.bestStreak).toBe(2);
    expect(stats.humanCooperation).toBe(0.75);
  });
});

import { decodeCustom, encodeCustom } from "@/lib/customs";

describe("custom strategy share codes", () => {
  it("round-trips name, symbol and probabilities", () => {
    const code = encodeCustom({
      id: "custom-x",
      name: "Grace ~ Grit",
      symbol: "gg",
      color: "custom",
      spec: { p0: 1, pCC: 1, pCD: 0.33, pDC: 0.9, pDD: 0.1 },
    });
    const decoded = decodeCustom(code)!;
    expect(decoded.name).toBe("Grace ~ Grit");
    expect(decoded.symbol).toBe("GG");
    expect(decoded.spec).toEqual({ p0: 1, pCC: 1, pCD: 0.33, pDC: 0.9, pDD: 0.1 });
    expect(decoded.id).toMatch(/^custom-/);
  });

  it("rejects malformed codes and clamps probabilities", () => {
    expect(decodeCustom("nope")).toBeNull();
    expect(decodeCustom("a,b,1.2.3")).toBeNull();
    expect(decodeCustom("a,b,500.-3.50.50.50")!.spec.p0).toBe(1);
  });
});
