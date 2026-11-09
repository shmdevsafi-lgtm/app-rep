const SESSION_KEY = "shm_offline_session";
const LEGACY_SESSION_KEY = "isLoggedIn";
export const OFFLINE_SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

interface OfflineSession {
  version: 1;
  issuedAt: number;
  expiresAt: number;
}

export function startOfflineSession(): void {
  const now = Date.now();
  const session: OfflineSession = {
    version: 1,
    issuedAt: now,
    expiresAt: now + OFFLINE_SESSION_DURATION_MS,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.removeItem(LEGACY_SESSION_KEY);
}

export function hasValidOfflineSession(): boolean {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      localStorage.removeItem(LEGACY_SESSION_KEY);
      return false;
    }

    const session = JSON.parse(raw) as Partial<OfflineSession>;
    const now = Date.now();
    const valid =
      session.version === 1 &&
      Number.isFinite(session.issuedAt) &&
      Number.isFinite(session.expiresAt) &&
      (session.issuedAt as number) <= now &&
      (session.expiresAt as number) > now &&
      (session.expiresAt as number) - (session.issuedAt as number) <= OFFLINE_SESSION_DURATION_MS;

    if (!valid) clearOfflineSession();
    return valid;
  } catch {
    clearOfflineSession();
    return false;
  }
}

export function clearOfflineSession(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(LEGACY_SESSION_KEY);
}
