import { api, apiStaff, clientIp, rateLimit } from "@/server/api";
import { resetDatabase } from "@/server/db/client";
import { destroySession } from "@/server/auth/session";
import { audit } from "@/server/security/audit";
import { log } from "@/server/log";

/**
 * Torna a carregar totes les dades de demostració (esborra els canvis fets durant la demo).
 * Només la direcció esportiva (permís demo.reset). Abans era accessible sense sessió.
 */
export const POST = api(async () => {
  const u = await apiStaff("demo.reset");
  rateLimit("reset", await clientIp());
  const { ms } = resetDatabase();
  // l'auditoria anterior s'esborra amb el reset: deixem constància al log i a la nova base de dades
  log.info("demo.reset", { actor: u.id, ms });
  audit({ actor: null, clubId: u.club_id, action: "demo.reset", detail: `restaurada per ${u.email}` });
  await destroySession();
  return { ok: true, ms };
});
