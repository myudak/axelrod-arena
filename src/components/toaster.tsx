import { PixelIcon } from "@/components/pixel-icon";
import { dismissToast, useToasts } from "@/lib/toasts";

export function Toaster() {
  const toasts = useToasts();
  return (
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <button
          type="button"
          key={toast.id}
          className={`toast toast--${toast.tone}`}
          onClick={() => dismissToast(toast.id)}
        >
          <span className="toast__icon">
            <PixelIcon name={toast.icon} size={20} />
          </span>
          <span>
            <strong>{toast.title}</strong>
            {toast.body ? <small>{toast.body}</small> : null}
          </span>
        </button>
      ))}
    </div>
  );
}
