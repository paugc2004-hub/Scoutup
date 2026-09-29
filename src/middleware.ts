import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Protecció de rutes: sense cookie de sessió → pantalla d'entrada. (La validació real es fa al servidor.) */
export function middleware(req: NextRequest) {
  if (!req.cookies.get("su_session")?.value) {
    const url = req.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/club/:path*", "/jugador/:path*", "/tutor/:path*", "/notificacions/:path*"] };
