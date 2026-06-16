"use client";

import type { ChatMessage, ClientGameState, PlayerIndex } from "@/lib/types";
import { ChatPanel } from "./ChatPanel";

interface SidePanelProps {
  state: ClientGameState;
  revealed: boolean;
  isSpectator: boolean;
  specReveal: boolean;
  onToggleReveal: (v: boolean) => void;
  showCoords: boolean;
  onToggleCoords: (v: boolean) => void;
  onCopyCode: () => void;
  onRematch: () => void;
  onLeave: () => void;
  messages: ChatMessage[];
  myPid: string | null;
  connected: boolean;
  onSendChat: (text: string) => void;
}

/** Reveal swatch for a player seat: index 0 = 흑(black), index 1 = 백(white). */
function swatchStyle(index: PlayerIndex, revealed: boolean): React.CSSProperties {
  if (!revealed) return { background: "var(--color-stone)" };
  return index === 0
    ? { background: "#0c0c0e", boxShadow: "inset 0 0 0 1px var(--color-black-edge)" }
    : { background: "#f0f0f2" };
}

export function SidePanel({
  state,
  revealed,
  isSpectator,
  specReveal,
  onToggleReveal,
  showCoords,
  onToggleCoords,
  onCopyCode,
  onRematch,
  onLeave,
  messages,
  myPid,
  connected,
  onSendChat,
}: SidePanelProps) {
  const myIndex = state.you.index;
  const finished = state.status === "finished";
  const playing = state.status === "playing";

  const statusChip = isSpectator
    ? "관전 중"
    : state.status === "waiting"
      ? "대기 중"
      : playing
        ? "진행 중"
        : "종료";

  const iVoted = myIndex !== null && state.rematchVotes.includes(myIndex);
  const oppIndex: PlayerIndex = myIndex === 0 ? 1 : 0;
  const oppVoted = state.rematchVotes.includes(oppIndex);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0">
        {/* ROOM */}
        <section className="flex flex-col gap-2.5 p-5">
          <div className="flex items-center justify-between">
            <span className="micro-label">ROOM</span>
            <span className="micro-label rounded border border-grid px-2 py-0.5 text-fg">
              {statusChip}
            </span>
          </div>
          <button
            onClick={onCopyCode}
            className="focus-ring group flex items-center justify-between rounded-lg border border-grid bg-surface-2 px-3 py-2.5 transition-colors hover:border-[color:var(--color-accent)]"
            title="초대 링크 복사"
          >
            <span className="mono text-xl tracking-[0.25em] text-fg">{state.code}</span>
            <span className="mono text-[10px] uppercase tracking-wider text-muted group-hover:text-fg">
              복사
            </span>
          </button>
          {state.status === "waiting" && !isSpectator && (
            <p className="text-xs leading-relaxed text-muted">
              이 코드를 친구에게 보내면 함께 둘 수 있어요. 상대가 들어오면 바로 시작합니다.
            </p>
          )}
        </section>

        <div className="divider mx-5" />

        {/* PLAYERS */}
        <section className="flex flex-col gap-2 p-5">
          <span className="micro-label">PLAYERS</span>
          {[0, 1].map((i) => {
            const idx = i as PlayerIndex;
            const p = state.players[idx];
            const active = playing && state.turn === idx;
            return (
              <div
                key={i}
                className="relative flex items-center gap-3 rounded-lg py-2 pl-3 pr-2"
                style={{ background: active ? "var(--color-surface-2)" : "transparent" }}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full"
                    style={{ background: "var(--color-accent)" }}
                  />
                )}
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold"
                  style={{
                    borderColor: "var(--color-grid)",
                    color: p ? "var(--color-fg)" : "var(--color-muted)",
                  }}
                >
                  {p ? p.nickname.slice(0, 1).toUpperCase() : "·"}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-1.5 truncate text-sm text-fg">
                    {p ? p.nickname : "빈 자리"}
                    {p && idx === myIndex && (
                      <span className="mono text-[10px] text-muted">나</span>
                    )}
                    {p && revealed && (
                      <span className="mono text-[10px] text-muted">
                        {idx === 0 ? "흑" : "백"}
                      </span>
                    )}
                  </span>
                  <span className="mono text-[10px] text-muted">
                    {!p
                      ? "대기 중"
                      : !p.connected
                        ? "연결 끊김"
                        : active
                          ? "착수 차례"
                          : "대기"}
                  </span>
                </div>
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-full"
                  style={{
                    ...swatchStyle(idx, revealed),
                    transition: "background-color 200ms linear",
                    opacity: active ? 1 : 0.85,
                    animation: active ? "turn-breathe 2s ease-in-out infinite" : "none",
                  }}
                />
              </div>
            );
          })}
        </section>

        {/* SPECTATORS */}
        {state.spectators.length > 0 && (
          <>
            <div className="divider mx-5" />
            <section className="flex flex-col gap-2 p-5">
              <span className="micro-label">SPECTATORS · {state.spectators.length}</span>
              <div className="flex max-h-20 flex-wrap gap-1.5 overflow-y-auto">
                {state.spectators.map((s) => (
                  <span
                    key={s.id}
                    className="mono max-w-full truncate rounded border border-grid px-2 py-1 text-xs text-muted"
                  >
                    {s.nickname}
                  </span>
                ))}
              </div>
            </section>
          </>
        )}

        {/* spectator reveal toggle */}
        {isSpectator && (
          <>
            <div className="divider mx-5" />
            <section className="flex flex-col gap-2.5 p-5">
              <span className="micro-label">색 공개</span>
              <div className="flex rounded-lg border border-grid bg-surface-2 p-1">
                {(["blind", "reveal"] as const).map((mode) => {
                  const isOn = mode === "reveal" ? specReveal : !specReveal;
                  return (
                    <button
                      key={mode}
                      onClick={() => onToggleReveal(mode === "reveal")}
                      disabled={finished}
                      className={`mono flex-1 rounded-md py-1.5 text-xs uppercase tracking-wider transition-colors disabled:opacity-40 ${
                        isOn ? "bg-[color:var(--color-surface)] text-fg" : "text-muted"
                      }`}
                    >
                      {mode === "blind" ? "BLIND" : "REVEAL"}
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {/* result + actions */}
        <div className="divider mx-5" />
        <section className="flex flex-col gap-3 p-5">
          {finished && <ResultLine state={state} myIndex={myIndex} />}

          <div className="flex items-center justify-between">
            <span className="micro-label">좌표 표시</span>
            <button
              onClick={() => onToggleCoords(!showCoords)}
              className={`mono rounded-md border px-2.5 py-1 text-[11px] uppercase tracking-wider transition-colors ${
                showCoords
                  ? "border-[color:var(--color-accent)] text-fg"
                  : "border-grid text-muted"
              }`}
            >
              {showCoords ? "ON" : "OFF"}
            </button>
          </div>

          {finished && !isSpectator && (
            <button
              onClick={onRematch}
              disabled={iVoted}
              className="focus-ring h-11 rounded-full bg-fg text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {iVoted ? "상대 기다리는 중…" : oppVoted ? "재대국 (상대 수락함)" : "재대국"}
            </button>
          )}
          {oppVoted && !iVoted && !isSpectator && finished && (
            <p className="text-center text-[11px] text-[color:var(--color-accent-2)]">
              상대가 재대국을 원해요
            </p>
          )}

          <button
            onClick={onLeave}
            className="focus-ring h-10 rounded-full border border-grid text-sm text-muted transition-colors hover:border-[color:var(--color-danger)] hover:text-fg"
          >
            나가기
          </button>
        </section>
      </div>

      {/* CHAT fills remaining height */}
      <div className="min-h-0 flex-1 border-t border-grid">
        <ChatPanel
          messages={messages}
          myPid={myPid}
          connected={connected}
          onSend={onSendChat}
        />
      </div>
    </div>
  );
}

function ResultLine({
  state,
  myIndex,
}: {
  state: ClientGameState;
  myIndex: PlayerIndex | null;
}) {
  let title: string;
  let tone: "win" | "muted" = "muted";

  if (state.winner !== null) {
    const nick = state.players[state.winner]?.nickname ?? "플레이어";
    const verb = state.endReason === "forfeit" ? "부전승" : "승리";
    title = myIndex === state.winner ? `나의 ${verb}` : `${nick} ${verb}`;
    tone = "win";
  } else if (state.endReason === "draw") {
    title = "무승부";
  } else {
    title = "게임 종료";
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="micro-label">RESULT</span>
      <span
        className="text-2xl font-semibold tracking-tight"
        style={{ color: tone === "win" ? "var(--color-win)" : "var(--color-fg)" }}
      >
        {title}
      </span>
    </div>
  );
}
