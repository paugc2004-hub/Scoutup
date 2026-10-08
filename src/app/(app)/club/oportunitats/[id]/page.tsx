import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, CalendarDays, Ruler, Footprints, Layers, Cake, Sparkles, Clock, FlaskConical, Inbox, Target, MessageSquareQuote } from "lucide-react";
import { can } from "@/server/services/access";
import { requireClubStaff } from "@/server/auth/session";
import { all } from "@/server/db/client";
import { club as getClub } from "@/server/services/club";
import { offerRow, rankCandidates, toMatchOffer, traitsOf } from "@/server/services/offers";
import { playerCtx } from "@/server/services/players";
import { Avatar, Badge, Card, CardHeader, EmptyState, MatchRing, StageBadge } from "@/components/ui";
import { CandidatesList, ApplicationActions, OfferStatusControl } from "@/components/club/candidates-list";
import { toLite } from "@/components/club/candidate-lite";
import { ClientTabs } from "@/components/club/player-actions";
import { APP_STATUS_LABEL, FOOT_LABEL, POSITION_LABEL, levelLabel, traitLabel } from "@/lib/domain";
import type { AppStatus, Position, Stage } from "@/lib/domain";
import { fmtDate, fmtDateTime, fmtRelative } from "@/lib/time";

export default async function OfferDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const u = await requireClubStaff();
  const { id } = await params;
  const sp = await searchParams;
  const o = offerRow(id);
  if (!o || o.club_id !== u.club_id) notFound();
  if (!can.seeTeam(u, o.team_id)) {
    return <EmptyState title="Oportunitat d'un altre equip" text="Com a entrenador només pots veure les oportunitats del teu equip." />;
  }
  const club = getClub(u.club_id);
  const ctx = playerCtx();
  const cands = rankCandidates(toMatchOffer(o), club, { ctx, minScore: 40, offerId: id });
  const apps = all<{ id: string; status: AppStatus; message: string | null; created_at: string; match_score: number; player_id: string; first_name: string; last_name: string; avatar_hue: number; primary_position: string; birth_date: string; club_name: string | null; stage: Stage | null }>(
    `SELECT a.*, p.first_name, p.last_name, p.avatar_hue, p.primary_position, p.birth_date, c.name AS club_name, pe.stage
     FROM applications a JOIN players p ON p.id = a.player_id LEFT JOIN clubs c ON c.id = p.club_id LEFT JOIN pipeline_entries pe ON pe.player_id = a.player_id AND pe.club_id = ?
     WHERE a.offer_id = ? ORDER BY CASE a.status WHEN 'enviada' THEN 0 ELSE 1 END, a.created_at DESC`,
    u.club_id, id,
  );
  const traits = traitsOf(o);
  const req = [
    { icon: <Target className="size-4" />, k: "Posició", v: `${POSITION_LABEL[o.position as Position]}${o.accepts_secondary ? " (accepta secundària)" : ""}` },
    { icon: <Cake className="size-4" />, k: "Edat", v: `Nascuts ${o.birth_year_min}–${o.birth_year_max} · ${o.category}` },
    { icon: <Layers className="size-4" />, k: "Nivell mínim", v: levelLabel(o.level_min) },
    { icon: <MapPin className="size-4" />, k: "Zona", v: `${o.zone_city} · fins a ${o.max_km} km` },
    { icon: <Footprints className="size-4" />, k: "Peu", v: FOOT_LABEL[o.foot] },
    { icon: <Ruler className="size-4" />, k: "Alçada", v: o.height_min ? `Mínim ${o.height_min} cm` : "Indiferent" },
    { icon: <Clock className="size-4" />, k: "Disponibilitat", v: o.availability_req === "immediata" ? "Immediata" : "Per a la temporada" },
  ];

  return (
    <div className="space-y-5">
      <Link href="/club/oportunitats" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" /> Totes les oportunitats</Link>
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <Card className="animate-rise">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone="dark">{o.team_name}</Badge>
                {o.kind === "prova" ? <Badge tone="violet"><FlaskConical className="size-3" /> Jornada de proves</Badge> : <Badge>Incorporació</Badge>}
                <Badge tone={o.status === "oberta" ? "accent" : o.status === "pausada" ? "warn" : "neutral"}>{o.status === "oberta" ? "Oberta" : o.status === "pausada" ? "Pausada" : "Tancada"}</Badge>
              </div>
              <h1 className="mt-3 text-[28px] font-extrabold tracking-tight">{o.title}</h1>
              <p className="mt-1 text-[13px] text-muted">Publicada {fmtRelative(o.created_at)}{o.expires_at ? ` · caduca el ${fmtDate(o.expires_at, { short: true })}` : ""}{o.trial_date ? ` · prova ${fmtDateTime(o.trial_date)}` : ""}</p>
            </div>
            {can.manageOffers(u) && <OfferStatusControl id={o.id} status={o.status} />}
          </div>
          {o.description && <p className="mt-4 max-w-3xl text-[14px] leading-relaxed text-ink-2">{o.description}</p>}
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {req.map((r) => (
              <div key={r.k} className="flex items-start gap-2.5 rounded-xl bg-bg p-3">
                <span className="mt-0.5 text-subtle">{r.icon}</span>
                <div className="min-w-0"><p className="text-[11.5px] font-semibold text-muted">{r.k}</p><p className="text-[13px] font-bold">{r.v}</p></div>
              </div>
            ))}
            <div className="flex items-start gap-2.5 rounded-xl bg-bg p-3">
              <span className="mt-0.5 text-subtle"><Sparkles className="size-4" /></span>
              <div className="min-w-0"><p className="text-[11.5px] font-semibold text-muted">Característiques</p><p className="text-[13px] font-bold">{traits.length ? traits.map(traitLabel).join(", ") : "—"}</p></div>
            </div>
          </div>
          {o.restrictions && <p className="mt-4 rounded-xl border border-[#fde68a] bg-warn-soft px-3.5 py-2.5 text-[13px] text-ink-2"><strong>Condicions:</strong> {o.restrictions}</p>}
        </Card>
        <Card>
          <CardHeader title="Resum" />
          <div className="grid grid-cols-2 gap-2">
            {[["Compatibles ≥80%", cands.filter((c) => c.match.score >= 80).length], ["Compatibles ≥70%", cands.filter((c) => c.match.score >= 70).length], ["Sol·licituds", apps.length], ["Noves", apps.filter((a) => a.status === "enviada").length]].map(([k, v]) => (
              <div key={k as string} className="rounded-xl bg-sunken p-3"><p className="text-[22px] font-extrabold tabular">{v}</p><p className="text-[11.5px] text-muted">{k}</p></div>
            ))}
          </div>
          <p className="mt-4 text-[12px] leading-relaxed text-muted">La compatibilitat es calcula amb set factors ponderats: posició 25, categoria i nivell 20, edat 15, ubicació 10, disponibilitat 10, característiques 10 i experiència 10.</p>
        </Card>
      </div>

      <Card>
        <ClientTabs
          initial={sp.tab === "sollicituds" ? "sollicituds" : "candidats"}
          tabs={[
            { key: "candidats", label: "Candidats recomanats", count: cands.filter((c) => c.match.score >= 60).length, content: <CandidatesList items={cands.map(toLite)} offerId={o.id} teamId={o.team_id} /> },
            {
              key: "sollicituds", label: "Sol·licituds", count: apps.length, content: apps.length === 0 ? (
                <EmptyState icon={<Inbox className="size-5" />} title="Encara no hi ha sol·licituds" text="Quan un jugador premi «M'interessa», apareixerà aquí amb la seva compatibilitat." />
              ) : (
                <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
                  {apps.map((a) => {
                    const age = new Date().getFullYear() - Number(a.birth_date.slice(0, 4));
                    return (
                      <div key={a.id} className={`flex flex-col gap-3 p-4 md:flex-row md:items-center ${a.status === "enviada" ? "bg-accent-soft/35" : ""}`}>
                        <Link href={`/club/jugadors/${a.player_id}?offer=${o.id}`} className="flex min-w-0 flex-1 items-start gap-3">
                          <Avatar initials={(a.first_name[0] + a.last_name[0]).toUpperCase()} hue={a.avatar_hue} size={42} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="text-[14px] font-bold hover:underline">{a.first_name} {a.last_name}</p>
                              {a.status === "enviada" ? <Badge tone="accent">Nova</Badge> : <Badge>{APP_STATUS_LABEL[a.status]}</Badge>}
                              {a.stage && <StageBadge stage={a.stage} />}
                            </div>
                            <p className="text-[12.5px] text-muted">{POSITION_LABEL[a.primary_position as Position]} · {age} anys · {a.club_name ?? "Sense equip"} · {fmtRelative(a.created_at)}</p>
                            {a.message && <p className="mt-1.5 flex gap-1.5 text-[13px] italic text-ink-2"><MessageSquareQuote className="mt-0.5 size-3.5 shrink-0 text-subtle" />«{a.message}»</p>}
                          </div>
                        </Link>
                        <div className="flex items-center gap-3 pl-14 md:pl-0">
                          <MatchRing score={a.match_score} size={44} stroke={4.5} />
                          {!a.stage && a.status !== "rebutjat" && a.status !== "tancat" ? <ApplicationActions id={a.id} status={a.status} /> : a.status === "rebutjat" ? <Badge tone="danger">Rebutjada</Badge> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ),
            },
          ]}
        />
      </Card>
      <p className="flex items-center gap-1.5 text-[12px] text-subtle"><CalendarDays className="size-3.5" /> Les dades de jugadors i competicions són fictícies.</p>
    </div>
  );
}
