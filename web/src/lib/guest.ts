/* Signed guest cookie — HMAC over payload with AUTH_SECRET (edge-verifiable).
   Guest mode grants the demo experience; real accounts use NextAuth. */

const enc = new TextEncoder();

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(process.env.AUTH_SECRET ?? "dev"),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Buffer.from(sig).toString("base64url");
}

export async function signGuest(role: string, district: string | null): Promise<string> {
  const payload = JSON.stringify({ role, district, exp: Date.now() + 8 * 3600_000 });
  const b64 = Buffer.from(payload).toString("base64url");
  return `${b64}.${await hmac(b64)}`;
}

export async function verifyGuest(cookie: string | undefined):
  Promise<{ role: string; district: string | null } | null> {
  if (!cookie) return null;
  const [b64, sig] = cookie.split(".");
  if (!b64 || !sig) return null;
  if ((await hmac(b64)) !== sig) return null;
  try {
    const p = JSON.parse(Buffer.from(b64, "base64url").toString());
    if (p.exp < Date.now()) return null;
    return { role: p.role, district: p.district ?? null };
  } catch {
    return null;
  }
}
