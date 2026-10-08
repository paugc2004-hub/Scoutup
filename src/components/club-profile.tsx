import Link from "next/link";
import { MapPin, Globe, AtSign, Mail, Phone, Clock, ShieldCheck, ShieldQuestion, Building, CalendarDays, Languages, Trophy } from "lucide-react";
import type { ClubRow } from "@/server/services/club";
import { facilitiesOf, clubTeams } from "@/server/services/club";
import { competitionProvider } from "@/server/competition/provider";
import { currentSeason } from "@/server/services/players";
import { all } from "@/server/db/client";
import { Badge, Card, CardHeader, ClubCrest } from "@/components/ui";
import { GENDER_LABEL, POSITION_LABEL } from "@/lib/domain";
import type { Position } from "@/lib/domain";
import type { ReactNode } from "react";

export function ClubProfileView({ club, actions, offerHref }: { club: ClubRow; actions?: ReactNode; offerHref: (id: string) => string }) {
  const provider = competitionProvider();
  const season = currentSeason();
  const teams = clubTeams(club.id).map((t) => ({ t, comp: provider.competitionForTeam(t.id, season.id) }));
  const offers = all<{ id: string; title: string; position: string; kind: string; team_name: string | null }>("SELECT o.id, o.title, o.position, o.kind, t.name AS team_name FROM offers o LEFT JOIN teams t ON t.id = o.team_id WHERE o.club_id = ? AND o.status = 'oberta' ORDER BY o.created_at DESC", club.id);
  const fac = facilitiesOf(club);
  const Block = ({ title, text }: { title: string; text: string | null }) => (text ? <div><p className="mb-1 text-[12px] font-bold uppercase tracking-[0.1em] text-subtle">{title}</p><p className="text-[14px] leading-relaxed text-ink-2">{text}</p></div> : null);
  return (
    <div className="space-y-5">
      <Card pad={false} className="overflow-hidden">
        <div className="h-28" style={{ background: `linear-gradient(115deg, ${club.color_primary}, #0b0d13 85%)` }} />
        <div className="flex flex-col gap-4 px-5 pb-5 md:flex-row md:items-end md:px-6">
          <div className="-mt-12 rounded-2xl bg-surface p-1.5 shadow-card"><ClubCrest initials={club.initials} color={club.color_primary} size={84} /></div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[26px] font-extrabold tracking-tight">{club.name}</h1>
              {club.verified ? <Badge tone="accent" title="Club verificado en la demo (simulado)"><ShieldCheck className="size-3" /> Club verificado</Badge> : <Badge tone="warn"><ShieldQuestion className="size-3" /> Pendiente de verificación</Badge>}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
              <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {club.city} · {club.comarca}</span>
              {club.founded && <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" /> Fundado en {club.founded}</span>}
              <span className="inline-flex items-center gap-1"><Trophy className="size-3.5" /> {teams.length} equipos</span>
            </p>
          </div>
          {actions}
        </div>
      </Card>
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card>
            <div className="space-y-5">
              <Block title="Sobre el club" text={club.description} />
              <Block title="Historia" text={club.history} />
              <Block title="Filosofía" text={club.philosophy} />
              <Block title="Modelo deportivo" text={club.sporting_model} />
              <Block title="Objetivos" text={club.objectives} />
              {club.values_text && <div><p className="mb-2 text-[12px] font-bold uppercase tracking-[0.1em] text-subtle">Valors</p><div className="flex flex-wrap gap-2">{club.values_text.split("·").map((v) => <Badge key={v} tone="accent">{v.trim()}</Badge>)}</div></div>}
            </div>
          </Card>
          <Card>
            <CardHeader title="Equipos" subtitle={`Temporada ${season.label} · competiciones de demostración`} />
            <div className="grid gap-2 sm:grid-cols-2">
              {teams.map(({ t, comp }) => (
                <div key={t.id} className="rounded-xl border border-line p-3">
                  <p className="text-[14px] font-bold">{t.name}</p>
                  <p className="text-[12.5px] text-muted">{t.category} · {GENDER_LABEL[t.gender]}</p>
                  <p className="mt-1 text-[12px] text-subtle">{comp?.name ?? "—"}</p>
                </div>
              ))}
            </div>
          </Card>
          {offers.length > 0 && (
            <Card>
              <CardHeader title="Oportunidades abiertas" />
              <div className="space-y-2">
                {offers.map((o) => (
                  <Link key={o.id} href={offerHref(o.id)} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3 transition hover:border-line-strong">
                    <div><p className="text-[13.5px] font-bold">{o.title}</p><p className="text-[12px] text-muted">{o.team_name} · {POSITION_LABEL[o.position as Position]}</p></div>
                    {o.kind === "prova" ? <Badge tone="violet">Prueba</Badge> : <Badge>Incorporación</Badge>}
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>
        <div className="space-y-5">
          <Card>
            <CardHeader title="Contacto" />
            <dl className="space-y-2.5 text-[13px]">
              {club.website && <div className="flex items-center gap-2"><Globe className="size-4 text-subtle" />{club.website.replace("https://", "")}</div>}
              {club.instagram && <div className="flex items-center gap-2"><AtSign className="size-4 text-subtle" />{club.instagram}</div>}
              {club.email && <div className="flex items-center gap-2"><Mail className="size-4 text-subtle" />{club.email}</div>}
              {club.phone && <div className="flex items-center gap-2"><Phone className="size-4 text-subtle" />{club.phone}</div>}
              {club.office_hours && <div className="flex items-center gap-2"><Clock className="size-4 text-subtle" />{club.office_hours}</div>}
              {club.languages && <div className="flex items-center gap-2"><Languages className="size-4 text-subtle" />{club.languages}</div>}
            </dl>
            <p className="mt-3 text-[11.5px] text-subtle">Datos de contacto ficticios (dominio .example).</p>
          </Card>
          <Card>
            <CardHeader title="Instalaciones" icon={<Building className="size-4" />} />
            <div className="space-y-2">
              {fac.length === 0 && <p className="text-[13px] text-subtle">Sin instalaciones informadas.</p>}
              {fac.map((f) => <div key={f.name} className="rounded-xl bg-bg p-3"><p className="text-[13px] font-semibold">{f.name}</p><p className="text-[12px] text-muted">{f.type}{f.note ? ` · ${f.note}` : ""}</p></div>)}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
