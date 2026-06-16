// Per-tab identity + persisted nickname.
//
// clientId lives in sessionStorage: it survives a page reload (so a refresh
// reconnects to the same seat) but a brand-new tab gets a fresh identity — which
// is exactly what we want (a second tab can spectate the same room independently).
// nickname lives in localStorage so the user doesn't retype it every visit.

const CID_KEY = "bo:clientId";
const NICK_KEY = "bo:nickname";

export function getClientId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(CID_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `c_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    sessionStorage.setItem(CID_KEY, id);
  }
  return id;
}

export function getStoredNickname(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(NICK_KEY) ?? "";
}

export function storeNickname(nickname: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NICK_KEY, nickname);
}
