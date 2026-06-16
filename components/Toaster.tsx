"use client";

import { useSocket } from "./SocketProvider";

const KIND_STYLES: Record<string, string> = {
  info: "border-grid text-fg",
  success: "border-[color:var(--color-accent-2)] text-fg",
  warn: "border-[color:var(--color-last)] text-fg",
  error: "border-[color:var(--color-danger)] text-fg",
};

const KIND_DOT: Record<string, string> = {
  info: "var(--color-muted)",
  success: "var(--color-accent-2)",
  warn: "var(--color-last)",
  error: "var(--color-danger)",
};

export function Toaster() {
  const { toasts, dismissToast } = useSocket();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismissToast(t.id)}
          className={`animate-rise pointer-events-auto flex items-center gap-2.5 rounded-xl border bg-surface/95 px-4 py-2.5 text-sm shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur ${KIND_STYLES[t.kind] ?? KIND_STYLES.info}`}
        >
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: KIND_DOT[t.kind] ?? KIND_DOT.info }}
          />
          {t.message}
        </button>
      ))}
    </div>
  );
}
