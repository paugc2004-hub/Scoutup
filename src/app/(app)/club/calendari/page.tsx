import { can } from "@/server/services/access";
import { requireClubStaff } from "@/server/auth/session";
import { clubEvents, pipelineRows, scopedTeams } from "@/server/services/club";
import { get } from "@/server/db/client";
import { PageHeader } from "@/components/ui";
import { CalendarView } from "@/components/calendar";
import { dayKey } from "@/lib/time";
import type { EventKind } from "@/lib/domain";

export const metadata = { title: "Calendari" };

export default async function ClubCalendar({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const u = await requireClubStaff();
  const sp = await searchParams;
  const today = dayKey(new Date());
  const month = sp.m && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : today.slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1) - 2 * 86400000).toISOString();
  const to = new Date(Date.UTC(y, m, 1) + 2 * 86400000).toISOString();
  const events = clubEvents(u, from, to).map((e) => ({
    id: e.id, kind: e.kind, title: e.title, starts_at: e.starts_at, ends_at: e.ends_at, location: e.location, notes: e.notes, team: e.team_name ?? null,
    related: e.related_name ?? null, relatedId: e.related_player_id, canDelete: can.allTeams(u) || e.owner_user_id === u.id || (!!e.team_id && e.team_id === u.team_id),
  }));
  const teams = scopedTeams(u).map((t) => ({ id: t.id, name: t.name }));
  const players = pipelineRows(u).map((r) => ({ id: r.player_id, name: get<{ n: string }>("SELECT first_name || ' ' || last_name AS n FROM players WHERE id = ?", r.player_id)!.n })).sort((a, b) => a.name.localeCompare(b.name, "ca"));
  const kinds: EventKind[] = ["partit", "entrenament", "prova", "reunio", "scouting", "trucada", "recordatori"];
  return (
    <div>
      <PageHeader eyebrow={can.allTeams(u) ? "Tot el club" : u.title ?? "El teu equip"} title="Calendari" subtitle="Partits, entrenaments, proves, reunions, scouting i trucades. Les proves i trucades amb un jugador també apareixen al seu calendari." />
      <CalendarView events={events} month={month} basePath="/club/calendari" canCreate teams={teams} players={players} kinds={kinds} todayKey={today} />
    </div>
  );
}
