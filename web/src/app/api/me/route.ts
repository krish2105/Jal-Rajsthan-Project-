import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { verifyGuest } from "@/lib/guest";

export async function GET() {
  const session = await auth();
  if (session?.user) {
    const u = session.user as { name?: string; role?: string; district?: string | null };
    return NextResponse.json({
      mode: "account", name: u.name, role: u.role, district: u.district ?? null,
    });
  }
  const jar = await cookies();
  const g = await verifyGuest(jar.get("jal-guest")?.value);
  if (g) return NextResponse.json({ mode: "guest", name: "Guest", ...g });
  return NextResponse.json({ mode: "anonymous" }, { status: 401 });
}
