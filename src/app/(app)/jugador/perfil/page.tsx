import Link from "next/link";
import { PenLine, Eye, MapPin, Footprints, Ruler, Languages, Lock, UserRound } from "lucide-react";
import { requirePlayer } from "@/server/auth/session";
import { playerCtx, playerRow, presentPlayer, preferencesOf, privacyOf } from "@/server/services/players";
import { playerDetail } from "@/server/services/player-detail";
import { completenessOf } from "@/server/services/player-actions";
import { Avatar, AvailabilityBadge, Badge, Card, CardHeader, LinkButton, MatchRing, MinorBadge, PageHeader, Radar, VerificationBadge, cn } from "@/components/ui";
import { StatsTable, CareerList, VideoGrid, Achievements, AttrBars, PositionPitch } from "@/components/player-sections";
import { CONTRACT_LABEL, FOOT_LABEL, INTEREST_LABEL, POSITION_LABEL, PROFILE_VISIBILITY_LABEL } from "@/lib/domain";
import { fmtRelative } from "@/lib/time";

export const metadata = { title: "Mi perfil" };

export default async function MyProfile({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const u = await requirePlayer();
  const sp = await searchParams;
  const asClub = sp.vista === "club";
  const row = playerRow(u.player_id)!;
  const ctx = playerCtx();
  const p = presentPlayer(row, ctx, { full: !asClub });
  const priv = privacyOf(row);
  const prefs = preferencesOf(row);
  const d = playerDetail(u.player_id);
  const comp = completenessOf(u.player_id);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Mi perfil"
        title={p.name}
        subtitle={asClub ? "Así te ve un club verificado, con tus controles de privacidad aplicados." : "Este es tu perfil completo. Solo tú (y tu tutor, si tienes) lo ves así."}
        actions={<>
          <div className="flex rounded-xl border border-line bg-surface p-0.5">
            <Link href="/jugador/perfil" className={cn("flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-semibold", !asClub ? "bg-ink text-white" : "text-muted")}><UserRound className="size-3.5" /> Jo</Link>
            <Link href="/jugador/perfil?vista=club" className={cn("flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-semibold", asClub ? "bg-ink text-white" : "text-muted")}><Eye className="size-3.5" /> Vista de club</Link>
          </div>
          <LinkButton href="/jugador/perfil/editar" variant="primary" icon={<PenLine className="size-4" />}>Editar perfil</LinkButton>
        </>}
      />
      {asClub && <div className="flex items-center gap-2 rounded-2xl border border-info/30 bg-info-soft px-4 py-3 text-[13px] text-ink-2"><Lock className="size-4 text-info" /> Visibilidad del perfil: <strong>{PROFILE_VISIBILITY_LABEL[priv.profile]}</strong>. {p.stats_hidden ? "Estadísticas ocultas. " : ""}{p.height ? "" : "Altura oculta. "}<Link href="/jugador/privacitat" className="ml-auto font-semibold text-info hover:underline">Cambiar</Link></div>}
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Card>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Avatar initials={p.initials} hue={p.hue} size={84} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><p className="text-[22px] font-extrabold tracking-tight">{p.name}</p><VerificationBadge status={p.verification} />{p.minor && <MinorBadge />}</div>
                <p className="text-[14px] text-muted">{p.position_label}{p.secondary.length ? ` · también ${p.secondary.map((s) => POSITION_LABEL[s].toLowerCase()).join(", ")}` : ""} · {p.age} años</p>
                <div className="mt-2 flex flex-wrap gap-2"><Badge>{p.club_name}{p.team_name ? ` · ${p.team_name}` : ""}</Badge><Badge>{p.category} · {p.level_label}</Badge><AvailabilityBadge value={p.availability} /></div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-muted">
                  <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" />{p.location}</span>
                  <span className="inline-flex items-center gap-1.5"><Footprints className="size-4" />Peu {FOOT_LABEL[p.foot].toLowerCase()}</span>
                  <span className="inline-flex items-center gap-1.5"><Ruler className="size-4" />{p.height ? `${p.height} cm` : "Altura oculta"}</span>
                  <span className="inline-flex items-center gap-1.5"><Languages className="size-4" />{p.languages ?? "—"}</span>
                </div>
              </div>
              <PositionPitch primary={p.position} secondary={p.secondary} size={86} />
            </div>
            {p.description && <p className="mt-5 border-t border-line pt-4 text-[14px] leading-relaxed text-ink-2">{p.description}</p>}
            {p.style && <p className="mt-2 text-[13px]"><span className="text-muted">Estilo de juego:</span> <strong>{p.style}</strong></p>}
          </Card>
          <Card>
            <CardHeader title="Atributos" subtitle="Autoevaluación (1–10). Los clubes la contrastan con sus observaciones." />
            <div className="grid gap-6 md:grid-cols-[220px_1fr]"><Radar series={[{ name: p.name, color: "#00b85f", values: p.radar }]} size={220} /><AttrBars attrs={p.attrs} position={p.position} /></div>
          </Card>
          <Card><CardHeader title="Estadísticas" subtitle="Convocatorias, titularidades, minutos, goles y tarjetas por temporada" /><StatsTable stats={d.stats} hidden={p.stats_hidden} /></Card>
          <Card><CardHeader title="Trayectoria" /><CareerList career={d.career} /><div className="mt-5"><Achievements items={d.achievements} experiences={d.experiences} /></div></Card>
          <Card><CardHeader title="Vídeos" /><VideoGrid videos={d.videos} /></Card>
        </div>
        <div className="space-y-5">
          <Card>
            <div className="flex items-center gap-4"><MatchRing score={comp.score} size={70} stroke={7} /><div><p className="text-[16px] font-extrabold">Perfil {comp.score}% complet</p><p className="text-[12.5px] text-muted">Actualitzat {fmtRelative(row.updated_at)}</p></div></div>
            <ul className="mt-4 space-y-1.5 text-[13px]">
              {comp.items.map((i) => <li key={i.key} className={cn("flex items-center justify-between", i.done ? "text-muted" : "font-semibold")}><span>{i.done ? "✓" : "○"} {i.label}</span>{!i.done && <Link href={`/jugador/perfil/editar?pas=${i.step}`} className="text-[12px] text-accent-ink hover:underline">+{i.weight}%</Link>}</li>)}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Qué busco" />
            <dl className="space-y-2 text-[13px]">
              <div className="flex justify-between"><dt className="text-muted">Situación</dt><dd className="font-semibold">{CONTRACT_LABEL[row.contract_status]}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Distancia máxima</dt><dd className="font-semibold">{prefs.maxKm} km</dd></div>
              <div><dt className="text-muted">Intereses</dt><dd className="mt-1 flex flex-wrap gap-1.5">{prefs.interests.map((i) => <Badge key={i}>{INTEREST_LABEL[i] ?? i}</Badge>)}</dd></div>
              {prefs.notes && <div><dt className="text-muted">Notas</dt><dd className="mt-1 text-ink-2">{prefs.notes}</dd></div>}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
