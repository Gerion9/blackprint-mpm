/**
 * /api/login — valida la contraseña editorial del reporte.
 *
 * El secreto puede vivir en `BP_REPORT_PASSWORD` (env var en Vercel) para no
 * quemarlo en el bundle; el fallback es la contraseña estándar de BlackPrint.
 * Cookie httpOnly + sameSite=strict (no leíble desde cliente), expira en 12 h.
 */
import { NextResponse } from "next/server";

export const runtime = "edge";

const AUTH_COOKIE = "bp_auth";
const AUTH_TOKEN = "mpm-2026"; // alinea con middleware.ts
const COOKIE_MAX_AGE_SEC = 12 * 60 * 60;

function expectedPassword(): string {
  const v = process.env.BP_REPORT_PASSWORD;
  return typeof v === "string" && v.length > 0 ? v : "blackprint2026";
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad-json" }, { status: 400 });
  }
  const password =
    body && typeof body === "object" && "password" in body
      ? String((body as { password?: unknown }).password ?? "")
      : "";

  if (password.length === 0) {
    return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });
  }
  if (password !== expectedPassword()) {
    await new Promise((r) => setTimeout(r, 350)); // disuade brute-force casual
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, AUTH_TOKEN, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SEC,
  });
  return res;
}

export async function DELETE(): Promise<Response> {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
