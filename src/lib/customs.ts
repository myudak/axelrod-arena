import { useMemo } from "react";
import { buildRoster, type CustomStrategyDef, type MemoryOneSpec } from "@/lib/game";
import { createPersistentStore, useStore } from "@/lib/store";

export const MAX_CUSTOMS = 8;

const clamp01 = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : 0;
};

function sanitize(raw: unknown): CustomStrategyDef | null {
  if (!raw || typeof raw !== "object") return null;
  const def = raw as Partial<CustomStrategyDef>;
  if (typeof def.id !== "string" || !def.id.startsWith("custom-") || !def.spec) return null;
  const spec = def.spec as Partial<MemoryOneSpec>;
  return {
    id: def.id.slice(0, 40),
    name: String(def.name ?? "My Strategy").slice(0, 16) || "My Strategy",
    symbol: String(def.symbol ?? "MY").toUpperCase().slice(0, 3) || "MY",
    color: "custom",
    spec: {
      p0: clamp01(spec.p0),
      pCC: clamp01(spec.pCC),
      pCD: clamp01(spec.pCD),
      pDC: clamp01(spec.pDC),
      pDD: clamp01(spec.pDD),
    },
  };
}

export const customsStore = createPersistentStore<CustomStrategyDef[]>("axelrod:customs", [], (raw) =>
  Array.isArray(raw)
    ? raw.map(sanitize).filter((def): def is CustomStrategyDef => def !== null).slice(0, MAX_CUSTOMS)
    : [],
);

export function useCustoms() {
  return useStore(customsStore);
}

/** Built-in strategies plus the player's custom ones. */
export function useRoster() {
  const customs = useCustoms();
  return useMemo(() => buildRoster(customs), [customs]);
}

export function newCustomId() {
  return `custom-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function saveCustom(def: CustomStrategyDef) {
  const clean = sanitize(def);
  if (!clean) return false;
  const existing = customsStore.get();
  if (!existing.some((item) => item.id === clean.id) && existing.length >= MAX_CUSTOMS) return false;
  customsStore.set((current) =>
    current.some((item) => item.id === clean.id)
      ? current.map((item) => (item.id === clean.id ? clean : item))
      : [...current, clean],
  );
  return true;
}

export function deleteCustom(id: string) {
  customsStore.set((current) => current.filter((item) => item.id !== id));
}

/** Compact share code: name,SYM,p0.pCC.pCD.pDC.pDD (percents). Parts are URI-encoded, so "," never appears inside one. */
export function encodeCustom(def: CustomStrategyDef) {
  const { p0, pCC, pCD, pDC, pDD } = def.spec;
  const percents = [p0, pCC, pCD, pDC, pDD].map((value) => Math.round(value * 100)).join(".");
  return [def.name, def.symbol, percents].map(encodeURIComponent).join(",");
}

export function decodeCustom(code: string): CustomStrategyDef | null {
  const parts = code.split(",").map((part) => {
    try {
      return decodeURIComponent(part);
    } catch {
      return "";
    }
  });
  if (parts.length !== 3) return null;
  const numbers = parts[2].split(".").map(Number);
  if (numbers.length !== 5 || numbers.some((value) => !Number.isFinite(value))) return null;
  const [p0, pCC, pCD, pDC, pDD] = numbers.map((value) => value / 100);
  return sanitize({ id: newCustomId(), name: parts[0], symbol: parts[1], color: "custom", spec: { p0, pCC, pCD, pDC, pDD } });
}

/** Plain-language profile of a memory-one rule, in Axelrod's vocabulary. */
export function describeSpec(spec: MemoryOneSpec) {
  const traits: string[] = [];
  if (spec.p0 >= 0.99 && spec.pCC >= 0.99) traits.push("Nice");
  else if (spec.p0 <= 0.01) traits.push("Suspicious");
  if (spec.pCD <= 0.4) traits.push("Retaliatory");
  if (spec.pCD >= 0.2 && spec.pCD < 0.9) traits.push("Forgiving");
  if (spec.pCD >= 0.9) traits.push("Pushover");
  if (spec.pDC >= 0.6) traits.push("Remorseful");
  if (spec.pDC <= 0.2 && spec.pCC >= 0.9) traits.push("Exploits pushovers");
  if (spec.pCC < 0.9) traits.push("Provocative");
  if ([spec.p0, spec.pCC, spec.pCD, spec.pDC, spec.pDD].some((value) => value > 0.01 && value < 0.99)) {
    traits.push("Stochastic");
  }
  return traits;
}
