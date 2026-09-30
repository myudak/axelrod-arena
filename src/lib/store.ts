import { useSyncExternalStore } from "react";

export interface PersistentStore<T> {
  get: () => T;
  set: (update: T | ((previous: T) => T)) => void;
  subscribe: (listener: () => void) => () => void;
}

function readStorage(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or blocked storage: keep working in memory.
  }
}

/**
 * A tiny localStorage-backed store. State survives reloads when storage is
 * available, syncs across tabs, and silently falls back to memory otherwise.
 */
export function createPersistentStore<T>(
  key: string,
  initial: T,
  parse: (raw: unknown, initial: T) => T = (raw, fallback) =>
    raw && typeof raw === "object" ? { ...fallback, ...(raw as Partial<T>) } : fallback,
): PersistentStore<T> {
  const listeners = new Set<() => void>();
  let state = typeof window === "undefined" ? initial : parse(readStorage(key), initial);

  const emit = () => listeners.forEach((listener) => listener());

  if (typeof window !== "undefined") {
    window.addEventListener("storage", (event) => {
      if (event.key !== key) return;
      state = parse(readStorage(key), initial);
      emit();
    });
  }

  return {
    get: () => state,
    set(update) {
      state = typeof update === "function" ? (update as (previous: T) => T)(state) : update;
      writeStorage(key, state);
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function useStore<T>(store: PersistentStore<T>) {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
