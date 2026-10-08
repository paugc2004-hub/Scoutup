"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GripVertical, MoreHorizontal, MessageSquare, Search } from "lucide-react";
import { Avatar, MatchRing, Dot, cn } from "@/components/ui";
import { Select } from "@/components/client/kit";
import { useToast } from "@/components/client/toast";
import { PIPELINE_STAGES, STAGE_COLOR, STAGE_LABEL } from "@/lib/domain";
import type { Stage } from "@/lib/domain";
import { fmtRelative } from "@/lib/time";

export type KanbanCard = {
  id: string; playerId: string; name: string; initials: string; hue: number; position: string; age: number; club: string;
  stage: Stage; team: string | null; teamId: string | null; offer: string | null; offerId: string | null; score: number | null; updated_at: string; unread: boolean; minor: boolean;
};

export function Kanban({ cards: initial, teams, offers }: { cards: KanbanCard[]; teams: { id: string; name: string }[]; offers: { id: string; title: string }[] }) {
  const [cards, setCards] = useState(initial);
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  const [team, setTeam] = useState("");
  const [offer, setOffer] = useState("");
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();
  useEffect(() => setCards(initial), [initial]);

  const visible = useMemo(() => cards.filter((c) => (!team || c.teamId === team) && (!offer || c.offerId === offer) && (!q || c.name.toLowerCase().includes(q.toLowerCase()))), [cards, team, offer, q]);

  const move = async (id: string, stage: Stage) => {
    const c = cards.find((x) => x.id === id);
    if (!c || c.stage === stage) return;
    const prev = c.stage;
    setCards((cs) => cs.map((x) => (x.id === id ? { ...x, stage, updated_at: new Date().toISOString() } : x)));
    const r = await fetch(`/api/pipeline/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage }) });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setCards((cs) => cs.map((x) => (x.id === id ? { ...x, stage: prev } : x)));
      toast(d.error ?? "No s'ha pogut moure.", "error");
      return;
    }
    toast(`${c.name} → ${STAGE_LABEL[stage]}`, "ok", stage === "contactat" ? "Recorda enviar la sol·licitud de contacte des del perfil." : undefined);
    router.refresh();
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar per nom" className="h-9 w-52 rounded-xl border border-line bg-surface pl-9 pr-3 text-[13px] focus:border-accent-600 focus:outline-none" />
        </div>
        {teams.length > 1 && (
          <Select value={team} onChange={(e) => setTeam(e.target.value)} className="!h-9 !w-auto !text-[13px]">
            <option value="">Tots els equips</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        )}
        <Select value={offer} onChange={(e) => setOffer(e.target.value)} className="!h-9 !w-auto !text-[13px]">
          <option value="">Totes les oportunitats</option>
          {offers.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
        </Select>
        <p className="ml-auto text-[12.5px] text-muted">Arrossega les targetes entre columnes o fes servir el menú <MoreHorizontal className="inline size-3.5" /></p>
      </div>
      <div className="scroll-thin -mx-4 overflow-x-auto px-4 pb-4 md:-mx-8 md:px-8">
        <div className="flex min-w-max gap-3">
          {PIPELINE_STAGES.map((s) => {
            const col = visible.filter((c) => c.stage === s);
            return (
              <div
                key={s}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(s);
                }}
                onDragLeave={() => setOver((o) => (o === s ? null : o))}
                onDrop={(e) => {
                  e.preventDefault();
                  setOver(null);
                  if (drag) move(drag, s);
                  setDrag(null);
                }}
                className={cn("flex w-[260px] shrink-0 flex-col rounded-2xl border bg-sunken/70 p-2 transition", over === s ? "border-accent-600 bg-accent-soft/60" : "border-transparent")}
              >
                <div className="flex items-center justify-between px-2 pb-2 pt-1">
                  <p className="flex items-center gap-2 text-[13px] font-bold"><Dot color={STAGE_COLOR[s]} className="size-2.5" />{STAGE_LABEL[s]}</p>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-[11.5px] font-bold tabular text-muted">{col.length}</span>
                </div>
                <div className="flex min-h-24 flex-col gap-2">
                  {col.map((c) => (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={() => setDrag(c.id)}
                      onDragEnd={() => setDrag(null)}
                      className={cn("group relative cursor-grab rounded-xl border border-line bg-surface p-3 shadow-card transition hover:border-line-strong active:cursor-grabbing", drag === c.id && "opacity-50")}
                    >
                      <div className="flex items-start gap-2.5">
                        <Avatar initials={c.initials} hue={c.hue} size={34} />
                        <div className="min-w-0 flex-1">
                          <Link href={`/club/jugadors/${c.playerId}${c.offerId ? `?offer=${c.offerId}` : ""}`} className="block truncate text-[13.5px] font-bold hover:underline">{c.name}</Link>
                          <p className="truncate text-[11.5px] text-muted">{c.position} · {c.age} anys{c.minor ? " · menor" : ""}</p>
                          <p className="truncate text-[11.5px] text-muted">{c.club}</p>
                        </div>
                        {c.score !== null && <MatchRing score={c.score} size={32} stroke={3.5} />}
                      </div>
                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <span className="truncate rounded-md bg-sunken px-1.5 py-0.5 text-[10.5px] font-semibold text-ink-2">{c.team ?? "Sense equip"}</span>
                        <div className="flex items-center gap-1">
                          {c.unread && <MessageSquare className="size-3.5 text-accent-ink" />}
                          <span className="text-[10.5px] text-subtle">{fmtRelative(c.updated_at)}</span>
                          <button onClick={() => setMenu(menu === c.id ? null : c.id)} className="grid size-6 place-items-center rounded-md text-subtle hover:bg-sunken hover:text-ink" aria-label="Moure a una altra etapa">
                            <MoreHorizontal className="size-4" />
                          </button>
                        </div>
                      </div>
                      {c.offer && <p className="mt-1.5 truncate text-[10.5px] text-subtle">↳ {c.offer}</p>}
                      <GripVertical className="absolute right-1 top-1/2 hidden size-3.5 -translate-y-1/2 text-line-strong group-hover:block" />
                      {menu === c.id && (
                        <div className="absolute right-2 top-full z-30 mt-1 w-48 rounded-xl border border-line bg-surface p-1 shadow-pop animate-pop">
                          {PIPELINE_STAGES.map((st) => (
                            <button key={st} disabled={st === c.stage} onClick={() => { setMenu(null); move(c.id, st); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] font-medium hover:bg-sunken disabled:opacity-40">
                              <Dot color={STAGE_COLOR[st]} /> {STAGE_LABEL[st]}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {col.length === 0 && <div className="grid h-20 place-items-center rounded-xl border border-dashed border-line-strong text-[11.5px] text-subtle">Deixa-hi una targeta</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
