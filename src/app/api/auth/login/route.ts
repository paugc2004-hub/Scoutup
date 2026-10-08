import { z } from "zod";
import { api, ApiError, body, clientIp, rateLimit } from "@/server/api";
import { get } from "@/server/db/client";
import { verifyPassword } from "@/server/auth/password";
import { createSession, homeFor } from "@/server/auth/session";
import { audit } from "@/server/security/audit";
import { zEmail } from "@/server/validation";
import type { Role } from "@/lib/domain";

const Schema = z.object({ email: zEmail, password: z.string().min(1).max(200) });

export const POST = api(async (req) => {
  const { email, password } = Schema.parse(await body(req));
  const ip = await clientIp();
  rateLimit("loginIp", ip);
  rateLimit("login", `${ip}:${email}`);
  const u = get<{ id: string; password_hash: string; role: Role; player_id: string | null; club_id: string | null; status: string }>("SELECT id, password_hash, role, player_id, club_id, status FROM users WHERE lower(email) = lower(?)", email);
  // mateix missatge per a usuari inexistent, contrasenya incorrecta o compte desactivat (no revela quins comptes existeixen)
  if (!u || !verifyPassword(password, u.password_hash) || u.status !== "active") {
    audit({ actor: u ? { id: u.id, club_id: u.club_id } : null, action: "auth.login", result: "denied", detail: u ? (u.status !== "active" ? "compte desactivat" : "contrasenya incorrecta") : "usuari inexistent" });
    throw new ApiError(401, "Correu o contrasenya incorrectes.");
  }
  await createSession(u.id);
  audit({ actor: { id: u.id, club_id: u.club_id }, action: "auth.login" });
  let home = homeFor(u);
  if (u.role === "player" && u.player_id) {
    const p = get<{ onboarding_done: number }>("SELECT onboarding_done FROM players WHERE id = ?", u.player_id);
    if (p && !p.onboarding_done) home = "/jugador/perfil/editar";
  }
  return { ok: true, redirect: home };
});
