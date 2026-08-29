/**
 * Minimal admin-session helper for a single-operator monitoring view.
 *
 * This is deliberately lightweight, not a full auth system: one shared
 * password (ADMIN_PASSWORD, server-only env var), a signed cookie with an
 * expiry, no user accounts, no database table. That's an appropriate
 * trade-off here — this gates a read-only dashboard over data that's
 * already public-ish (referral/business summaries), not fund movement.
 * Actual money movement still requires a real wallet signature on-chain
 * regardless of this gate.
 *
 * Uses the Web Crypto API (`crypto.subtle`) rather than Node's `crypto`
 * module so the exact same code runs in both the Edge-runtime middleware
 * and the Node-runtime API route without any config changes.
 */

export const ADMIN_COOKIE_NAME = "admin_session";
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Builds a signed `exp.signature` token. Signature = sha256(password:exp). */
export async function createAdminSessionToken(): Promise<string> {
  const secret = process.env.ADMIN_PASSWORD ?? "";
  const exp = Date.now() + SESSION_LIFETIME_MS;
  const sig = await sha256Hex(`${secret}:${exp}`);
  return `${exp}.${sig}`;
}

export async function verifyAdminSessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return false;

  const [expStr, sig] = token.split(".");
  if (!expStr || !sig) return false;

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;

  const expectedSig = await sha256Hex(`${secret}:${exp}`);
  return sig === expectedSig;
}
