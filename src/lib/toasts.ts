import { useSyncExternalStore } from "react";
import type { PixelIconName } from "@/components/pixel-icon";

export interface Toast {
  id: number;
  title: string;
  body?: string;
  icon: PixelIconName;
  tone: "gold" | "cooperate" | "info";
}

let toasts: Toast[] = [];
let nextId = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export function pushToast(toast: Omit<Toast, "id">) {
  nextId += 1;
  const id = nextId;
  toasts = [...toasts, { ...toast, id }].slice(-3);
  emit();
  setTimeout(() => dismissToast(id), 4200);
}

export function dismissToast(id: number) {
  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
}

export function useToasts() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => toasts,
    () => toasts,
  );
}
