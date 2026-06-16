"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";

interface ChatPanelProps {
  messages: ChatMessage[];
  myPid: string | null;
  connected: boolean;
  onSend: (text: string) => void;
}

export function ChatPanel({ messages, myPid, connected, onSend }: ChatPanelProps) {
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || !connected) return;
    onSend(t);
    setText("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="micro-label shrink-0 px-5 pb-2 pt-4">채팅</div>
      <div
        ref={listRef}
        className="min-h-[150px] flex-1 space-y-2.5 overflow-y-auto px-5 pb-2"
      >
        {messages.length === 0 ? (
          <p className="py-2 text-xs text-muted">
            메시지가 없습니다. 먼저 인사를 건네보세요.
          </p>
        ) : (
          messages.map((m) => {
            const own = myPid !== null && m.pid === myPid;
            return (
              <div key={m.id} className={own ? "text-right" : "text-left"}>
                <div className="mono mb-0.5 text-[10px] text-muted">
                  {own ? "나" : m.nickname}
                  {m.role === "spectator" && " · 관전"}
                </div>
                <div
                  className="inline-block max-w-[88%] break-words rounded-lg px-2.5 py-1.5 text-sm text-fg"
                  style={{
                    background: own
                      ? "color-mix(in srgb, var(--color-accent) 16%, var(--color-surface-2))"
                      : "var(--color-surface-2)",
                  }}
                >
                  {m.text}
                </div>
              </div>
            );
          })
        )}
      </div>
      <form onSubmit={submit} className="flex shrink-0 gap-2 border-t border-grid p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={connected ? "메시지 입력…" : "연결 중…"}
          maxLength={300}
          disabled={!connected}
          spellCheck={false}
          className="h-9 flex-1 rounded-md border border-grid bg-surface-2 px-2.5 text-sm text-fg outline-none transition-colors focus:border-[color:var(--color-accent)] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!connected || !text.trim()}
          className="focus-ring h-9 shrink-0 rounded-md bg-fg px-3 text-xs font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          전송
        </button>
      </form>
    </div>
  );
}
