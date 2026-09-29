import { all } from "@/server/db/client";
import type { SessionUser } from "@/server/auth/session";
import { teamFilterSql } from "@/server/services/access";

export type ConvListItem = {
  id: string; subject: string; last_message_at: string; club_id: string; player_id: string; team_id: string | null;
  club_name: string; club_initials: string; club_color: string; player_name: string; player_hue: number; player_birth: string;
  last_body: string | null; last_side: string | null; unread: number; team_name: string | null;
};

export function conversationsFor(u: SessionUser): ConvListItem[] {
  const unreadCol = u.role === "player" || u.role === "guardian" ? "read_by_player_at" : "read_by_club_at";
  const otherSide = u.role === "player" || u.role === "guardian" ? "club" : "player";
  let where = "";
  const params: unknown[] = [];
  if (u.role === "director" || u.role === "coach") {
    const tf = teamFilterSql(u, "c.team_id");
    where = `c.club_id = ? AND ${tf.sql}`;
    params.push(u.club_id, ...tf.params);
  } else {
    where = "c.player_id = ?";
    params.push(u.player_id);
  }
  return all<ConvListItem>(
    `SELECT c.*, cl.name AS club_name, cl.initials AS club_initials, cl.color_primary AS club_color, p.first_name || ' ' || p.last_name AS player_name,
       p.avatar_hue AS player_hue, p.birth_date AS player_birth, t.name AS team_name,
       (SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_body,
       (SELECT sender_side FROM messages m WHERE m.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_side,
       (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_side = '${otherSide}' AND m.${unreadCol} IS NULL) AS unread
     FROM conversations c JOIN clubs cl ON cl.id = c.club_id JOIN players p ON p.id = c.player_id LEFT JOIN teams t ON t.id = c.team_id
     WHERE ${where} ORDER BY c.last_message_at DESC`,
    ...params,
  );
}

export type MessageRow = { id: string; sender_side: string; body: string; flagged: number; created_at: string; sender_name: string | null; read_by_club_at: string | null; read_by_player_at: string | null };
export function messagesOf(conversationId: string): MessageRow[] {
  return all<MessageRow>("SELECT m.*, u.name AS sender_name FROM messages m LEFT JOIN users u ON u.id = m.sender_user_id WHERE m.conversation_id = ? ORDER BY m.created_at", conversationId);
}

export type RequestRow = { id: string; club_id: string; player_id: string; team_id: string | null; reason: string; message: string; status: string; created_at: string; responded_at: string | null; conversation_id: string | null; club_name: string; club_initials: string; club_color: string; club_verified: number; club_city: string; player_name: string; player_hue: number; from_name: string; team_name: string | null };
const REQ_SELECT = `SELECT r.*, cl.name AS club_name, cl.initials AS club_initials, cl.color_primary AS club_color, cl.verified AS club_verified, cl.city AS club_city,
  p.first_name || ' ' || p.last_name AS player_name, p.avatar_hue AS player_hue, u.name AS from_name, t.name AS team_name
  FROM contact_requests r JOIN clubs cl ON cl.id = r.club_id JOIN players p ON p.id = r.player_id JOIN users u ON u.id = r.from_user_id LEFT JOIN teams t ON t.id = r.team_id`;

export function requestsForPlayer(playerId: string): RequestRow[] {
  return all<RequestRow>(`${REQ_SELECT} WHERE r.player_id = ? ORDER BY r.created_at DESC`, playerId);
}
export function requestsForClub(u: SessionUser & { club_id: string }): RequestRow[] {
  const tf = teamFilterSql(u, "r.team_id");
  return all<RequestRow>(`${REQ_SELECT} WHERE r.club_id = ? AND ${tf.sql} ORDER BY r.created_at DESC`, u.club_id, ...tf.params);
}
