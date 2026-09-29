import { z } from "zod";
import { api, ApiError, body } from "@/server/api";
import { get } from "@/server/db/client";
import { verifyPassword } from "@/server/auth/password";
import { createSession, homeFor } from "@/server/auth/session";
import type { Role } from "@/lib/domain";

const Schema = z.object({ email: z.string().email("correu no vàlid"), password: z.string().min(1) });

export const POST = api(async (req) => {
  const { email, password } = Schema.parse(await body(req));
  const u = get<{ id: string; password_hash: string; role: Role; player_id: string | null }>("SELECT id, password_hash, role, player_id FROM users WHERE lower(email) = lower(?)", email.trim());
  if (!u || !verifyPassword(password, u.password_hash)) throw new ApiError(401, "Correu o contrasenya incorrectes.");
  await createSession(u.id);
  let home = homeFor(u);
  if (u.role === "player" && u.player_id) {
    const p = get<{ onboarding_done: number }>("SELECT onboarding_done FROM players WHERE id = ?", u.player_id);
    if (p && !p.onboarding_done) home = "/jugador/perfil/editar";
  }
  return { ok: true, redirect: home };
});
