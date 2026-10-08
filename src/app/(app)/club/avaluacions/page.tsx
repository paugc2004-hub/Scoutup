import Link from "next/link";
import { Binoculars, Star, BellRing, CalendarClock, ClipboardCheck } from "lucide-react";
import { requireClubStaff } from "@/server/auth/session";
import { all, parseJson } from "@/server/db/client";
import { can, clubCanSee, clubRelations } from "@/server/services/access";
import { club as getClub, clubEvents } from "@/server/services/club";
import { allPlayerRows, playerCtx, presentPlayer } from "@/server/services/players";
import { Avatar, Badge, Card, CardHeader, EmptyState, PageHeader, StageBadge } from "@/components/ui";
import { ScoutReportButton } from "@/components/club/scout-report-form";
import { FavoriteButton } from "@/components/club/player-actions";
import { EVAL_DECISIONS, POSITION_LABEL, SCOUT_RECOMMENDATION } from "@/lib/domain";
import type { Position, Stage } from "@/lib/domain";
import { fmtDate, fmtDateTime, fmtRelative, madridAt } from "@/lib/time";

export const metadata = { title: "Evaluaciones" };

export default async function ScoutingPage() {
  const u = await requireClubStaff();
  const club = getClub(u.club_id);
  const rel = clubRelations(u.club_id);
  const ctx = playerCtx();
  const visible = allPlayerRows().filter((p) => p.club_id !== u.club_id && clubCanSee(p, club, rel).visible);
  const reports = all<{ id: string; player_id: string; match_title: string; match_date: string; competition: string | null; position_observed: string | null; rating: number; observations: string; recommendation: string; reminder_at: string | null; author_name: string; first_name: string; last_name: string; avatar_hue: number; stage: Stage | null }>(
    `SELECT sr.*, us.name AS author_name, p.first_name, p.last_name, p.avatar_hue, pe.stage FROM scout_reports sr JOIN users us ON us.id = sr.author_user_id JOIN players p ON p.id = sr.player_id
     LEFT JOIN pipeline_entries pe ON pe.player_id = sr.player_id AND pe.club_id = sr.club_id WHERE sr.club_id = ? ${can.allTeams(u) ? "" : "AND (sr.author_user_id = ? OR sr.team_id = ?)"} ORDER BY sr.match_date DESC`,
    u.club_id, ...(can.allTeams(u) ? [] : [u.id, u.team_id]),
  );
  // Avaluacions privades del club (àmbit segons el rol: l'entrenador veu les del seu equip i les pròpies)
  const evals = all<{ id: string; player_id: string; decision: string; comment: string | null; context: string | null; scores: string; updated_at: string; author_name: string; first_name: string; last_name: string; avatar_hue: number; primary_position: string }>(
    `SELECT e.id, e.player_id, e.decision, e.comment, e.context, e.scores, e.updated_at, us.name AS author_name, p.first_name, p.last_name, p.avatar_hue, p.primary_position
     FROM evaluations e JOIN users us ON us.id = e.author_user_id JOIN players p ON p.id = e.player_id
     WHERE e.club_id = ? ${can.allTeams(u) ? "" : "AND (e.author_user_id = ? OR e.team_id = ?)"} ORDER BY e.updated_at DESC LIMIT 30`,
    u.club_id, ...(can.allTeams(u) ? [] : [u.id, u.team_id]),
  );
  const avg = (sc: string) => {
    const v = Object.values(parseJson<Record<string, Record<string, number>>>(sc, {})).flatMap((x) => Object.values(x));
    return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : "—";
  };
  const favIds = all<{ target_id: string; created_at: string }>("SELECT target_id, created_at FROM favorites WHERE user_id = ? AND target_type = 'player' ORDER BY created_at DESC", u.id);
  const favs = favIds.map((f) => visible.find((p) => p.id === f.target_id)).filter(Boolean).map((p) => presentPlayer(p!, ctx));
  const now = new Date();
  const upcoming = clubEvents(u, now.toISOString(), madridAt(now, 30, 0).toISOString()).filter((e) => e.kind === "scouting" || e.kind === "recordatori");
  const toneOf = (r: string) => (r === "contactar" ? "accent" : r === "prova" ? "info" : r === "descartar" ? "danger" : "neutral") as "accent" | "info" | "danger" | "neutral";

  return (
    <div>
      <PageHeader eyebrow="Análisis y decisión" title="Evaluaciones" subtitle="Evaluaciones por áreas, informes de observación en partidos y jugadores guardados. Todo es privado de tu club: el jugador nunca lo ve." actions={<ScoutReportButton players={visible.map((p) => ({ id: p.id, name: `${p.first_name} ${p.last_name}`, pos: p.primary_position })).sort((a, b) => a.name.localeCompare(b.name, "es"))} />} />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-5">
        <Card>
          <CardHeader title="Evaluaciones recientes" subtitle={`${evals.length} evaluaciones · por autor, fecha y contexto`} icon={<ClipboardCheck className="size-4" />} />
          {evals.length === 0 ? (
            <EmptyState title="Todavía no hay evaluaciones" text="Abre el perfil de un jugador y usa la pestaña «Evaluación»." action={<Link href="/club/cercar" className="text-[13px] font-semibold text-accent-ink hover:underline">Explorar jugadores</Link>} />
          ) : (
            <div className="divide-y divide-line">
              {evals.map((e) => (
                <Link key={e.id} href={`/club/jugadors/${e.player_id}?tab=avaluacio`} className="flex items-start gap-3 py-3 transition hover:bg-bg">
                  <Avatar initials={(e.first_name[0] + e.last_name[0]).toUpperCase()} hue={e.avatar_hue} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-bold">{e.first_name} {e.last_name} <span className="font-normal text-muted">· {POSITION_LABEL[e.primary_position as Position]}</span></p>
                    <p className="text-[12px] text-muted">{e.author_name} · {fmtRelative(e.updated_at)}{e.context ? ` · ${e.context}` : ""}</p>
                    {e.comment && <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-2">{e.comment}</p>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="text-[18px] font-extrabold tabular leading-none">{avg(e.scores)}</span>
                    <Badge tone={e.decision === "descartar" ? "danger" : e.decision === "fitxar" ? "accent" : e.decision === "prova" ? "info" : "neutral"}>{EVAL_DECISIONS[e.decision]}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <CardHeader title="Informes de observación" subtitle={`${reports.length} informes`} icon={<Binoculars className="size-4" />} />
          {reports.length === 0 ? <EmptyState title="Todavía no hay informes" /> : (
            <div className="space-y-3">
              {reports.map((r) => (
                <div key={r.id} className="rounded-2xl border border-line p-4 transition hover:border-line-strong">
                  <div className="flex flex-wrap items-start gap-3">
                    <Avatar initials={(r.first_name[0] + r.last_name[0]).toUpperCase()} hue={r.avatar_hue} size={40} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/club/jugadors/${r.player_id}`} className="text-[14.5px] font-bold hover:underline">{r.first_name} {r.last_name}</Link>
                      <p className="text-[12.5px] text-muted">{r.match_title}{r.competition ? ` · ${r.competition}` : ""} · {fmtDate(r.match_date, { short: true, year: true })}{r.position_observed ? ` · como ${POSITION_LABEL[r.position_observed as Position].toLowerCase()}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.stage && <StageBadge stage={r.stage} />}
                      <Badge tone={toneOf(r.recommendation)}>{SCOUT_RECOMMENDATION[r.recommendation]}</Badge>
                      <span className="grid size-10 place-items-center rounded-xl bg-ink text-[15px] font-extrabold text-white tabular">{r.rating}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-ink-2">{r.observations}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-3 text-[11.5px] text-subtle"><span>{r.author_name} · {fmtRelative(r.match_date)}</span>{r.reminder_at && <span className="inline-flex items-center gap-1 text-warn"><BellRing className="size-3" /> Recordatorio {fmtDate(r.reminder_at, { short: true })}</span>}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
        </div>
        <div className="space-y-5">
          <Card>
            <CardHeader title="Próximos seguimientos" icon={<CalendarClock className="size-4" />} />
            {upcoming.length === 0 ? <p className="text-[13px] text-subtle">Ningún seguimiento programado.</p> : (
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
            <CardHeader title="Jugadores guardados" subtitle="Tu lista" icon={<Star className="size-4" />} />
            {favs.length === 0 ? <EmptyState title="No tienes jugadores guardados" text="Márcalos con la estrella desde el perfil o la búsqueda." action={<Link href="/club/cercar" className="text-[13px] font-semibold text-accent-ink hover:underline">Descubrir jugadores</Link>} /> : (
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
