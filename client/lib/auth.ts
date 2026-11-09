const SESSION_KEY = "shm_session_v2";
const LEGACY_KEY = "isLoggedIn";
export const SESSION_DURATION_MS = 720 * 60 * 60 * 1000; // 30 jours

export interface Credentials {
  lastName: string;
  firstName: string;
  birthDate: string;
  pin: string;
  password: string;
}

export async function login(credentials: Credentials): Promise<boolean> {
  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) return false;
  const result = await response.json() as { ok?: boolean };
  if (!result.ok) return false;

  const now = Date.now();
  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ v: 1, issuedAt: now, expiresAt: now + SESSION_DURATION_MS }),
    );
    localStorage.removeItem(LEGACY_KEY);
    return true;
  } catch {
    return false;
  }
}

export function isSessionValid(): boolean {
  try {
    localStorage.removeItem(LEGACY_KEY);
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const { expiresAt } = JSON.parse(raw) as { expiresAt?: number };
    const now = Date.now();
    if (typeof expiresAt !== "number" || expiresAt <= now || expiresAt - now > SESSION_DURATION_MS) {
      localStorage.removeItem(SESSION_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Ignore storage errors.
  }
}
