import type { NavItem } from "@/components/shell/sidebar";
import type { SessionUser } from "@/server/auth/session";
import { get } from "@/server/db/client";
import { teamFilterSql } from "@/server/services/access";
import { hasPermission, isClubRole } from "@/lib/permissions";

export function navFor(u: SessionUser): { items: NavItem[]; search?: { action: string; placeholder: string }; bottomNav?: boolean } {
  if (isClubRole(u.role)) {
    const cf = teamFilterSql(u, "c.team_id");
    const unread = get<{ n: number }>(`SELECT COUNT(*) AS n FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE c.club_id = ? AND m.sender_side = 'player' AND m.read_by_club_at IS NULL AND ${cf.sql}`, u.club_id, ...cf.params)?.n ?? 0;
    const of = teamFilterSql(u, "o.team_id");
    const newApps = get<{ n: number }>(`SELECT COUNT(*) AS n FROM applications a JOIN offers o ON o.id = a.offer_id WHERE o.club_id = ? AND a.status = 'enviada' AND ${of.sql}`, u.club_id, ...of.params)?.n ?? 0;
    // Navegación siguiendo el flujo central: necesidad → oportunidad → descubrimiento → pipeline → evaluación → contacto.
    return {
      search: { action: "/club/cercar", placeholder: "Busca jugadores por nombre, posición o municipio…" },
      items: [
        { href: "/club", label: "Inicio", icon: "dashboard", exact: true },
        { href: "/club/oportunitats", label: "Oportunidades", icon: "megaphone", badge: newApps },
        { href: "/club/cercar", label: "Jugadores", icon: "search" },
        { href: "/club/intelligence", label: "IA · Copilot", icon: "sparkles" },
        { href: "/club/pipeline", label: "Pipeline", icon: "kanban" },
        { href: "/club/avaluacions", label: "Evaluaciones", icon: "clipboard" },
        { href: "/club/missatges", label: "Mensajes", icon: "messages", badge: unread },
        { href: "/club/calendari", label: "Calendario", icon: "calendar" },
        { href: "/club/equips", label: "Equipos y competición", icon: "trophy", section: "El club" },
        { href: "/club/plantilla", label: "Plantilla", icon: "shirt", section: "El club" },
        { href: "/club/perfil", label: "Perfil del club", icon: "building", section: "El club" },
        { href: "/club/configuracio", label: hasPermission(u.role, "users.manage") ? "Usuarios y permisos" : "Permisos", icon: "settings", section: "El club" },
      ],
    };
  }
  if (u.role === "player") {
    const unread = get<{ n: number }>("SELECT COUNT(*) AS n FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE c.player_id = ? AND m.sender_side = 'club' AND m.read_by_player_at IS NULL", u.player_id)?.n ?? 0;
    const pending = get<{ n: number }>("SELECT COUNT(*) AS n FROM contact_requests WHERE player_id = ? AND status = 'pendent'", u.player_id)?.n ?? 0;
    return {
      bottomNav: true,
      items: [
        { href: "/jugador", label: "Inicio", icon: "dashboard", exact: true, mobile: true },
        { href: "/jugador/oportunitats", label: "Oportunidades", icon: "compass", mobile: true },
        { href: "/jugador/seguiment", label: "Seguimiento", icon: "route", mobile: true },
        { href: "/jugador/missatges", label: "Mensajes", icon: "messages", badge: unread + pending, mobile: true },
        { href: "/jugador/clubs", label: "Descubrir clubes", icon: "landmark" },
        { href: "/jugador/calendari", label: "Calendario", icon: "calendar" },
        { href: "/jugador/perfil", label: "Mi perfil", icon: "user", section: "Yo", mobile: true },
        { href: "/jugador/privacitat", label: "Privacidad y seguridad", icon: "shield", section: "Yo" },
      ],
    };
  }
  return {
    items: [
      { href: "/tutor", label: "Panel del tutor", icon: "shield", exact: true },
      { href: "/notificacions", label: "Notificaciones", icon: "bell" },
    ],
  };
}
