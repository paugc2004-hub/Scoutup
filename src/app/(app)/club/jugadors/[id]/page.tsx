import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Footprints, Ruler, CalendarDays, Languages, Sparkles, Lock, Trophy, Binoculars, History, ShieldAlert, Info } from "lucide-react";
import { requireClubStaff } from "@/server/auth/session";
import { all, get } from "@/server/db/client";
import { clubCanContact, clubCanSee, clubRelations, teamScope } from "@/server/services/access";
import { club as getClub, recentActivity, scopedTeams } from "@/server/services/club";
import { clubOffers, toMatchOffer } from "@/server/services/offers";
import { currentSeason, playerCtx, playerRow, presentPlayer, privacyOf, toMatchPlayer } from "@/server/services/players";
import { playerDetail } from "@/server/services/player-detail";
import { recordProfileView } from "@/server/services/actions";
import { profileSummary } from "@/server/services/intelligence";
import { competitionProvider } from "@/server/competition/provider";
import { computeMatch } from "@/lib/matching";
import { FOOT_LABEL, CONTRACT_LABEL, POSITION_LABEL, EVAL_AREAS, EVAL_DECISIONS, SCOUT_RECOMMENDATION, APP_STATUS_LABEL } from "@/lib/domain";
import type { AppStatus, Stage } from "@/lib/domain";
import { fmtDate, fmtRelative } from "@/lib/time";
import { Avatar, AvailabilityBadge, Badge, Card, CardHeader, ClubCrest, EmptyState, MinorBadge, Radar, VerificationBadge, StageBadge, cn } from "@/components/ui";
import { MatchBreakdown } from "@/components/match-breakdown";
import { StatsTable, CareerList, VideoGrid, Achievements, AttrBars, PositionPitch } from "@/components/player-sections";
import { ClientTabs, ContactControl, EvaluationForm, FavoriteButton, InteractionForm, NotesPanel, OfferSelector, PipelineControl } from "@/components/club/player-actions";
import type { ContactState } from "@/components/club/player-actions";
import { CompareToggle } from "@/components/club/compare-tray";

export default async function ClubPlayerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ offer?: string; tab?: string }> }) {
  const u = await requireClubStaff();
  const { id } = await params;
  const sp = await searchParams;
  const row = playerRow(id);
  if (!row) notFound();
  const club = getClub(u.club_id);
  const rel = clubRelations(u.club_id);
  const vis = clubCanSee(row, club, rel);
  if (!vis.visible) {
    return (
      <div className="mx-auto max-w-xl pt-10">
        <EmptyState icon={<Lock className="size-5" />} title="Perfil no disponible" text={`Aquest perfil no és visible per al teu club. ${vis.reason ?? ""}`} action={<Link href="/club/cercar" className="text-[13px] font-semibold text-accent-ink hover:underline">Tornar a la cerca</Link>} />
      </div>
    );
  }
  recordProfileView(u, id);

  const ctx = playerCtx();
  const p = presentPlayer(row, ctx, { ownClub: row.club_id === u.club_id });
  const priv = privacyOf(row);
  const mp = toMatchPlayer(row, ctx.prev.get(row.id), ctx.career.get(row.id) ?? 0);
  const offers = clubOffers(u.club_id).filter((o) => o.status === "oberta" && o.gender === row.gender && (u.role === "director" || o.team_id === u.team_id));
  const scored = offers.map((o) => ({ o, m: computeMatch(mp, toMatchOffer(o), ctx.now) })).sort((a, b) => b.m.score - a.m.score);
  const sel = scored.find((s) => s.o.id === sp.offer) ?? scored[0] ?? null;
  const detail = playerDetail(id);
  const teams = scopedTeams(u).map((t) => ({ id: t.id, name: t.name }));

  const entry = get<{ id: string; stage: Stage; team_id: string | null; team_name: string | null; offer_title: string | null; created_at: string }>(
    "SELECT pe.id, pe.stage, pe.team_id, t.name AS team_name, o.title AS offer_title, pe.created_at FROM pipeline_entries pe LEFT JOIN teams t ON t.id = pe.team_id LEFT JOIN offers o ON o.id = pe.offer_id WHERE pe.club_id = ? AND pe.player_id = ?",
    u.club_id, id,
  );
  const entryOutOfScope = entry && u.role === "coach" && entry.team_id !== u.team_id;
  const apps = all<{ id: string; status: AppStatus; created_at: string; message: string | null; title: string; offer_id: string }>("SELECT a.id, a.status, a.created_at, a.message, o.title, o.id AS offer_id FROM applications a JOIN offers o ON o.id = a.offer_id WHERE o.club_id = ? AND a.player_id = ? ORDER BY a.created_at DESC", u.club_id, id);
  const conv = get<{ id: string }>("SELECT id FROM conversations WHERE club_id = ? AND player_id = ?", u.club_id, id);
  const pendingReq = get<{ id: string; status: string; created_at: string }>("SELECT id, status, created_at FROM contact_requests WHERE club_id = ? AND player_id = ? AND status IN ('pendent','pendent_tutor') ORDER BY created_at DESC", u.club_id, id);
  let contact: ContactState;
  if (conv) contact = { kind: "conversation", conversationId: conv.id };
  else if (pendingReq) contact = { kind: "pending", requestId: pendingReq.id, status: pendingReq.status, created_at: pendingReq.created_at, minor: p.minor };
  else {
    const chk = clubCanContact(row, club, rel);
    contact = chk.ok ? { kind: "can", needsGuardian: chk.needsGuardian } : { kind: "blocked", reason: chk.reason ?? "" };
  }
  const isFav = !!get("SELECT id FROM favorites WHERE user_id = ? AND target_type = 'player' AND target_id = ?", u.id, id);

  const scope = teamScope(u);
  const scopeSql = scope === null ? "1=1" : `(x.team_id IN (${scope.map(() => "?").join(",") || "''"}) OR x.author_user_id = ?)`;
  const scopeParams = scope === null ? [] : [...scope, u.id];
  const evals = all<{ id: string; author_user_id: string; author_name: string; author_title: string | null; scores: string; decision: string; comment: string | null; updated_at: string }>(
    `SELECT x.*, us.name AS author_name, us.title AS author_title FROM evaluations x JOIN users us ON us.id = x.author_user_id WHERE x.club_id = ? AND x.player_id = ? AND ${scopeSql} ORDER BY x.updated_at DESC`, u.club_id, id, ...scopeParams,
  );
  const myEval = evals.find((e) => e.author_user_id === u.id);
  const notes = all<{ id: string; body: string; created_at: string; author_name: string; author_user_id: string }>(
    `SELECT x.id, x.body, x.created_at, x.author_user_id, us.name AS author_name FROM notes x JOIN users us ON us.id = x.author_user_id WHERE x.club_id = ? AND x.player_id = ? AND ${scopeSql} ORDER BY x.created_at DESC`, u.club_id, id, ...scopeParams,
  );
  const reports = all<{ id: string; match_title: string; match_date: string; rating: number; observations: string; recommendation: string; author_name: string }>(
    "SELECT sr.*, us.name AS author_name FROM scout_reports sr JOIN users us ON us.id = sr.author_user_id WHERE sr.club_id = ? AND sr.player_id = ? ORDER BY sr.match_date DESC", u.club_id, id,
  );
  const activity = recentActivity(u, 30, id);

  // Context competitiu (proveïdor mock)
  const provider = competitionProvider();
  const season = currentSeason();
  const comp = row.team_id ? provider.competitionForTeam(row.team_id, season.id) : null;
  const standings = comp ? provider.standings(comp.id) : [];
  const myRow = standings.find((s) => s.team_id === row.team_id);

  const videosHidden = !(priv.videos === "tots" || (priv.videos === "verificats" && club.verified) || rel.contacted.has(id) || rel.applied.has(id) || row.club_id === u.club_id);
  const avgEval = (sc: string) => {
    const o = JSON.parse(sc) as Record<string, Record<string, number>>;
    const v = Object.values(o).flatMap((x) => Object.values(x));
    return Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10;
  };

  return (
    <div className="space-y-5">
      <Link href={sel ? `/club/ofertes/${sel.o.id}` : "/club/cercar"} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> {sel ? `Tornar a «${sel.o.title}»` : "Tornar a la cerca"}
      </Link>

      {/* Capçalera */}
      <Card pad={false} className="overflow-hidden animate-rise">
        <div className="h-20 bg-night" style={{ background: `linear-gradient(110deg, #0b0d13 0%, #0b0d13 55%, ${row.club_color ?? "#0f5132"} 140%)` }} />
        <div className="flex flex-col gap-5 px-5 pb-5 md:flex-row md:items-end md:px-6">
          <div className="-mt-10 flex items-end gap-4">
            <div className="rounded-full bg-surface p-1 shadow-card"><Avatar initials={p.initials} hue={p.hue} size={88} /></div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[26px] font-extrabold tracking-tight">{p.name}</h1>
              <VerificationBadge status={p.verification} />
              {p.minor && <MinorBadge />}
            </div>
            <p className="mt-0.5 text-[14px] text-muted">
              <span className="font-semibold text-ink">{p.position_label}</span>
              {p.secondary.length > 0 && <> · també {p.secondary.map((s) => POSITION_LABEL[s].toLowerCase()).join(", ")}</>} · {p.age} anys ({p.birth_year})
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold">
                {row.club_initials && <ClubCrest initials={row.club_initials} color={row.club_color ?? "#334155"} size={22} />}
                {p.club_name}{p.team_name ? ` · ${p.team_name}` : ""}
              </span>
              <Badge>{p.category} · {p.level_label}</Badge>
              <AvailabilityBadge value={p.availability} />
              {entry && !entryOutOfScope && <StageBadge stage={entry.stage} />}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FavoriteButton type="player" id={id} initial={isFav} label={false} />
            <CompareToggle id={id} name={p.name} initials={p.initials} />
            {entryOutOfScope ? (
              <Badge tone="neutral" title="L'està seguint un altre equip del club">Seguit per {entry!.team_name}</Badge>
            ) : (
              <PipelineControl playerId={id} entry={entry ? { id: entry.id, stage: entry.stage, team_name: entry.team_name } : null} teams={teams} offerId={sel?.o.id} canTeamSelect={u.role === "director"} defaultTeam={sel?.o.team_id ?? teams.find((t) => t.name === "Juvenil A")?.id} />
            )}
            <ContactControl playerId={id} firstName={p.first_name} state={contact} clubName={club.name} offerTitle={sel?.o.title} teams={teams} defaultTeam={sel?.o.team_id ?? entry?.team_id ?? null} />
          </div>
        </div>
      </Card>

      {apps.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-accent-soft-2 bg-accent-soft px-4 py-3 text-[13px]">
          <span className="font-bold text-accent-ink">S'ha inscrit a les teves ofertes:</span>
          {apps.map((a) => (
            <Link key={a.id} href={`/club/ofertes/${a.offer_id}?tab=sollicituds`} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 font-semibold hover:underline">
              {a.title} <span className="text-muted">· {APP_STATUS_LABEL[a.status]} · {fmtRelative(a.created_at)}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-5">
          <Card>
            <div className="flex items-start gap-3 rounded-xl bg-bg p-4">
              <Sparkles className="mt-0.5 size-5 shrink-0 text-accent-ink" />
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-accent-ink">Resum ScoutUp Intelligence</p>
                <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{profileSummary(p)}</p>
              </div>
            </div>
            {p.description && (
              <blockquote className="mt-4 border-l-2 border-accent pl-4 text-[14px] italic leading-relaxed text-muted">«{p.description}»<span className="mt-1 block text-[12px] not-italic text-subtle">— Descripció escrita pel jugador</span></blockquote>
            )}
          </Card>

          <Card>
            <ClientTabs
              initial={sp.tab}
              tabs={[
                {
                  key: "resum", label: "Rendiment", content: (
                    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
                      <div className="flex flex-col items-center gap-3">
                        <Radar series={[{ name: p.name, color: "#00b85f", values: p.radar }]} size={240} />
                        <p className="text-[11.5px] text-subtle">Atributs declarats i avaluats (escala 1–10)</p>
                      </div>
                      <div>
                        <AttrBars attrs={p.attrs} position={p.position} />
                        {p.prev && (
                          <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
                            {[["Conv.", p.prev.callups], ["Partits", p.prev.matches], ["Titular", p.prev.starts], ["Minuts", p.prev.minutes.toLocaleString("ca-ES")], [p.position === "POR" ? "Porteria 0" : "Gols", p.position === "POR" ? p.prev.clean_sheets : p.prev.goals], ["Targetes", p.prev.yellow + p.prev.red]].map(([k, v]) => (
                              <div key={k as string} className="rounded-xl bg-sunken p-2.5 text-center">
                                <p className="text-[18px] font-extrabold tabular">{v}</p>
                                <p className="text-[11px] text-muted">{k}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="mt-2 text-[11.5px] text-subtle">Temporada {ctx.prevSeason.label}{p.prev ? <> · <VerificationBadge status={p.prev.verification} compact /></> : null}</p>
                      </div>
                    </div>
                  ),
                },
                { key: "estadistiques", label: "Estadístiques", content: <StatsTable stats={detail.stats} hidden={p.stats_hidden} /> },
                { key: "trajectoria", label: "Trajectòria", count: detail.career.length, content: <div className="space-y-5"><CareerList career={detail.career} /><div><p className="mb-2 text-[12px] font-bold uppercase tracking-[0.1em] text-subtle">Assoliments</p><Achievements items={detail.achievements} experiences={detail.experiences} /></div></div> },
                { key: "videos", label: "Vídeos", count: videosHidden ? undefined : detail.videos.length, content: <VideoGrid videos={detail.videos} hidden={videosHidden} /> },
                { key: "avaluacio", label: "Avaluació", count: evals.length, content: (
                  <div className="space-y-6">
                    {evals.length > 0 && (
                      <div className="grid gap-3 md:grid-cols-2">
                        {evals.map((e) => {
                          const sc = JSON.parse(e.scores) as Record<string, Record<string, number>>;
                          return (
                            <div key={e.id} className="rounded-2xl border border-line p-4">
                              <div className="flex items-center justify-between">
                                <div><p className="text-[13.5px] font-bold">{e.author_name}</p><p className="text-[12px] text-muted">{e.author_title} · {fmtRelative(e.updated_at)}</p></div>
                                <div className="text-right"><p className="text-[22px] font-extrabold tabular leading-none">{avgEval(e.scores)}</p><p className="text-[11px] text-subtle">mitjana</p></div>
                              </div>
                              <div className="mt-3 grid grid-cols-5 gap-1.5">
                                {EVAL_AREAS.map((a) => {
                                  const v = Object.values(sc[a.key] ?? {});
                                  const m = v.length ? v.reduce((x, y) => x + y, 0) / v.length : 0;
                                  return <div key={a.key} className="rounded-lg bg-sunken px-1 py-1.5 text-center"><p className="text-[14px] font-bold tabular">{m.toFixed(1)}</p><p className="text-[10.5px] text-muted">{a.label}</p></div>;
                                })}
                              </div>
                              <p className="mt-3 text-[12.5px]"><Badge tone={e.decision === "descartar" ? "danger" : e.decision === "fitxar" ? "accent" : e.decision === "prova" ? "info" : "neutral"}>{EVAL_DECISIONS[e.decision]}</Badge></p>
                              {e.comment && <p className="mt-2 text-[13px] leading-relaxed text-muted">{e.comment}</p>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div>
                      <p className="mb-3 text-[13px] font-bold">{myEval ? "La teva avaluació" : "Nova avaluació"}</p>
                      <EvaluationForm playerId={id} initial={myEval ? { scores: JSON.parse(myEval.scores), decision: myEval.decision, comment: myEval.comment ?? "" } : null} />
                    </div>
                  </div>
                ) },
                { key: "notes", label: "Notes privades", count: notes.length, content: <NotesPanel playerId={id} notes={notes} meId={u.id} isDirector={u.role === "director"} /> },
                { key: "activitat", label: "Activitat", count: activity.length, content: (
                  <div>
                    <div className="mb-4 flex items-center justify-between"><p className="text-[13px] text-muted">Historial d'aquest jugador al teu club.</p><InteractionForm playerId={id} /></div>
                    {activity.length === 0 ? <EmptyState icon={<History className="size-5" />} title="Sense activitat" /> : (
                      <ol className="relative space-y-3 border-l border-line pl-5">
                        {activity.map((a) => (
                          <li key={a.id} className="relative text-[13px]">
                            <span className="absolute -left-[25px] top-1.5 size-2.5 rounded-full bg-line-strong" />
                            <p>{a.text}</p>
                            <p className="text-[11.5px] text-subtle">{a.user_name ?? "Sistema"} · {fmtDate(a.created_at, { short: true })} · {fmtRelative(a.created_at)}</p>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                ) },
              ]}
            />
          </Card>

          {reports.length > 0 && (
            <Card>
              <CardHeader title="Informes de scouting" subtitle="Observacions en partits" icon={<Binoculars className="size-4" />} />
              <div className="space-y-3">
                {reports.map((r) => (
                  <div key={r.id} className="rounded-xl border border-line p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[13.5px] font-bold">{r.match_title}</p>
                      <div className="flex items-center gap-2"><Badge tone="info">{SCOUT_RECOMMENDATION[r.recommendation]}</Badge><span className="text-[13px] font-extrabold tabular">{r.rating}/10</span></div>
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted">{r.observations}</p>
                    <p className="mt-1 text-[11.5px] text-subtle">{r.author_name} · {fmtDate(r.match_date, { short: true, year: true })}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Columna lateral */}
        <div className="space-y-5">
          <Card>
            {sel ? (
              <>
                <div className="mb-4 space-y-1.5">
                  <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-subtle">Compatibilitat amb l'oferta</p>
                  <OfferSelector offers={scored.map((s) => ({ id: s.o.id, title: s.o.title, score: s.m.score }))} value={sel.o.id} />
                </div>
                <MatchBreakdown match={sel.m} />
              </>
            ) : (
              <EmptyState title="Sense ofertes obertes" text="Crea una oferta per veure la compatibilitat d'aquest jugador." />
            )}
          </Card>

          <Card>
            <CardHeader title="Dades bàsiques" />
            <div className="flex gap-4">
              <PositionPitch primary={p.position} secondary={p.secondary} size={96} />
              <dl className="min-w-0 flex-1 space-y-2 text-[13px]">
                <div className="flex items-center gap-2"><MapPin className="size-4 text-subtle" /><span>{p.location}</span></div>
                <div className="flex items-center gap-2"><Footprints className="size-4 text-subtle" /><span>Peu {FOOT_LABEL[p.foot].toLowerCase()}</span></div>
                <div className="flex items-center gap-2"><Ruler className="size-4 text-subtle" /><span>{p.height ? `${p.height} cm` : "Alçada no visible"}</span></div>
                <div className="flex items-center gap-2"><CalendarDays className="size-4 text-subtle" /><span>{CONTRACT_LABEL[row.contract_status]}</span></div>
                <div className="flex items-center gap-2"><Languages className="size-4 text-subtle" /><span>{p.languages ?? "—"}</span></div>
              </dl>
            </div>
            {p.style && <p className="mt-3 rounded-xl bg-sunken px-3 py-2 text-[13px]"><span className="text-muted">Estil:</span> <span className="font-semibold">{p.style}</span></p>}
            <p className="mt-3 text-[11.5px] text-subtle">Perfil actualitzat {fmtRelative(p.updated_at)} · completat al {p.completeness}%</p>
          </Card>

          <Card>
            <CardHeader title="Context competitiu" subtitle={comp ? `${comp.name} · ${season.label}` : "Sense competició associada"} icon={<Trophy className="size-4" />} />
            {comp && myRow ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {[["Posició", `${myRow.pos}a`], ["Punts", myRow.points], ["Jornades", myRow.played]].map(([k, v]) => (
                    <div key={k as string} className="rounded-xl bg-sunken p-2.5 text-center"><p className="text-[18px] font-extrabold tabular">{v}</p><p className="text-[11px] text-muted">{k}</p></div>
                  ))}
                </div>
                <div className="mt-3 space-y-1">
                  {standings.slice(Math.max(0, myRow.pos - 3), myRow.pos + 2).map((s) => (
                    <div key={s.pos} className={cn("flex items-center gap-2 rounded-lg px-2 py-1 text-[12.5px]", s.team_id === row.team_id && "bg-accent-soft font-bold")}>
                      <span className="w-5 text-right tabular text-subtle">{s.pos}</span>
                      <span className="flex-1 truncate">{s.team_name}</span>
                      <span className="tabular">{s.points}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2 rounded-xl border border-dashed border-line-strong p-3 text-[11.5px] leading-relaxed text-muted">
                  <Info className="mt-0.5 size-3.5 shrink-0" />
                  <span><strong className="text-ink-2">Dades de demostració</strong> ({provider.label.toLowerCase()}). Amb una font oficial, la competició, el grup i la classificació serien contrastables.</span>
                </div>
              </>
            ) : (
              <p className="text-[13px] text-muted">El jugador no té un equip actual a la plataforma.</p>
            )}
          </Card>

          {p.minor && (
            <Card className="border-[#ddd6fe] bg-violet-soft/60">
              <div className="flex gap-3">
                <ShieldAlert className="size-5 shrink-0 text-violet" />
                <p className="text-[12.5px] leading-relaxed text-ink-2"><strong>Menor protegit.</strong> Ubicació mostrada només per comarca. Qualsevol contacte requereix l'autorització del tutor legal, que pot revocar-la en qualsevol moment.</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
