import type { Credentials, Session } from "./strava";

const SESSION_KEY = "gotc:strava-session";
const PENDING_KEY = "gotc:strava-pending";

type Pending = Credentials & { state: string };

function read<T>(storage: Storage, key: string): T | null {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(storage: Storage, key: string, value: unknown) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const loadSession = () => read<Session>(localStorage, SESSION_KEY);
export const saveSession = (s: Session) => write(localStorage, SESSION_KEY, s);

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(PENDING_KEY);
  } catch {}
}

/** Credentials entered before the redirect to Strava; consumed once when the user comes back with ?code. */
export const savePending = (p: Pending) => write(sessionStorage, PENDING_KEY, p);

export function takePending(): Pending | null {
  const p = read<Pending>(sessionStorage, PENDING_KEY);
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {}
  return p;
}
