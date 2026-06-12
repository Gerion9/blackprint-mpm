import { NextResponse, type NextRequest } from "next/server";

/**
 * Gate de acceso (COSMÉTICO) al reporte editorial BlackPrint × Mirando por México.
 *
 * Edge middleware ligero. OJO (decisión explícita): NO es una protección de datos
 * real — el token de cookie está en el repo y los datos DENUE/CLUES son públicos en
 * origen. `/data` se EXCLUYE del gate (vía matcher y rutas públicas) para que los
 * fetch del mapa no pasen por el Edge en cada navegación (bug de performance) y para
 * no vender el login como «datos protegidos». Endurecer auth (HMAC, password en env)
 * es un ticket aparte, fuera del alcance del mapa.
 */
const AUTH_COOKIE = "bp_auth";
const AUTH_TOKEN = "mpm-2026"; // valor de cookie; debe coincidir con /api/login

const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/api/login",
  "/_next",
  "/favicon.ico",
  "/logos",
  "/img",
  "/data",
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
  // Excluye estáticos, logos y /data (datos públicos del mapa) para no ejecutar el
  // Edge Middleware en cada GET de 3.4MB de clínicas / shards geográficos.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|data|logos|img).*)"],
};
