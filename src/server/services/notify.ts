import { all, insert, nowIso, uid } from "@/server/db/client";
import { canSeeTeam } from "@/lib/permissions";

export type NotifyKind = "match" | "contact" | "application" | "event" | "message" | "profile" | "interest" | "system";

export function notify(userId: string | null | undefined, kind: NotifyKind, title: string, body: string | null = null, link: string | null = null) {
  if (!userId) return;
  insert("notifications", { id: uid("nt_"), user_id: userId, kind, title, body, link, created_at: nowIso(), read_at: null });
}

/** Notifica el personal d'un club: direcció i coordinació sempre; entrenadors, només si és el seu equip. */
export function notifyClub(clubId: string, teamId: string | null | undefined, kind: NotifyKind, title: string, body: string | null = null, link: string | null = null, exceptUserId?: string) {
  const staff = all<{ id: string; role: string; team_id: string | null }>("SELECT id, role, team_id FROM users WHERE club_id = ? AND role IN ('director','coordinator','coach') AND status = 'active'", clubId);
  for (const s of staff) {
    if (s.id === exceptUserId) continue;
    if (!canSeeTeam(s, teamId)) continue;
    notify(s.id, kind, title, body, link);
  }
}

/** Notifica el jugador (si té compte) i, si és menor, també el tutor. */
export function notifyPlayer(player: { user_id: string | null; guardian_user_id: string | null }, kind: NotifyKind, title: string, body: string | null = null, link: string | null = null, alsoGuardian = false) {
  notify(player.user_id, kind, title, body, link);
  if (alsoGuardian) notify(player.guardian_user_id, kind, title, body, "/tutor");
}
