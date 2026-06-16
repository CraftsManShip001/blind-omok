"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "./SocketProvider";

export function Lobby() {
  const router = useRouter();
  const { socket, connected, nickname, setNickname, pushToast } = useSocket();
  const [searching, setSearching] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  // Matchmaking + room-creation event wiring.
  useEffect(() => {
    if (!socket) return;
    const onMatched = ({ code }: { code: string }) => {
      setSearching(false);
      router.push(`/room/${code}`);
    };
    const onQueue = ({ status }: { status: "searching" | "cancelled" }) => {
      setSearching(status === "searching");
    };
    socket.on("matched", onMatched);
    socket.on("queue", onQueue);
    return () => {
      socket.off("matched", onMatched);
      socket.off("queue", onQueue);
    };
  }, [socket, router]);

  // Stop searching if the connection drops.
  useEffect(() => {
    if (!connected) setSearching(false);
  }, [connected]);

  const quickMatch = () => {
    if (!socket || !connected) return;
    setSearching(true);
    socket.emit("quickMatch");
  };

  const cancelMatch = () => {
    socket?.emit("cancelQuickMatch");
    setSearching(false);
  };

  const createRoom = () => {
    if (!socket || !connected || busy) return;
    setBusy(true);
    socket.emit("createRoom", (res) => {
      setBusy(false);
      if (res.ok && res.code) router.push(`/room/${res.code}`);
      else pushToast("error", res.error ?? "방을 만들지 못했습니다.");
    });
  };

  const submitJoin = () => {
    const c = code.trim().toUpperCase();
    if (c.length < 4) {
      pushToast("warn", "방 코드를 확인해 주세요.");
      return;
    }
    router.push(`/room/${c}`);
  };

  return (
    <div className="flex w-full flex-col gap-6">
      {/* nickname */}
      <label className="flex flex-col gap-2">
        <span className="micro-label">닉네임</span>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="익명의 기억가"
          maxLength={16}
          spellCheck={false}
          className="mono w-full border-b border-grid bg-transparent pb-2 text-lg text-fg outline-none transition-colors duration-150 placeholder:text-muted/60 focus:border-[color:var(--color-accent)]"
        />
      </label>

      {/* actions */}
      <div className="flex flex-col gap-3">
        <button
          onClick={quickMatch}
          disabled={!connected || searching}
          className="focus-ring group relative flex h-12 items-center justify-center rounded-full bg-fg text-base font-semibold text-bg transition-all duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          랜덤 매칭
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={createRoom}
            disabled={!connected || busy}
            className="focus-ring h-12 rounded-full border border-grid text-sm font-medium text-fg transition-colors duration-150 hover:border-[color:var(--color-accent)] hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
          >
            방 만들기
          </button>
          <button
            onClick={() => setShowJoin((v) => !v)}
            disabled={!connected}
            aria-expanded={showJoin}
            className="focus-ring h-12 rounded-full border border-grid text-sm font-medium text-fg transition-colors duration-150 hover:border-[color:var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            방 코드 입력
          </button>
        </div>

        {showJoin && (
          <div className="animate-rise flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && submitJoin()}
              placeholder="예: 7KQF2"
              maxLength={8}
              autoFocus
              spellCheck={false}
              className="mono h-11 flex-1 rounded-lg border border-grid bg-surface-2 px-3 text-base tracking-[0.2em] text-fg outline-none transition-colors focus:border-[color:var(--color-accent)]"
            />
            <button
              onClick={submitJoin}
              className="focus-ring h-11 shrink-0 rounded-lg bg-[color:var(--color-accent)] px-5 text-sm font-semibold text-fg transition-opacity hover:opacity-90"
            >
              입장
            </button>
          </div>
        )}
      </div>

      {/* searching overlay */}
      {searching && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-bg/80 backdrop-blur-sm">
          <div className="animate-rise flex flex-col items-center gap-6 px-6 text-center">
            <SearchingPulse />
            <div className="flex flex-col gap-1.5">
              <p className="text-lg font-semibold text-fg">상대를 찾는 중…</p>
              <p className="mono text-xs text-muted">매칭이 되면 자동으로 입장합니다</p>
            </div>
            <button
              onClick={cancelMatch}
              className="focus-ring rounded-full border border-grid px-5 py-2 text-sm text-muted transition-colors hover:border-[color:var(--color-danger)] hover:text-fg"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SearchingPulse() {
  return (
    <div className="relative h-16 w-16">
      <span
        className="absolute inset-0 rounded-full border border-[color:var(--color-accent)]"
        style={{ animation: "ping-dot 1.6s ease-out infinite" }}
      />
      <span
        className="absolute inset-[22%] rounded-full"
        style={{ background: "var(--color-stone)" }}
      />
    </div>
  );
}
