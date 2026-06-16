"use client";

import { useSocket } from "./SocketProvider";

export function OnlineCount() {
  const { online, connected } = useSocket();
  return (
    <div className="mono flex items-center gap-2 text-xs text-muted">
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{
          background: connected ? "var(--color-accent-2)" : "var(--color-muted)",
          animation: connected ? "ping-dot 2s ease-out infinite" : "none",
        }}
      />
      {connected ? `온라인 ${online.toLocaleString()}` : "연결 중…"}
    </div>
  );
}
