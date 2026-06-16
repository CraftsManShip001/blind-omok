"use client";

import type { Owner, SerializedStone } from "@/lib/types";
import { coordLabel } from "@/lib/board";

interface LedgerProps {
  stones: SerializedStone[];
  lastMoveN: number | null;
  revealed: boolean;
  highlightN: number | null;
  onHighlight: (n: number | null) => void;
}

function dotColor(owner: Owner, revealed: boolean): string {
  if (!revealed || owner === null) return "var(--color-stone)";
  return owner === 0 ? "#0c0c0e" : "#f0f0f2"; // 흑 / 백
}

export function MemoryLedger({
  stones,
  lastMoveN,
  revealed,
  highlightN,
  onHighlight,
}: LedgerProps) {
  // newest first
  const rows = [...stones].reverse();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="micro-label px-3 py-2.5">기보 · {stones.length}수</div>
      <div className="divider mx-3" />
      <ol
        className="min-h-0 flex-1 overflow-y-auto py-1"
        onMouseLeave={() => onHighlight(null)}
      >
        {rows.length === 0 && (
          <li className="px-3 py-3 text-xs text-muted">아직 둔 수가 없습니다.</li>
        )}
        {rows.map((s, i) => {
          const active = highlightN === s.n;
          const isLast = lastMoveN === s.n;
          return (
            <li key={s.n}>
              <button
                onMouseEnter={() => onHighlight(s.n)}
                onFocus={() => onHighlight(s.n)}
                className={`mono flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs transition-colors ${
                  active ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface-2/60"
                }`}
              >
                <span className="w-6 shrink-0 tabular-nums text-muted/70">
                  {s.n}
                </span>
                <span className="relative flex h-3 w-3 shrink-0 items-center justify-center">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      background: dotColor(s.owner, revealed),
                      transition: "background-color 120ms linear",
                      transitionDelay: revealed ? `${i * 24}ms` : "0ms",
                      boxShadow: active
                        ? "0 0 0 1.5px var(--color-accent)"
                        : isLast && !revealed
                          ? "0 0 0 1.5px var(--color-last)"
                          : revealed && s.owner === 0
                            ? "inset 0 0 0 1px var(--color-black-edge)"
                            : "none",
                    }}
                  />
                </span>
                <span className={active ? "text-fg" : ""}>{coordLabel(s.x, s.y)}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
