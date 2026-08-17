import { NextResponse } from "next/server";
import { signGuest } from "@/lib/guest";

const GUEST_CODE = "JAL2026";
const ROLES = new Set(["secretary", "district_officer", "analyst"]);

export async function POST(req: Request) {
  const { code, role, district } = await req.json().catch(() => ({}));
  if (String(code ?? "").toUpperCase() !== GUEST_CODE || !ROLES.has(role)) {
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true, role, district: district ?? null });
  res.cookies.set("jal-guest", await signGuest(role, district ?? null), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    maxAge: 8 * 3600, path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("jal-guest", "", { maxAge: 0, path: "/" });
  return res;
}
