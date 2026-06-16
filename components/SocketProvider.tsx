"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@/lib/types";
import {
  getClientId,
  getStoredNickname,
  storeNickname,
} from "@/lib/clientId";

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type ToastKind = "info" | "success" | "warn" | "error";
export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface SocketContextValue {
  socket: AppSocket | null;
  connected: boolean;
  clientId: string;
  nickname: string;
  setNickname: (n: string) => void;
  online: number;
  toasts: Toast[];
  pushToast: (kind: ToastKind, message: string) => void;
  dismissToast: (id: number) => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used within <SocketProvider>");
  return ctx;
}

let toastSeq = 1;

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<AppSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [online, setOnline] = useState(0);
  const [clientId, setClientId] = useState("");
  const [nickname, setNick] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nickRef = useRef("");

  const pushToast = useCallback((kind: ToastKind, message: string) => {
    const id = toastSeq++;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3400);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  useEffect(() => {
    const cid = getClientId();
    const nk = getStoredNickname();
    setClientId(cid);
    setNick(nk);
    nickRef.current = nk;

    const s: AppSocket = io({
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });
    setSocket(s);

    s.on("connect", () => {
      setConnected(true);
      s.emit("hello", { clientId: cid, nickname: nickRef.current });
    });
    s.on("disconnect", () => setConnected(false));
    s.on("online", (n) => setOnline(n));
    s.on("toast", ({ kind, message }) => pushToast(kind, message));
    s.on("roomError", ({ message }) => pushToast("error", message));

    return () => {
      s.removeAllListeners();
      s.close();
    };
  }, [pushToast]);

  const setNickname = useCallback(
    (n: string) => {
      const v = n.slice(0, 16);
      setNick(v);
      nickRef.current = v;
      storeNickname(v);
      socket?.emit("setNickname", { nickname: v.trim() || "익명" });
    },
    [socket],
  );

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        clientId,
        nickname,
        setNickname,
        online,
        toasts,
        pushToast,
        dismissToast,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}
