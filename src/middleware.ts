import { NextResponse, type NextRequest } from "next/server";

/**
 * Gate de acceso al reporte editorial BlackPrint × Mirando por México.
 *
 * Edge middleware ligero — verifica la cookie `bp_auth` en cada request y
 * redirige a `/login` si falta o no es válida. Rutas públicas: login y su API,
 * estáticos de Next.js, logos. El secreto real es la contraseña (no la cookie).
 */
const AUTH_COOKIE = "bp_auth";
const AUTH_TOKEN = "mpm-2026"; // valor de cookie; debe coincidir con /api/login

const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/api/login",
  "/_next",
  "/favicon.ico",
  "/logos",
  "/robots.txt",
  "/sitemap.xml",
];

function isPublic(pathname: string): boolean {
  for (const p of PUBLIC_PATH_PREFIXES) {
    if (pathname === p || pathname.startsWith(`${p}/`) || pathname.startsWith(p + ".")) {
      return true;
    }
  }
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  if (request.cookies.get(AUTH_COOKIE)?.value === AUTH_TOKEN) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
