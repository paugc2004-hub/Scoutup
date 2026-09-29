import { z } from "zod";
import { api, ApiError, body } from "@/server/api";
import { get } from "@/server/db/client";
import { createSession, destroySession, homeFor } from "@/server/auth/session";
import type { Role } from "@/lib/domain";

const EMAILS: Record<string, string> = {
  director: "director@scoutup.demo",
  coach: "coach@scoutup.demo",
  player: "player@scoutup.demo",
  guardian: "tutor@scoutup.demo",
};
const Schema = z.object({ role: z.enum(["director", "coach", "player", "guardian"]) });

/** Entrada ràpida amb els usuaris de demo (només comptes marcats com a demo). */
export const POST = api(async (req) => {
  const { role } = Schema.parse(await body(req));
  const u = get<{ id: string; role: Role }>("SELECT id, role FROM users WHERE email = ? AND is_demo_login = 1", EMAILS[role]);
  if (!u) throw new ApiError(404, "Usuari de demo no trobat. Reinicia les dades de la demo.");
  await destroySession();
  await createSession(u.id);
  return { ok: true, redirect: homeFor(u) };
});
