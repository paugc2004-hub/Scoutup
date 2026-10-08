import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Cake, Layers, Footprints, Ruler, Clock, Sparkles, Target, FlaskConical, ShieldCheck, Flag, Building2 } from "lucide-react";
import { requirePlayer } from "@/server/auth/session";
import { get } from "@/server/db/client";
import { playerCtx, playerRow, toMatchPlayer } from "@/server/services/players";
import { offerRow, toMatchOffer, traitsOf } from "@/server/services/offers";
import { computeMatch } from "@/lib/matching";
import { Badge, Card, CardHeader, ClubCrest } from "@/components/ui";
import { MatchBreakdown } from "@/components/match-breakdown";
import { ApplyPanel } from "@/components/player/opportunities";
import { FavoriteButton } from "@/components/club/player-actions";
import { ReportButton } from "@/components/player/report-button";
import { FOOT_LABEL, POSITION_LABEL, levelLabel, traitLabel } from "@/lib/domain";
import type { AppStatus, Position } from "@/lib/domain";
import { fmtDate, fmtDateTime, fmtRelative } from "@/lib/time";

export default async function OpportunityDetail({ params }: { params: Promise<{ id: string }> }) {
  const u = await requirePlayer();
  const { id } = await params;
  const o = offerRow(id);
  const row = playerRow(u.player_id)!;
  if (!o || (o.status !== "oberta" && !get("SELECT id FROM applications WHERE offer_id = ? AND player_id = ?", id, u.player_id))) notFound();
  const ctx = playerCtx();
  const m = computeMatch(toMatchPlayer(row, ctx.prev.get(row.id), ctx.career.get(row.id) ?? 0), toMatchOffer(o), ctx.now);
  const app = get<{ status: AppStatus; created_at: string }>("SELECT status, created_at FROM applications WHERE offer_id = ? AND player_id = ?", id, u.player_id);
  const fav = !!get("SELECT id FROM favorites WHERE user_id = ? AND target_type = 'offer' AND target_id = ?", u.id, id);
  const blocked = !!get("SELECT id FROM blocks WHERE player_id = ? AND club_id = ?", u.player_id, o.club_id);
  const club = get<{ description: string | null; philosophy: string | null; city: string }>("SELECT description, philosophy, city FROM clubs WHERE id = ?", o.club_id)!;
  const traits = traitsOf(o);
  const req = [
    { icon: <Target className="size-4" />, k: "Posició", v: POSITION_LABEL[o.position as Position] },
    { icon: <Cake className="size-4" />, k: "Nascuts", v: `${o.birth_year_min}–${o.birth_year_max}` },
    { icon: <Layers className="size-4" />, k: "Nivell", v: `${levelLabel(o.level_min)} o superior` },
    { icon: <MapPin className="size-4" />, k: "Zona", v: `${o.zone_city} · ${o.max_km} km` },
    { icon: <Footprints className="size-4" />, k: "Peu", v: FOOT_LABEL[o.foot] },
    { icon: <Ruler className="size-4" />, k: "Alçada", v: o.height_min ? `${o.height_min} cm o més` : "Indiferent" },
  ];
  return (
    <div className="space-y-5">
      <Link href="/jugador/oportunitats" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" /> Oportunitats</Link>
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card className="animate-rise">
            <div className="flex items-start gap-4">
              <ClubCrest initials={o.club_initials} color={o.club_color} size={56} />
              <div className="min-w-0 flex-1">
                <Link href={`/jugador/clubs/${o.club_id}`} className="inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink hover:underline">{o.club_name} {o.club_verified ? <ShieldCheck className="size-4 text-accent-ink" /> : <Badge tone="warn">No verificat</Badge>}</Link>
                <h1 className="mt-0.5 text-[26px] font-extrabold leading-tight tracking-tight">{o.title}</h1>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone="dark">{o.team_name}</Badge>
                  {o.kind === "prova" ? <Badge tone="violet"><FlaskConical className="size-3" /> Jornada de proves</Badge> : <Badge>Incorporació</Badge>}
                  <Badge>Publicada {fmtRelative(o.created_at)}</Badge>
                  {o.expires_at && <Badge>Fins al {fmtDate(o.expires_at, { short: true })}</Badge>}
                </div>
              </div>
              <FavoriteButton type="offer" id={o.id} initial={fav} label={false} />
            </div>
            {o.description && <p className="mt-5 text-[14.5px] leading-relaxed text-ink-2">{o.description}</p>}
            <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-3">
              {req.map((r) => <div key={r.k} className="flex items-start gap-2.5 rounded-xl bg-bg p-3"><span className="mt-0.5 text-subtle">{r.icon}</span><div><p className="text-[11.5px] font-semibold text-muted">{r.k}</p><p className="text-[13px] font-bold">{r.v}</p></div></div>)}
            </div>
            {traits.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-2"><span className="text-[12.5px] font-semibold text-muted">Busquen:</span>{traits.map((t) => <Badge key={t} tone="accent">{traitLabel(t)}</Badge>)}</div>}
            {o.restrictions && <p className="mt-4 flex gap-2 rounded-xl border border-[#fde68a] bg-warn-soft px-3.5 py-2.5 text-[13px] text-ink-2"><Clock className="mt-0.5 size-4 shrink-0 text-warn" /><span><strong>Condicions:</strong> {o.restrictions}</span></p>}
            {o.kind === "prova" && o.trial_date && <p className="mt-3 rounded-xl bg-violet-soft px-3.5 py-2.5 text-[13px] font-semibold text-violet">Data de la prova: {fmtDateTime(o.trial_date)}</p>}
          </Card>
          <Card>
            <CardHeader title="Per què encaixes" subtitle="El mateix càlcul que veu el club, explicat per a tu." icon={<Sparkles className="size-4 text-accent-ink" />} />
            <MatchBreakdown match={m} title={`Encaixes al ${m.score}%`} subtitle={m.score >= 80 ? "Molt bon encaix: val la pena que hi mostris interès." : m.score >= 60 ? "Bon encaix, amb algun aspecte a tenir en compte." : "Encaix parcial: revisa els factors en taronja."} />
          </Card>
        </div>
        <div className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <Card>
            <ApplyPanel offerId={o.id} clubName={o.club_name} status={app?.status ?? null} appliedAt={app?.created_at ?? null} blocked={blocked} score={m.score} isTrial={o.kind === "prova"} trialDate={o.trial_date} />
          </Card>
          <Card>
            <CardHeader title="Sobre el club" icon={<Building2 className="size-4" />} />
            <p className="text-[13px] leading-relaxed text-muted">{club.description}</p>
            {club.philosophy && <p className="mt-2 text-[13px] leading-relaxed text-ink-2"><strong>Filosofia:</strong> {club.philosophy}</p>}
            <Link href={`/jugador/clubs/${o.club_id}`} className="mt-3 inline-block text-[13px] font-semibold text-accent-ink hover:underline">Veure el perfil del club →</Link>
          </Card>
          <div className="flex justify-center"><ReportButton targetType="offer" targetId={o.id} label="Denunciar aquesta oportunitat" icon={<Flag className="size-3.5" />} /></div>
        </div>
      </div>
    </div>
  );
}
