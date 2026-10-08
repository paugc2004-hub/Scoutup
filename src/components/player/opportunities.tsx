"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star, MapPin, FlaskConical, Send, CheckCircle2, ShieldCheck, Clock } from "lucide-react";
import { Badge, ClubCrest, EmptyState, MatchRing, cn } from "@/components/ui";
import { Button, Chip, Modal, Select, Textarea, useApi } from "@/components/client/kit";
import { APP_STATUS_LABEL } from "@/lib/domain";
import type { AppStatus } from "@/lib/domain";
import { fmtRelative, fmtDateTime } from "@/lib/time";

export type OppLite = { id: string; title: string; kind: string; club_id: string; club_name: string; club_initials: string; club_color: string; club_verified: number; team_name: string | null; position: string; position_label: string; mine: boolean; score: number; km: number; created_at: string; trial_date: string | null; status: string | null; favorite: boolean; traits: string[]; level: string };

export function OpportunityList({ items }: { items: OppLite[] }) {
  const [kind, setKind] = useState("tots");
  const [min, setMin] = useState(0);
  const [onlyMine, setOnlyMine] = useState(false);
  const [onlyFav, setOnlyFav] = useState(false);
  const [maxKm, setMaxKm] = useState(0);
  const [sort, setSort] = useState("match");
  const list = useMemo(() => {
    let l = items.filter((o) => o.score >= min);
    if (kind !== "tots") l = l.filter((o) => o.kind === kind);
    if (onlyMine) l = l.filter((o) => o.mine);
    if (onlyFav) l = l.filter((o) => o.favorite);
    if (maxKm) l = l.filter((o) => o.km <= maxKm);
    if (sort === "recent") l = [...l].sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (sort === "km") l = [...l].sort((a, b) => a.km - b.km);
    return l;
  }, [items, kind, min, onlyMine, onlyFav, maxKm, sort]);
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[["tots", "Todas"], ["incorporacio", "Incorporación"], ["prova", "Pruebas"]].map(([k, l]) => <Chip key={k} active={kind === k} onClick={() => setKind(k)}>{l}</Chip>)}
        <span className="mx-1 h-5 w-px bg-line" />
        {[[0, "Cualquier %"], [70, "≥ 70%"], [80, "≥ 80%"]].map(([v, l]) => <Chip key={v} active={min === v} onClick={() => setMin(v as number)}>{l}</Chip>)}
        <span className="mx-1 h-5 w-px bg-line" />
        <Chip active={onlyMine} onClick={() => setOnlyMine((x) => !x)}>Mi posición</Chip>
        <Chip active={onlyFav} onClick={() => setOnlyFav((x) => !x)}><Star className="size-3.5" /> Guardadas</Chip>
        <div className="ml-auto flex items-center gap-2">
          <Select value={maxKm} onChange={(e) => setMaxKm(Number(e.target.value))} className="!h-8 !w-auto !text-[12.5px]"><option value={0}>Cualquier distancia</option>{[15, 30, 50].map((k) => <option key={k} value={k}>Fins a {k} km</option>)}</Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value)} className="!h-8 !w-auto !text-[12.5px]"><option value="match">Mejor encaje</option><option value="recent">Más recientes</option><option value="km">Más cerca</option></Select>
        </div>
      </div>
      {list.length === 0 ? <EmptyState title="Ninguna oportunidad con estos filtros" /> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((o, i) => (
            <Link key={o.id} href={`/jugador/oportunitats/${o.id}`} className="group flex flex-col rounded-2xl border border-line bg-surface p-4 shadow-card transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-pop" style={{ animation: `rise .35s ${Math.min(i, 10) * 0.03}s both` }}>
              <div className="flex items-start gap-3">
                <ClubCrest initials={o.club_initials} color={o.club_color} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate text-[12.5px] font-semibold text-muted">{o.club_name}{o.club_verified ? <ShieldCheck className="size-3.5 text-accent-ink" /> : null}</p>
                  <p className="text-[15px] font-bold leading-snug group-hover:underline">{o.title}</p>
                </div>
                <MatchRing score={o.score} size={50} stroke={5} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone="dark">{o.team_name}</Badge>
                <Badge>{o.position_label}</Badge>
                <Badge>{o.level}+</Badge>
                {o.kind === "prova" && <Badge tone="violet"><FlaskConical className="size-3" /> Prueba</Badge>}
              </div>
              <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-[12px] text-subtle">
                <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{Math.round(o.km)} km · {fmtRelative(o.created_at)}</span>
                {o.status ? <Badge tone="accent"><CheckCircle2 className="size-3" /> {APP_STATUS_LABEL[o.status as AppStatus]}</Badge> : o.favorite ? <Star className="size-4 fill-[#f5b301] text-[#f5b301]" /> : <span className="font-bold text-accent-ink">Me interesa →</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const STEPS: AppStatus[] = ["enviada", "vista", "contacte", "prova", "acceptat"];

export function ApplyPanel({ offerId, clubName, status, appliedAt, blocked, score, isTrial, trialDate }: { offerId: string; clubName: string; status: AppStatus | null; appliedAt: string | null; blocked?: boolean; score: number; isTrial: boolean; trialDate: string | null }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState(`¡Hola! Me interesa mucho ${isTrial ? "la jornada de pruebas" : "la oportunidad"}. Estoy disponible para hablar cuando os vaya bien.`);
  const { call, pending } = useApi();
  const router = useRouter();
  if (status) {
    const idx = status === "rebutjat" || status === "tancat" ? -1 : status === "en_proces" ? 3 : STEPS.indexOf(status);
    return (
      <div>
        <div className="flex items-center gap-2 rounded-xl bg-accent-soft px-3 py-2.5 text-[14px] font-bold text-accent-ink"><CheckCircle2 className="size-5" /> {APP_STATUS_LABEL[status]}</div>
        {appliedAt && <p className="mt-2 text-[12px] text-muted">Solicitud enviada {fmtRelative(appliedAt)}.</p>}
        {status === "rebutjat" ? (
          <p className="mt-3 rounded-xl bg-bg p-3 text-[13px] leading-relaxed text-muted">{clubName} ha decidit no continuar amb aquesta oportunitat. No et desanimis: hi ha més clubs que busquen perfils com el teu.</p>
        ) : (
          <ol className="mt-4 space-y-3">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-3 text-[13px]">
                <span className={cn("grid size-6 place-items-center rounded-full border-2 text-[11px] font-bold", i <= idx ? "border-accent-600 bg-accent-600 text-white" : "border-line-strong text-subtle")}>{i <= idx ? "✓" : i + 1}</span>
                <span className={cn(i <= idx ? "font-semibold text-ink" : "text-muted")}>{APP_STATUS_LABEL[s]}</span>
              </li>
            ))}
          </ol>
        )}
        {status !== "rebutjat" && status !== "tancat" && (
          <Button size="sm" variant="ghost" className="mt-4" onClick={() => router.refresh()}>
            <Clock className="size-3.5" /> Actualizar estado
          </Button>
        )}
      </div>
    );
  }
  return (
    <>
      <Button variant="primary" size="lg" className="w-full" disabled={blocked} icon={<Send className="size-4" />} onClick={() => setOpen(true)}>Me interesa</Button>
      <p className="mt-2 text-center text-[12px] text-muted">{blocked ? "Has bloqueado a este club." : `El club verá tu perfil y tu ${score}% de encaje.`}</p>
      {isTrial && trialDate && <p className="mt-1 text-center text-[12px] font-semibold text-violet">Prova: {fmtDateTime(trialDate)}</p>}
      <Modal open={open} onClose={() => setOpen(false)} title={`Enviar solicitud a ${clubName}`} subtitle="Puedes añadir un mensaje breve (opcional)." size="sm"
        footer={<><Button onClick={() => setOpen(false)}>Cancelar</Button><Button variant="primary" loading={pending} icon={<Send className="size-4" />} onClick={async () => { const d = await call(`/api/offers/${offerId}/apply`, { body: { message: msg }, ok: "Solicitud enviada", okSub: `${clubName} ya puede verla.` }); if (d) setOpen(false); }}>Enviar solicitud</Button></>}>
        <Textarea rows={4} value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={800} />
        <p className="mt-2 text-[12px] text-subtle">No incluyas tu teléfono ni redes sociales: si el club está interesado, te contactará por ScoutUp.</p>
      </Modal>
    </>
  );
}
