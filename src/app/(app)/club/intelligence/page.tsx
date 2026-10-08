import Link from "next/link";
import { Sparkles, Cpu, ArrowRight, Megaphone } from "lucide-react";
import { can } from "@/server/services/access";
import { requireClubStaff } from "@/server/auth/session";
import { club as getClub } from "@/server/services/club";
import { runIntelligence } from "@/server/services/intelligence";
import { Avatar, Badge, Card, EmptyState, MatchRing, PageHeader, StageBadge, VerificationBadge, btnClass } from "@/components/ui";
import { IntelligenceBox } from "@/components/client/intelligence-box";
import { FactorStrip, QuickPipeline } from "@/components/club/candidates-list";
import { CompareToggle } from "@/components/club/compare-tray";
import { FOOT_LABEL } from "@/lib/domain";

export const metadata = { title: "ScoutUp Intelligence" };

export default async function IntelligencePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const u = await requireClubStaff();
  const { q } = await searchParams;
  const club = getClub(u.club_id);
  const res = q ? runIntelligence(q, club) : null;
  const newOfferHref = res ? `/club/oportunitats/nova?position=${res.offer.position}` : "/club/oportunitats/nova";

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Asistente de captación" title={<span className="inline-flex items-center gap-2.5">ScoutUp Intelligence <Sparkles className="size-6 text-accent-600" /><Badge tone="warn">IA demo · copilot</Badge></span>} subtitle="Describe en lenguaje natural el jugador que necesitas. El asistente lo convierte en criterios, ordena los perfiles visibles para tu club y te explica por qué encajan. Es un copiloto: propone y explica, pero la decisión es siempre del club y no inventa datos." />
      <IntelligenceBox initial={q ?? ""} autoFocus={!q} />

      {res && (
        <div className="mt-8 space-y-5 animate-rise">
          <Card className="border-night bg-night text-white">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-night"><Sparkles className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold leading-relaxed">{res.summary}</p>
                <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-night-muted">He interpretado</p>
                <div className="flex flex-wrap gap-1.5">
                  {res.chips.map((c) => (
                    <span key={c.key} className="inline-flex items-center gap-1.5 rounded-full border border-night-line bg-night-2 px-2.5 py-1 text-[12.5px]"><span className="text-night-muted">{c.label}:</span> <span className="font-semibold">{c.value}</span></span>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-night-line pt-4">
              {can.manageOffers(u) && <Link href={newOfferHref} className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-accent px-3 text-[12.5px] font-bold text-night hover:bg-accent-600"><Megaphone className="size-3.5" /> Convertir en oportunidad</Link>}
              <Link href={`/club/cercar?pos=${res.offer.position}&foot=${res.offer.foot === "indiferent" ? "" : res.offer.foot}&g=${res.offer.gender}`} className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-night-line px-3 text-[12.5px] font-semibold text-night-text hover:bg-night-2">Abrir en la búsqueda avanzada <ArrowRight className="size-3.5" /></Link>
              <span className="ml-auto inline-flex items-center gap-1.5 text-[11.5px] text-night-muted"><Cpu className="size-3.5" /> Motor determinista local · sin IA externa</span>
            </div>
          </Card>

          {res.results.length === 0 ? (
            <EmptyState title="Sin resultados" text="Ningún perfil visible para tu club cumple estos criterios. Prueba a ampliar la zona o el nivel." />
          ) : (
            <div className="space-y-3">
              {res.results.map((c, i) => (
                <Card key={c.player.id} className="transition hover:border-line-strong" >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start">
                    <div className="flex items-center gap-3 md:w-64 md:shrink-0">
                      <span className="w-5 text-right text-[13px] font-extrabold tabular text-subtle">{i + 1}</span>
                      <Avatar initials={c.player.initials} hue={c.player.hue} size={46} />
                      <div className="min-w-0">
                        <Link href={`/club/jugadors/${c.player.id}`} className="block truncate text-[15px] font-bold hover:underline">{c.player.name}</Link>
                        <p className="truncate text-[12.5px] text-muted">{c.player.position_label} · {c.player.age} años</p>
                        <p className="truncate text-[12.5px] text-muted">{c.player.club_name} · {c.player.level_label}</p>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] leading-relaxed text-ink-2">{c.explanation}</p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <FactorStrip factors={c.match.factors} />
                        <VerificationBadge status={c.player.verification} />
                        <Badge>Pie {FOOT_LABEL[c.player.foot].toLowerCase()}</Badge>
                        {c.player.height && <Badge>{c.player.height} cm</Badge>}
                        <Badge>{c.player.location} · {Math.round(c.km)} km</Badge>
                        {c.player.minor && <Badge tone="violet">Menor</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 md:flex-col md:items-end">
                      <MatchRing score={c.match.score} size={54} stroke={5} />
                      <div className="flex items-center gap-1.5">
                        <CompareToggle id={c.player.id} name={c.player.name} initials={c.player.initials} compact />
                        {c.stage ? <StageBadge stage={c.stage} /> : <QuickPipeline playerId={c.player.id} name={c.player.name} />}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              <p className="pt-2 text-center text-[12px] text-subtle">Mostrando los {res.results.length} mejores de {res.total} perfiles compatibles (≥45 %).</p>
            </div>
          )}
        </div>
      )}

      {!res && (
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            ["1 · Interpreta", "Detecta posición, pie, edad o categoría, zona, nivel, altura y características (juego aéreo, velocidad, visión…)."],
            ["2 · Cerca", "Aplica el mismo motor de compatibilidad de las oportunidades, solo sobre perfiles que la privacidad permite ver."],
            ["3 · Explica", "Cada resultado viene con su porqué: qué cumple y qué hay que tener en cuenta."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-line bg-surface p-5"><p className="text-[14px] font-bold">{t}</p><p className="mt-1.5 text-[13px] leading-relaxed text-muted">{d}</p></div>
          ))}
          <p className="md:col-span-3 text-center text-[12px] text-subtle"><Cpu className="mr-1 inline size-3.5" />ScoutUp Intelligence funciona con reglas deterministas locales. No envía datos a ningún servicio externo. <Link href="/club/cercar" className={btnClass("ghost", "sm")}>Búsqueda avanzada</Link></p>
        </div>
      )}
    </div>
  );
}
