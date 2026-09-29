import { api } from "@/server/api";
import { resetDatabase } from "@/server/db/client";
import { destroySession } from "@/server/auth/session";

/** Torna a carregar totes les dades de demostració (esborra els canvis fets durant la demo). */
export const POST = api(async () => {
  const { ms } = resetDatabase();
  await destroySession();
  return { ok: true, ms };
});
