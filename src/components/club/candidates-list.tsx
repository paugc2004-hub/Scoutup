"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { KanbanSquare, Check, SlidersHorizontal, MapPin, Inbox } from "lucide-react";
import { Avatar, AvailabilityBadge, Badge, EmptyState, MatchRing, StageBadge, VerificationBadge, matchColor, cn } from "@/components/ui";
import { Chip, Select, useApi, Button } from "@/components/client/kit";
import { CompareToggle } from "@/components/club/compare-tray";
import { FOOT_LABEL } from "@/lib/domain";
import type { Stage } from "@/lib/domain";

import type { CandidateLite } from "@/components/club/candidate-lite";
export type { CandidateLite };

export function FactorStrip({ factors }: { factors: CandidateLite["factors"] }) {
  return (
    <div className="flex gap-0.5" aria-label="Desglossament per factors">
      {factors.map((f) => {
        const pct = (f.score / f.weight) * 100;
        return <span key={f.key} title={`${f.label}: ${Math.round(f.score * 10) / 10}/${f.weight} — ${f.detail}`} className="h-1.5 rounded-full" style={{ width: f.weight * 1.6, background: matchColor(pct), opacity: 0.35 + (pct / 100) * 0.65 }} />;
      })}
    </div>
  );
}

export function CandidatesList({ items, offerId, teamId, emptyText }: { items: CandidateLite[]; offerId?: string; teamId?: string | null; emptyText?: string }) {
  const [foot, setFoot] = useState<string>("tots");
  const [min, setMin] = useState(60);
  const [onlyNew, setOnlyNew] = useState(false);
  const [onlyApplied, setOnlyApplied] = useState(false);
  const [sort, setSort] = useState("match");
  const { call, pending } = useApi();
  const [busyId, setBusyId] = useState<string | null>(null);

  const list = useMemo(() => {
    let l = items.filter((c) => c.score >= min);
    if (foot !== "tots") l = l.filter((c) => c.foot === foot || c.foot === "ambdues");
    if (onlyNew) l = l.filter((c) => !c.stage);
    if (onlyApplied) l = l.filter((c) => c.applied);
    if (sort === "distancia") l = [...l].sort((a, b) => a.km - b.km);
    else if (sort === "edat") l = [...l].sort((a, b) => a.age - b.age);
    else if (sort === "minuts") l = [...l].sort((a, b) => (b.minutes ?? 0) - (a.minutes ?? 0));
    return l;
  }, [items, foot, min, onlyNew, onlyApplied, sort]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted"><SlidersHorizontal className="size-4" /> Filtres</span>
        {[["tots", "Qualsevol peu"], ["esquerre", "Peu esquerre"], ["dret", "Peu dret"]].map(([k, l]) => <Chip key={k} active={foot === k} onClick={() => setFoot(k)}>{l}</Chip>)}
        <span className="mx-1 h-5 w-px bg-line" />
        {[50, 60, 70, 80].map((v) => <Chip key={v} active={min === v} onClick={() => setMin(v)}>≥ {v}%</Chip>)}
        <span className="mx-1 h-5 w-px bg-line" />
        <Chip active={onlyNew} onClick={() => setOnlyNew((x) => !x)}>No al pipeline</Chip>
        <Chip active={onlyApplied} onClick={() => setOnlyApplied((x) => !x)}>Només inscrits</Chip>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[12.5px] text-muted">Ordenar</span>
          <Select value={sort} onChange={(e) => setSort(e.target.value)} className="!h-8 !w-auto !text-[12.5px]">
            <option value="match">Compatibilitat</option>
            <option value="distancia">Distància</option>
            <option value="edat">Edat (més jove)</option>
            <option value="minuts">Minuts jugats</option>
          </Select>
        </div>
      </div>
      <p className="mb-2 text-[12.5px] text-muted"><strong className="text-ink">{list.length}</strong> {list.length === 1 ? "perfil" : "perfils"} · només es mostren jugadors la privacitat dels quals permet que el teu club els vegi</p>
      {list.length === 0 ? (
        <EmptyState icon={<Inbox className="size-5" />} title="Cap perfil amb aquests filtres" text={emptyText ?? "Prova de rebaixar el percentatge mínim o de treure algun filtre."} />
      ) : (
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {list.map((c, i) => (
            <div key={c.id} className="group flex flex-col gap-3 p-3.5 transition hover:bg-[#fbfbf9] md:flex-row md:items-center" style={{ animation: `rise .35s ${Math.min(i, 10) * 0.03}s both` }}>
              <Link href={`/club/jugadors/${c.id}${offerId ? `?offer=${offerId}` : ""}`} className="flex min-w-0 flex-1 items-center gap-3">
                <span className="w-5 shrink-0 text-right text-[12px] font-bold tabular text-subtle">{i + 1}</span>
                <Avatar initials={c.initials} hue={c.hue} size={42} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-[14px] font-bold group-hover:underline">{c.name}</p>
                    <VerificationBadge status={c.verification} compact />
                    {c.applied && <Badge tone="accent">Inscrit</Badge>}
                    {c.minor && <Badge tone="violet">Menor</Badge>}
                  </div>
                  <p className="truncate text-[12.5px] text-muted">{c.position_label} · {c.age} anys · {c.club_name}{c.team_name ? ` ${c.team_name}` : ""} · {c.level_label}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-[12px] text-subtle">
                    <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{c.location}{c.km ? ` · ${Math.round(c.km)} km` : ""}</span>
                    <span>Peu {FOOT_LABEL[c.foot]?.toLowerCase()}</span>
                    {c.height && <span>{c.height} cm</span>}
                  </p>
                </div>
              </Link>
              <div className="flex items-center gap-3 pl-8 md:pl-0">
                <div className="hidden w-[150px] lg:block">
                  <FactorStrip factors={c.factors} />
                  <div className="mt-1.5"><AvailabilityBadge value={c.availability} /></div>
                </div>
                <MatchRing score={c.score} size={46} stroke={4.5} />
                <div className="flex items-center gap-1.5">
                  <CompareToggle id={c.id} name={c.name} initials={c.initials} compact />
                  {c.stage ? (
                    <StageBadge stage={c.stage} />
                  ) : (
                    <Button
                      size="sm"
                      loading={pending && busyId === c.id}
                      icon={<KanbanSquare className="size-3.5" />}
                      onClick={async () => {
                        setBusyId(c.id);
                        await call("/api/pipeline", { body: { playerId: c.id, offerId: offerId ?? null, teamId: teamId ?? null }, ok: `${c.name} afegit al pipeline` });
                        setBusyId(null);
                      }}
                    >
                      Pipeline
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ApplicationActions({ id, status }: { id: string; status: string }) {
  const { call, pending } = useApi();
  if (status === "rebutjat") return <Badge tone="danger">Rebutjada</Badge>;
  return (
    <div className="flex items-center gap-1.5">
      <Button size="sm" variant="dark" loading={pending} icon={<Check className="size-3.5" />} onClick={() => call(`/api/applications/${id}`, { body: { action: "shortlist" }, ok: "Afegit al pipeline", okSub: "Etapa: Revisar · el jugador veu que el club ha vist el perfil" })}>
        Preseleccionar
      </Button>
      <Button size="sm" variant="ghost" loading={pending} onClick={() => call(`/api/applications/${id}`, { body: { action: "reject" }, ok: "Sol·licitud rebutjada", okSub: "S'ha notificat el jugador amb un missatge respectuós." })}>
        Rebutjar
      </Button>
    </div>
  );
}

export function OfferStatusControl({ id, status }: { id: string; status: string }) {
  const { call, pending } = useApi();
  return (
    <div className="flex items-center gap-2">
      {status !== "oberta" && <Button size="sm" loading={pending} onClick={() => call(`/api/offers/${id}`, { method: "PATCH", body: { status: "oberta" }, ok: "Oportunitat reoberta" })}>Reobrir</Button>}
      {status === "oberta" && <Button size="sm" loading={pending} onClick={() => call(`/api/offers/${id}`, { method: "PATCH", body: { status: "pausada" }, ok: "Oportunitat pausada", okSub: "Deixa de ser visible per als jugadors." })}>Pausar</Button>}
      {status !== "tancada" && <Button size="sm" variant="danger" loading={pending} onClick={() => call(`/api/offers/${id}`, { method: "PATCH", body: { status: "tancada" }, ok: "Oportunitat tancada" })}>Tancar</Button>}
    </div>
  );
}


export function QuickPipeline({ playerId, name, offerId, teamId }: { playerId: string; name: string; offerId?: string | null; teamId?: string | null }) {
  const { call, pending } = useApi();
  return (
    <Button size="sm" loading={pending} icon={<KanbanSquare className="size-3.5" />} onClick={() => call("/api/pipeline", { body: { playerId, offerId: offerId ?? null, teamId: teamId ?? null }, ok: `${name} afegit al pipeline` })}>
      Pipeline
    </Button>
  );
}
