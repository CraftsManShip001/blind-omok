"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSocket } from "@/components/SocketProvider";
import type { ChatMessage, ClientGameState, Coord } from "@/lib/types";
import { Board } from "./Board";
import { MemoryLedger } from "./MemoryLedger";
import { SidePanel } from "./SidePanel";

const CENTER: Coord = { x: 7, y: 7 };
const BOARD_MAX = "min(64vh, 620px)";

export function RoomClient({ code }: { code: string }) {
  const router = useRouter();
  const { socket, connected, pushToast } = useSocket();

  const [state, setState] = useState<ClientGameState | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [draining, setDraining] = useState(false);
  const [specReveal, setSpecReveal] = useState(false);
  const [highlightN, setHighlightN] = useState<number | null>(null);
  const [showCoords, setShowCoords] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const wasRevealed = useRef(false);

  // subscribe to room snapshots + chat
  useEffect(() => {
    if (!socket) return;
    const onState = (s: ClientGameState) => {
      if (s.code !== code) return;
      setState(s);
      setJoinError(null);
    };
    const onChat = (m: ChatMessage) => setMessages((prev) => [...prev, m]);
    const onChatHistory = (msgs: ChatMessage[]) => setMessages(msgs);
    socket.on("state", onState);
    socket.on("chat", onChat);
    socket.on("chatHistory", onChatHistory);
    return () => {
      socket.off("state", onState);
      socket.off("chat", onChat);
      socket.off("chatHistory", onChatHistory);
    };
  }, [socket, code]);

  // (re)join whenever we have a live connection
  useEffect(() => {
    if (!socket || !connected) return;
    socket.emit("joinRoom", { code }, (res) => {
      if (!res.ok) setJoinError(res.error ?? "방을 찾을 수 없습니다.");
    });
  }, [socket, connected, code]);

  const isSpectator = state?.you.role === "spectator";
  const showLedger = !!state?.you.canSeeLedger; // spectators, or after game end
  const myPid = state?.you.pid ?? null;

  // reset spectator reveal on each new game
  useEffect(() => {
    setSpecReveal(false);
  }, [state?.rematchSerial]);

  // drive the reveal / drain cascade
  useEffect(() => {
    const finished = state?.status === "finished";
    const want = !!finished || (!!isSpectator && specReveal);
    if (want) {
      setDraining(false);
      let r2 = 0;
      const r1 = requestAnimationFrame(() => {
        r2 = requestAnimationFrame(() => {
          setRevealed(true);
          wasRevealed.current = true;
        });
      });
      return () => {
        cancelAnimationFrame(r1);
        cancelAnimationFrame(r2);
      };
    }
    setRevealed(false);
    if (wasRevealed.current) {
      wasRevealed.current = false;
      setDraining(true);
      const t = setTimeout(() => setDraining(false), 750);
      return () => clearTimeout(t);
    }
  }, [state?.status, state?.rematchSerial, isSpectator, specReveal]);

  const revealOrigin: Coord = useMemo(() => {
    if (
      state?.status === "finished" &&
      state.endReason === "win" &&
      state.lastMove
    ) {
      return { x: state.lastMove.x, y: state.lastMove.y };
    }
    return CENTER;
  }, [state?.status, state?.endReason, state?.lastMove]);

  const canPlay =
    !!state &&
    connected &&
    state.status === "playing" &&
    state.you.role === "player" &&
    state.you.index === state.turn;

  const onPlace = useCallback(
    (x: number, y: number) => {
      socket?.emit("placeStone", { x, y });
    },
    [socket],
  );

  const onRematch = useCallback(() => socket?.emit("rematch"), [socket]);

  const onSendChat = useCallback(
    (text: string) => socket?.emit("chat", { message: text }),
    [socket],
  );

  const onLeave = useCallback(() => {
    socket?.emit("leaveRoom");
    router.push("/");
  }, [socket, router]);

  const onCopyCode = useCallback(async () => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/room/${code}`
        : code;
    try {
      await navigator.clipboard.writeText(url);
      pushToast("success", "초대 링크를 복사했어요.");
    } catch {
      pushToast("info", `방 코드: ${code}`);
    }
  }, [code, pushToast, code]);

  if (joinError) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
        <p className="text-lg font-semibold text-fg">{joinError}</p>
        <p className="mono text-xs text-muted">방이 닫혔거나 코드가 잘못되었을 수 있어요.</p>
        <Link
          href="/"
          className="focus-ring rounded-full bg-fg px-5 py-2.5 text-sm font-semibold text-bg"
        >
          홈으로
        </Link>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3">
        <div
          className="h-8 w-8 rounded-full"
          style={{
            background: "var(--color-stone)",
            animation: "turn-breathe 1.2s ease-in-out infinite",
          }}
        />
        <p className="mono text-xs text-muted">방에 들어가는 중…</p>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-bg">
      <header className="flex shrink-0 items-center justify-between border-b border-grid px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
            <circle cx="9" cy="12" r="6.5" fill="var(--color-stone)" />
            <circle
              cx="15"
              cy="12"
              r="6.5"
              fill="none"
              stroke="var(--color-stone-edge)"
              strokeWidth="1.2"
            />
          </svg>
          <span className="hidden text-sm font-semibold tracking-tight text-fg sm:inline">
            블라인드 오목
          </span>
        </Link>
        <span className="micro-label">MOVE {state.moveCount}</span>
      </header>

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="flex min-h-0 flex-1 flex-col">
          <TurnBanner state={state} isSpectator={!!isSpectator} />
          <div className="flex min-h-0 flex-1 items-center justify-center gap-3 p-4 sm:p-6">
            <div className="w-full" style={{ maxWidth: BOARD_MAX }}>
              <div
                style={{
                  borderRadius: 12,
                  boxShadow:
                    "0 24px 60px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.4)",
                }}
              >
                <Board
                  stones={state.stones}
                  lastMoveN={state.lastMove?.n ?? null}
                  winLine={state.winLine}
                  revealed={revealed}
                  draining={draining}
                  revealOrigin={revealOrigin}
                  canPlay={canPlay}
                  onPlace={onPlace}
                  highlightN={highlightN}
                  showCoords={showCoords}
                />
              </div>
            </div>
            {showLedger && (
              <aside
                className="hidden h-full w-[150px] shrink-0 self-center overflow-hidden rounded-xl border border-grid bg-surface md:block"
                style={{ maxHeight: BOARD_MAX }}
              >
                <MemoryLedger
                  stones={state.stones}
                  lastMoveN={state.lastMove?.n ?? null}
                  revealed={revealed}
                  highlightN={highlightN}
                  onHighlight={setHighlightN}
                />
              </aside>
            )}
          </div>
        </section>

        <aside className="flex min-h-0 shrink-0 flex-col border-t border-grid bg-surface lg:h-full lg:w-[360px] lg:border-l lg:border-t-0">
          <SidePanel
            state={state}
            revealed={revealed}
            isSpectator={!!isSpectator}
            specReveal={specReveal}
            onToggleReveal={setSpecReveal}
            showCoords={showCoords}
            onToggleCoords={setShowCoords}
            onCopyCode={onCopyCode}
            onRematch={onRematch}
            onLeave={onLeave}
            messages={messages}
            myPid={myPid}
            connected={connected}
            onSendChat={onSendChat}
          />
        </aside>
      </main>
    </div>
  );
}

function TurnBanner({
  state,
  isSpectator,
}: {
  state: ClientGameState;
  isSpectator: boolean;
}) {
  let text = "";
  let accent = false;

  if (state.status === "waiting") {
    text = "상대를 기다리는 중…";
  } else if (state.status === "finished") {
    text = "게임 종료 — 색이 공개됐어요";
  } else if (isSpectator) {
    const nick = state.players[state.turn]?.nickname ?? "플레이어";
    text = `관전 중 · ${nick} 차례`;
  } else if (state.you.index === state.turn) {
    text = "내 차례 — 어디에 뒀는지 기억하세요";
    accent = true;
  } else {
    text = "상대 차례";
  }

  return (
    <div className="flex shrink-0 items-center justify-center px-4 py-2.5">
      <span
        className="text-sm"
        style={{
          color: accent ? "var(--color-fg)" : "var(--color-muted)",
          animation: accent ? "turn-breathe 2.4s ease-in-out infinite" : "none",
        }}
      >
        {text}
      </span>
    </div>
  );
}
