import { useCallback, useState } from "react";

export interface Popup {
  id: number;
  text: string;
  tone: "good" | "great" | "bad" | "neutral";
}

let nextId = 0;

/** Floating "+3" style labels that remove themselves when their animation ends. */
export function useScorePopups() {
  const [popups, setPopups] = useState<Popup[]>([]);
  const push = useCallback((text: string, tone: Popup["tone"]) => {
    nextId += 1;
    const popup = { id: nextId, text, tone };
    setPopups([popup]);
  }, []);
  const remove = useCallback((id: number) => {
    setPopups((current) => current.filter((popup) => popup.id !== id));
  }, []);
  return { popups, push, remove };
}

export function ScorePopups({ popups, onDone }: { popups: Popup[]; onDone: (id: number) => void }) {
  return (
    <div className="score-popups" aria-hidden="true">
      {popups.map((popup) => (
        <span
          key={popup.id}
          className={`score-popup score-popup--${popup.tone}`}
          onAnimationEnd={() => onDone(popup.id)}
        >
          {popup.text}
        </span>
      ))}
    </div>
  );
}
