import Link from "next/link";
import { Binoculars, Star, BellRing, CalendarClock } from "lucide-react";
import { requireClubStaff } from "@/server/auth/session";
import { all } from "@/server/db/client";
import { clubCanSee, clubRelations } from "@/server/services/access";
import { club as getClub, clubEvents } from "@/server/services/club";
import { allPlayerRows, playerCtx, presentPlayer } from "@/server/services/players";
import { Avatar, Badge, Card, CardHeader, EmptyState, PageHeader, StageBadge } from "@/components/ui";
import { ScoutReportButton } from "@/components/club/scout-report-form";
import { FavoriteButton } from "@/components/club/player-actions";
import { POSITION_LABEL, SCOUT_RECOMMENDATION } from "@/lib/domain";
import type { Position, Stage } from "@/lib/domain";
import { fmtDate, fmtDateTime, fmtRelative, madridAt } from "@/lib/time";

export const metadata = { title: "Scouting" };

export default async function ScoutingPage() {
  const u = await requireClubStaff();
  const club = getClub(u.club_id);
  const rel = clubRelations(u.club_id);
  const ctx = playerCtx();
  const visible = allPlayerRows().filter((p) => p.club_id !== u.club_id && clubCanSee(p, club, rel).visible);
  const reports = all<{ id: string; player_id: string; match_title: string; match_date: string; competition: string | null; position_observed: string | null; rating: number; observations: string; recommendation: string; reminder_at: string | null; author_name: string; first_name: string; last_name: string; avatar_hue: number; stage: Stage | null }>(
    `SELECT sr.*, us.name AS author_name, p.first_name, p.last_name, p.avatar_hue, pe.stage FROM scout_reports sr JOIN users us ON us.id = sr.author_user_id JOIN players p ON p.id = sr.player_id
     LEFT JOIN pipeline_entries pe ON pe.player_id = sr.player_id AND pe.club_id = sr.club_id WHERE sr.club_id = ? ${u.role === "coach" ? "AND (sr.author_user_id = ? OR sr.team_id = ?)" : ""} ORDER BY sr.match_date DESC`,
    u.club_id, ...(u.role === "coach" ? [u.id, u.team_id] : []),
  );
  const favIds = all<{ target_id: string; created_at: string }>("SELECT target_id, created_at FROM favorites WHERE user_id = ? AND target_type = 'player' ORDER BY created_at DESC", u.id);
  const favs = favIds.map((f) => visible.find((p) => p.id === f.target_id)).filter(Boolean).map((p) => presentPlayer(p!, ctx));
  const now = new Date();
  const upcoming = clubEvents(u, now.toISOString(), madridAt(now, 30, 0).toISOString()).filter((e) => e.kind === "scouting" || e.kind === "recordatori");
  const toneOf = (r: string) => (r === "contactar" ? "accent" : r === "prova" ? "info" : r === "descartar" ? "danger" : "neutral") as "accent" | "info" | "danger" | "neutral";

  return (
    <div>
      <PageHeader eyebrow="Observació" title="Scouting" subtitle="Informes de partits, jugadors seguits i recordatoris. Tot és privat del teu club." actions={<ScoutReportButton players={visible.map((p) => ({ id: p.id, name: `${p.first_name} ${p.last_name}`, pos: p.primary_position })).sort((a, b) => a.name.localeCompare(b.name, "ca"))} />} />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader title="Informes de scouting" subtitle={`${reports.length} informes`} icon={<Binoculars className="size-4" />} />
          {reports.length === 0 ? <EmptyState title="Encara no hi ha informes" /> : (
            <div className="space-y-3">
              {reports.map((r) => (
                <div key={r.id} className="rounded-2xl border border-line p-4 transition hover:border-line-strong">
                  <div className="flex flex-wrap items-start gap-3">
                    <Avatar initials={(r.first_name[0] + r.last_name[0]).toUpperCase()} hue={r.avatar_hue} size={40} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/club/jugadors/${r.player_id}`} className="text-[14.5px] font-bold hover:underline">{r.first_name} {r.last_name}</Link>
                      <p className="text-[12.5px] text-muted">{r.match_title}{r.competition ? ` · ${r.competition}` : ""} · {fmtDate(r.match_date, { short: true, year: true })}{r.position_observed ? ` · com a ${POSITION_LABEL[r.position_observed as Position].toLowerCase()}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.stage && <StageBadge stage={r.stage} />}
                      <Badge tone={toneOf(r.recommendation)}>{SCOUT_RECOMMENDATION[r.recommendation]}</Badge>
                      <span className="grid size-10 place-items-center rounded-xl bg-ink text-[15px] font-extrabold text-white tabular">{r.rating}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-ink-2">{r.observations}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-3 text-[11.5px] text-subtle"><span>{r.author_name} · {fmtRelative(r.match_date)}</span>{r.reminder_at && <span className="inline-flex items-center gap-1 text-warn"><BellRing className="size-3" /> Recordatori {fmtDate(r.reminder_at, { short: true })}</span>}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader title="Pròxims seguiments" icon={<CalendarClock className="size-4" />} />
            {upcoming.length === 0 ? <p className="text-[13px] text-subtle">Cap seguiment programat.</p> : (
              <div className="space-y-2.5">
                {upcoming.map((e) => (
                  <div key={e.id} className="rounded-xl bg-bg p-3">
                    <p className="text-[13px] font-semibold">{e.title}</p>
                    <p className="text-[12px] text-muted">{fmtDateTime(e.starts_at)}{e.location ? ` · ${e.location}` : ""}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card>
            <CardHeader title="Jugadors seguits" subtitle="Els teus favorits" icon={<Star className="size-4" />} />
            {favs.length === 0 ? <p className="text-[13px] text-subtle">Marca jugadors amb l'estrella per seguir-los aquí.</p> : (
              <div className="space-y-1">
                {favs.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-xl px-1 py-1.5">
                    <Avatar initials={p.initials} hue={p.hue} size={34} />
                    <Link href={`/club/jugadors/${p.id}`} className="min-w-0 flex-1"><p className="truncate text-[13.5px] font-semibold hover:underline">{p.name}</p><p className="truncate text-[12px] text-muted">{p.position_label} · {p.club_name}</p></Link>
                    <FavoriteButton type="player" id={p.id} initial label={false} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
