import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { createHash, timingSafeEqual } from "crypto";

/* Demo user directory — per-user credentials with hashed passwords.
   Production swaps this provider for RajSSO/Parichay OIDC (SECURITY.md);
   the session/middleware architecture stays identical. TOTP hook point is
   the `authorize` step (optional per plan; disabled in demo). */

export type Role = "secretary" | "district_officer" | "analyst";

const sha = (s: string) => createHash("sha256").update(s).digest();

// password hashes for: secretary→"jal-secretary-2026", officer→"jal-officer-2026",
// analyst→"jal-analyst-2026" (demo creds, shown on the login page)
const USERS: Record<string, { hash: Buffer; role: Role; district: string | null; name: string }> = {
  "secretary@jal": { hash: sha("jal-secretary-2026"), role: "secretary", district: null, name: "Secretary (demo)" },
  "officer.jodhpur@jal": { hash: sha("jal-officer-2026"), role: "district_officer", district: "Jodhpur", name: "DO Jodhpur (demo)" },
  "officer.nagaur@jal": { hash: sha("jal-officer-2026"), role: "district_officer", district: "Nagaur", name: "DO Nagaur (demo)" },
  "analyst@jal": { hash: sha("jal-analyst-2026"), role: "analyst", district: null, name: "Analyst (demo)" },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,  // required for self-hosted next start; Vercel is auto-trusted
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { username: {}, password: {} },
      authorize(creds) {
        const u = USERS[String(creds?.username ?? "").toLowerCase().trim()];
        if (!u) return null;
        const given = sha(String(creds?.password ?? ""));
        if (given.length !== u.hash.length || !timingSafeEqual(given, u.hash)) return null;
        return { id: String(creds!.username), name: u.name, role: u.role, district: u.district } as never;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: Role }).role;
        token.district = (user as { district: string | null }).district;
      }
      return token;
    },
    session({ session, token }) {
      (session.user as { role?: Role; district?: string | null }).role = token.role as Role;
      (session.user as { role?: Role; district?: string | null }).district =
        (token.district as string | null) ?? null;
      return session;
    },
  },
});
