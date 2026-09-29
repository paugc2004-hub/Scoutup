import type { NavItem } from "@/components/shell/sidebar";
import type { SessionUser } from "@/server/auth/session";
import { get } from "@/server/db/client";
import { teamFilterSql } from "@/server/services/access";

export function navFor(u: SessionUser): { items: NavItem[]; search?: { action: string; placeholder: string }; bottomNav?: boolean } {
  if (u.role === "director" || u.role === "coach") {
    const cf = teamFilterSql(u, "c.team_id");
    const unread = get<{ n: number }>(`SELECT COUNT(*) AS n FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE c.club_id = ? AND m.sender_side = 'player' AND m.read_by_club_at IS NULL AND ${cf.sql}`, u.club_id, ...cf.params)?.n ?? 0;
    const of = teamFilterSql(u, "o.team_id");
    const newApps = get<{ n: number }>(`SELECT COUNT(*) AS n FROM applications a JOIN offers o ON o.id = a.offer_id WHERE o.club_id = ? AND a.status = 'enviada' AND ${of.sql}`, u.club_id, ...of.params)?.n ?? 0;
    return {
      search: { action: "/club/cercar", placeholder: "Cerca jugadors per nom, posició o municipi…" },
      items: [
        { href: "/club", label: "Inici", icon: "dashboard", exact: true },
        { href: "/club/intelligence", label: "ScoutUp Intelligence", icon: "sparkles" },
        { href: "/club/cercar", label: "Cercar jugadors", icon: "search" },
        { href: "/club/ofertes", label: "Ofertes", icon: "megaphone", badge: newApps },
        { href: "/club/pipeline", label: "Pipeline", icon: "kanban" },
        { href: "/club/comparar", label: "Comparar", icon: "compare" },
        { href: "/club/missatges", label: "Missatges", icon: "messages", badge: unread },
        { href: "/club/calendari", label: "Calendari", icon: "calendar" },
        { href: "/club/scouting", label: "Scouting", icon: "binoculars" },
        { href: "/club/plantilla", label: "Plantilla", icon: "shirt", section: "El club" },
        { href: "/club/equips", label: "Equips i competició", icon: "trophy", section: "El club" },
        { href: "/club/perfil", label: "Perfil del club", icon: "building", section: "El club" },
        { href: "/club/configuracio", label: u.role === "director" ? "Usuaris i permisos" : "Permisos", icon: "settings", section: "El club" },
      ],
    };
  }
  if (u.role === "player") {
    const unread = get<{ n: number }>("SELECT COUNT(*) AS n FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE c.player_id = ? AND m.sender_side = 'club' AND m.read_by_player_at IS NULL", u.player_id)?.n ?? 0;
    const pending = get<{ n: number }>("SELECT COUNT(*) AS n FROM contact_requests WHERE player_id = ? AND status = 'pendent'", u.player_id)?.n ?? 0;
    return {
      bottomNav: true,
      items: [
        { href: "/jugador", label: "Inici", icon: "dashboard", exact: true, mobile: true },
        { href: "/jugador/oportunitats", label: "Oportunitats", icon: "compass", mobile: true },
        { href: "/jugador/seguiment", label: "Seguiment", icon: "route", mobile: true },
        { href: "/jugador/missatges", label: "Missatges", icon: "messages", badge: unread + pending, mobile: true },
        { href: "/jugador/clubs", label: "Descobrir clubs", icon: "landmark" },
        { href: "/jugador/calendari", label: "Calendari", icon: "calendar" },
        { href: "/jugador/perfil", label: "El meu perfil", icon: "user", section: "Jo", mobile: true },
        { href: "/jugador/privacitat", label: "Privacitat i seguretat", icon: "shield", section: "Jo" },
      ],
    };
  }
  return {
    items: [
      { href: "/tutor", label: "Panell del tutor", icon: "shield", exact: true },
      { href: "/notificacions", label: "Notificacions", icon: "bell" },
    ],
  };
}
