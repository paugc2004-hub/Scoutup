import Link from "next/link";
import { Megaphone, Inbox, KanbanSquare, CalendarClock, ArrowRight, Plus, Sparkles, AlertCircle, Target, Activity } from "lucide-react";
import { requireClubStaff } from "@/server/auth/session";
import { all, get } from "@/server/db/client";
import { can, teamFilterSql } from "@/server/services/access";
import { club as getClub, clubEvents, pipelineRows, recentActivity, teamNeeds } from "@/server/services/club";
import { clubOffers, rankCandidates, toMatchOffer } from "@/server/services/offers";
import { playerCtx } from "@/server/services/players";
import { Avatar, Badge, Card, CardHeader, EmptyState, LinkButton, MatchRing, PageHeader, Stat, cn, Dot, StageBadge } from "@/components/ui";
import { IntelligenceBox } from "@/components/client/intelligence-box";
import { EVENT_KIND_COLOR, EVENT_KIND_LABEL, PIPELINE_STAGES, POSITION_LABEL, STAGE_COLOR, STAGE_LABEL } from "@/lib/domain";
import type { EventKind, Position } from "@/lib/domain";
import { fmtDate, fmtRelative, fmtTime, madridAt } from "@/lib/time";

export const metadata = { title: "Inici · Club" };

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", hour: "2-digit", hour12: false }).format(new Date()));
  return h >= 6 && h < 13 ? "Bon dia" : h >= 13 && h < 20 ? "Bona tarda" : "Bona nit";
}

export default async function ClubHome() {
  const u = await requireClubStaff();
  const club = getClub(u.club_id);
  const now = new Date();
  const of = teamFilterSql(u, "o.team_id");
  const offers = clubOffers(u.club_id).filter((o) => o.status === "oberta" && (can.allTeams(u) || o.team_id === u.team_id));
  const newApps = all<{ id: string; created_at: string; match_score: number; offer_id: string; offer_title: string; player_id: string; first_name: string; last_name: string; avatar_hue: number; primary_position: string }>(
    `SELECT a.id, a.created_at, a.match_score, a.offer_id, o.title AS offer_title, p.id AS player_id, p.first_name, p.last_name, p.avatar_hue, p.primary_position
     FROM applications a JOIN offers o ON o.id = a.offer_id JOIN players p ON p.id = a.player_id WHERE o.club_id = ? AND a.status = 'enviada' AND ${of.sql} ORDER BY a.created_at DESC`,
    u.club_id, ...of.params,
  );
  const pipe = pipelineRows(u);
  const weekEnd = madridAt(now, 7, 0).toISOString();
  const events = clubEvents(u, now.toISOString(), madridAt(now, 14, 0).toISOString());
  const trialsWeek = events.filter((e) => e.kind === "prova" && e.starts_at < weekEnd).length;
  const needs = teamNeeds(u);
  const activity = recentActivity(u, 7);
  const ctx = playerCtx();

  // nous perfils compatibles: millors candidats (≥ 80%) de cada oportunitat oberta que encara no són al pipeline
  const seen = new Set<string>();
  const suggestions = offers.flatMap((o) =>
    rankCandidates(toMatchOffer(o), club, { ctx, minScore: 80, offerId: o.id })
      .filter((c) => !c.stage && !seen.has(c.player.id))
      .slice(0, 2)
      .map((c) => {
        seen.add(c.player.id);
        return { ...c, offer: o };
      }),
  ).sort((a, b) => b.match.score - a.match.score).slice(0, 5);

  const cf = teamFilterSql(u, "c.team_id");
  const unreadConv = get<{ n: number }>(`SELECT COUNT(DISTINCT m.conversation_id) AS n FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE c.club_id = ? AND m.sender_side = 'player' AND m.read_by_club_at IS NULL AND ${cf.sql}`, u.club_id, ...cf.params)?.n ?? 0;
  const firstName = u.name.split(" ")[0];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={can.allTeams(u) ? club.name : `${club.name} · ${u.title}`}
        title={`${greeting()}, ${firstName}`}
        subtitle={<>Avui és {fmtDate(now, { weekday: true })}. {newApps.length ? <><strong className="text-ink">{newApps.length} sol·licituds noves</strong> per revisar</> : "Cap sol·licitud nova"}{unreadConv ? <> i <strong className="text-ink">{unreadConv} {unreadConv === 1 ? "conversa" : "converses"}</strong> amb missatges sense llegir</> : null}.</>}
        actions={
          <>
            <LinkButton href="/club/intelligence" icon={<Sparkles className="size-4" />}>Cerca intel·ligent</LinkButton>
            {can.manageOffers(u) && <LinkButton href="/club/oportunitats/nova" variant="primary" icon={<Plus className="size-4" />}>Nova oportunitat</LinkButton>}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Oportunitats actives" value={offers.length} hint={`${offers.filter((o) => o.kind === "prova").length} jornades de proves`} icon={<Megaphone className="size-4" />} href="/club/oportunitats" />
        <Stat label="Sol·licituds noves" value={newApps.length} hint="Pendents de revisar" icon={<Inbox className="size-4" />} tone="accent" href="/club/oportunitats" />
        <Stat label="Jugadors al pipeline" value={pipe.length} hint={`${pipe.filter((p) => ["contactat", "en_conversa", "prova"].includes(p.stage)).length} en procés actiu`} icon={<KanbanSquare className="size-4" />} tone="info" href="/club/pipeline" />
        <Stat label="Proves aquesta setmana" value={trialsWeek} hint="Al calendari del club" icon={<CalendarClock className="size-4" />} tone="violet" href="/club/calendari" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader title="ScoutUp Intelligence" subtitle="Explica què necessites i et proposem perfils, amb el perquè." icon={<Sparkles className="size-4 text-accent-ink" />} />
          <IntelligenceBox compact />
          {needs.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.1em] text-subtle">Necessitats de la plantilla</p>
              <div className="space-y-2">
                {needs.map((n, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-line bg-bg px-3 py-2.5">
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", n.priority === "alta" ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn")}><AlertCircle className="size-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold">{n.team_name} · {POSITION_LABEL[n.position as Position]}</p>
                      <p className="truncate text-[12.5px] text-muted">{n.text}</p>
                    </div>
                    <Link href={`/club/intelligence?q=${encodeURIComponent(`${POSITION_LABEL[n.position as Position]} ${n.text.toLowerCase().includes("esquerr") ? "esquerrà " : ""}${n.team_name.includes("Cadete") ? "cadet" : n.team_name.includes("Amateur") ? "amateur" : "sub-19"}${n.team_name.includes("Femenino") ? " femenina" : ""} a prop de ${club.city}`)}`} className="shrink-0 text-[12.5px] font-semibold text-accent-ink hover:underline">
                      Buscar
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Nous perfils compatibles" subtitle="Superen el 80% en alguna de les teves oportunitats i encara no els segueixes." icon={<Target className="size-4" />} />
          {suggestions.length === 0 ? (
            <EmptyState title="Cap perfil nou per sobre del 80%" text="Quan un jugador actualitzi el perfil i encaixi amb una oportunitat, apareixerà aquí." />
          ) : (
            <div className="-mx-2 space-y-1">
              {suggestions.map((s) => (
                <Link key={s.player.id} href={`/club/jugadors/${s.player.id}?offer=${s.offer.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-bg">
                  <Avatar initials={s.player.initials} hue={s.player.hue} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-bold">{s.player.name}</p>
                    <p className="truncate text-[12px] text-muted">{s.player.position_label} · {s.player.age} anys · {s.player.club_name}</p>
                    <p className="truncate text-[11.5px] text-subtle">per a «{s.offer.title}»</p>
                  </div>
                  <MatchRing score={s.match.score} size={42} stroke={4} />
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Sol·licituds noves" subtitle="Jugadors que s'han inscrit a les teves oportunitats." action={<LinkButton href="/club/oportunitats" size="sm" variant="ghost">Todas <ArrowRight className="size-3.5" /></LinkButton>} icon={<Inbox className="size-4" />} />
          {newApps.length === 0 ? (
            <EmptyState title="Estàs al dia" text="No hi ha sol·licituds pendents de revisar." />
          ) : (
            <div className="divide-y divide-line">
              {newApps.slice(0, 5).map((a) => (
                <Link key={a.id} href={`/club/jugadors/${a.player_id}?offer=${a.offer_id}`} className="flex items-center gap-3 py-2.5 transition hover:bg-bg">
                  <Avatar initials={(a.first_name[0] + a.last_name[0]).toUpperCase()} hue={a.avatar_hue} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold">{a.first_name} {a.last_name} <span className="font-normal text-muted">· {POSITION_LABEL[a.primary_position as Position]}</span></p>
                    <p className="truncate text-[12px] text-muted">{a.offer_title} · {fmtRelative(a.created_at)}</p>
                  </div>
                  <Badge tone="accent">Nova</Badge>
                  <MatchRing score={a.match_score} size={38} stroke={4} />
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Pipeline" subtitle={`${pipe.length} jugadors en seguiment`} action={<LinkButton href="/club/pipeline" size="sm" variant="ghost">Abrir <ArrowRight className="size-3.5" /></LinkButton>} icon={<KanbanSquare className="size-4" />} />
          <div className="space-y-2">
            {PIPELINE_STAGES.map((s) => {
              const n = pipe.filter((p) => p.stage === s).length;
              const max = Math.max(1, ...PIPELINE_STAGES.map((x) => pipe.filter((p) => p.stage === x).length));
              return (
                <div key={s} className="grid grid-cols-[96px_1fr_24px] items-center gap-3 text-[12.5px]">
                  <span className="flex items-center gap-1.5 font-medium text-ink-2"><Dot color={STAGE_COLOR[s]} />{STAGE_LABEL[s]}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-sunken"><div className="bar-anim h-full rounded-full" style={{ width: `${(n / max) * 100}%`, background: STAGE_COLOR[s] }} /></div>
                  <span className="text-right font-bold tabular">{n}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Agenda" subtitle="Pròxims 14 dies" action={<LinkButton href="/club/calendari" size="sm" variant="ghost">Calendario <ArrowRight className="size-3.5" /></LinkButton>} icon={<CalendarClock className="size-4" />} />
          {events.filter((e) => e.kind !== "entrenament").slice(0, 6).length === 0 ? (
            <EmptyState title="Sense esdeveniments" />
          ) : (
            <div className="space-y-1.5">
              {events.filter((e) => e.kind !== "entrenament").slice(0, 6).map((e) => (
                <div key={e.id} className="flex items-center gap-3 rounded-xl px-1 py-1.5">
                  <div className="w-14 shrink-0 text-center">
                    <p className="text-[11px] font-bold uppercase text-subtle">{fmtDate(e.starts_at, { short: true }).split(" ")[1]}</p>
                    <p className="text-[18px] font-extrabold leading-none tabular">{fmtDate(e.starts_at, { short: true }).split(" ")[0]}</p>
                  </div>
                  <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: EVENT_KIND_COLOR[e.kind as EventKind] }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold">{e.title}</p>
                    <p className="truncate text-[12px] text-muted">{EVENT_KIND_LABEL[e.kind as EventKind]} · {fmtTime(e.starts_at)}{e.location ? ` · ${e.location}` : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <CardHeader title="Activitat recent" subtitle="Moviments al pipeline i interaccions" icon={<Activity className="size-4" />} />
          <div className="space-y-3">
            {activity.map((a) => (
              <div key={a.id} className="flex gap-3">
                <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: a.to_stage ? STAGE_COLOR[a.to_stage as keyof typeof STAGE_COLOR] : "#8a8f9c" }} />
                <div className="min-w-0 flex-1 text-[13px]">
                  <p className="leading-snug"><Link href={`/club/jugadors/${a.player_id}`} className="font-semibold hover:underline">{a.player_name}</Link> <span className="text-muted">· {a.text}</span></p>
                  <p className="mt-0.5 text-[11.5px] text-subtle">{a.user_name ?? "Sistema"} · {fmtRelative(a.created_at)}</p>
                </div>
                {a.to_stage && <StageBadge stage={a.to_stage as never} />}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
