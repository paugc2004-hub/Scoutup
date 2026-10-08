import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function json(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * 1) Protecció CSRF (defensa en profunditat, a més de SameSite=Lax a la cookie):
 *    les peticions d'escriptura a /api han de venir del mateix origen i en JSON.
 *    Un formulari d'un altre domini no pot enviar application/json sense CORS.
 * 2) Rutes privades: sense cookie de sessió → pantalla d'entrada.
 *    (La validació real de la sessió, el rol i els permisos es fa sempre al servidor.)
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    if (MUTATING.has(req.method)) {
      const origin = req.headers.get("origin");
      const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
      if (origin) {
        let originHost = "";
        try {
          originHost = new URL(origin).host;
        } catch {
          return json(403, "Origen no permès.");
        }
        if (originHost !== host) return json(403, "Origen no permès.");
      } else if (req.headers.get("sec-fetch-site") === "cross-site") {
        return json(403, "Origen no permès.");
      }
      const ct = req.headers.get("content-type") ?? "";
      const hasBody = req.method !== "DELETE" && Number(req.headers.get("content-length") ?? "0") > 0;
      if (hasBody && !ct.toLowerCase().startsWith("application/json")) return json(415, "Format no admès: cal JSON.");
    }
    return NextResponse.next();
  }

  if (!req.cookies.get("su_session")?.value) {
    const url = req.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/api/:path*", "/club/:path*", "/jugador/:path*", "/tutor/:path*", "/notificacions/:path*"] };
