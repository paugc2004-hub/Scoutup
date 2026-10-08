import { z } from "zod";
import { api, ApiError, body, clientIp, rateLimit } from "@/server/api";
import { get } from "@/server/db/client";
import { createSession, destroySession, homeFor } from "@/server/auth/session";
import type { Role } from "@/lib/domain";

/** Comptes d'accés ràpid de la demo. Es poden desactivar en producció amb SCOUTUP_DEMO_LOGIN=off. */
const DEMO_ACCOUNTS = {
  director: "director@scoutup.demo",
  coordinator: "coordinacio@scoutup.demo",
  coach: "coach@scoutup.demo",
  clubB: "club-b@scoutup.demo",
  player: "player@scoutup.demo",
  guardian: "tutor@scoutup.demo",
} as const;
const Schema = z.object({ role: z.enum(["director", "coordinator", "coach", "clubB", "player", "guardian"]) });

/** Entrada ràpida amb els usuaris de demo (només comptes marcats com a demo i actius). */
export const POST = api(async (req) => {
  if (process.env.SCOUTUP_DEMO_LOGIN === "off") throw new ApiError(404, "No disponible.");
  rateLimit("demoLogin", await clientIp());
  const { role } = Schema.parse(await body(req));
  const u = get<{ id: string; role: Role }>("SELECT id, role FROM users WHERE email = ? AND is_demo_login = 1 AND status = 'active'", DEMO_ACCOUNTS[role]);
  if (!u) throw new ApiError(404, "Usuario de demo no encontrado. Restaura los datos de la demo.");
  await destroySession();
  await createSession(u.id);
  return { ok: true, redirect: homeFor(u) };
});
