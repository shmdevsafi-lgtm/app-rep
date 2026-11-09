const SESSION_KEY = "shm_session_v2";
const LEGACY_KEY = "isLoggedIn";
export const SESSION_DURATION_MS = 720 * 60 * 60 * 1000; // 30 jours
const ITERATIONS = 200_000;

export interface Credentials {
  lastName: string;
  firstName: string;
  birthDate: string;
  pin: string;
  password: string;
}

const enc = new TextEncoder();
const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");

const normalize = (c: Credentials) =>
  [c.lastName.trim().toLowerCase(), c.firstName.trim().toLowerCase(), c.birthDate.trim(), c.pin.trim(), c.password].join("|");

async function derive(secret: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: ITERATIONS },
    key,
    256,
  );
  return toHex(bits);
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function login(c: Credentials): Promise<boolean> {
  const expected = import.meta.env.VITE_AUTH_HASH as string | undefined;
  const salt = import.meta.env.VITE_AUTH_SALT as string | undefined;
  if (!expected || !salt) return false;
  const ok = safeEqual(await derive(normalize(c), salt), expected);
  if (ok) {
    const now = Date.now();
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ v: 1, issuedAt: now, expiresAt: now + SESSION_DURATION_MS }));
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      return false;
    }
  }
  return ok;
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
    /* ignore */
  }
}
