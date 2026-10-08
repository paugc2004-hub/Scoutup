"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, MapPin, Trash2, CalendarDays, List } from "lucide-react";
import { Button, Chip, Field, Input, Modal, Select, Textarea, useApi } from "@/components/client/kit";
import { cn } from "@/components/ui";
import { EVENT_KIND_COLOR, EVENT_KIND_LABEL } from "@/lib/domain";
import type { EventKind } from "@/lib/domain";
import { dayKey, fmtDate, fmtTime, monthName } from "@/lib/time";

export type CalEvent = { id: string; kind: string; title: string; starts_at: string; ends_at: string | null; location: string | null; notes: string | null; team: string | null; related: string | null; relatedId: string | null; canDelete: boolean };

export function CalendarView({ events, month, basePath, canCreate, teams, players, kinds, todayKey }: { events: CalEvent[]; month: string; basePath: string; canCreate: boolean; teams?: { id: string; name: string }[]; players?: { id: string; name: string }[]; kinds: EventKind[]; todayKey: string }) {
  const [filter, setFilter] = useState<Set<string>>(new Set(kinds));
  const [view, setView] = useState<"mes" | "agenda">("mes");
  const [sel, setSel] = useState<CalEvent | null>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const router = useRouter();
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const startDow = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells = Array.from({ length: Math.ceil((startDow + daysInMonth) / 7) * 7 }, (_, i) => {
    const d = i - startDow + 1;
    return d >= 1 && d <= daysInMonth ? `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` : null;
  });
  const shown = useMemo(() => events.filter((e) => filter.has(e.kind)), [events, filter]);
  const byDay = useMemo(() => {
    const mp = new Map<string, CalEvent[]>();
    for (const e of shown) {
      const k = dayKey(e.starts_at);
      mp.set(k, [...(mp.get(k) ?? []), e]);
    }
    return mp;
  }, [shown]);
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const upcoming = shown.filter((e) => dayKey(e.starts_at) >= todayKey);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button onClick={() => router.push(`${basePath}?m=${prev}`)} className="grid size-9 place-items-center rounded-xl border border-line bg-surface hover:bg-sunken" aria-label="Mes anterior"><ChevronLeft className="size-4" /></button>
          <button onClick={() => router.push(`${basePath}?m=${next}`)} className="grid size-9 place-items-center rounded-xl border border-line bg-surface hover:bg-sunken" aria-label="Mes siguiente"><ChevronRight className="size-4" /></button>
        </div>
        <p className="min-w-44 text-[18px] font-extrabold capitalize tracking-tight">{monthName(m)} {y}</p>
        <Link href={basePath} className="rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-muted hover:bg-sunken hover:text-ink">Hoy</Link>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-xl border border-line bg-surface p-0.5">
            <button onClick={() => setView("mes")} className={cn("flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-semibold", view === "mes" ? "bg-ink text-white" : "text-muted")}><CalendarDays className="size-3.5" /> Mes</button>
            <button onClick={() => setView("agenda")} className={cn("flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-semibold", view === "agenda" ? "bg-ink text-white" : "text-muted")}><List className="size-3.5" /> Agenda</button>
          </div>
          {canCreate && <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(todayKey)}>Nuevo evento</Button>}
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {kinds.map((k) => (
          <Chip key={k} active={filter.has(k)} onClick={() => setFilter((f) => { const n = new Set(f); if (n.has(k)) n.delete(k); else n.add(k); return n; })}>
            <span className="size-2 rounded-full" style={{ background: EVENT_KIND_COLOR[k] }} /> {EVENT_KIND_LABEL[k]}
          </Chip>
        ))}
      </div>

      {view === "mes" ? (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
          <div className="grid grid-cols-7 border-b border-line bg-bg text-center text-[11.5px] font-bold uppercase tracking-wider text-subtle">
            {["Dl", "Dt", "Dc", "Dj", "Dv", "Ds", "Dg"].map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((k, i) => {
              const evs = k ? byDay.get(k) ?? [] : [];
              return (
                <div key={i} onDoubleClick={() => k && canCreate && setCreating(k)} className={cn("min-h-[92px] border-b border-r border-line p-1.5 md:min-h-[118px]", !k && "bg-bg/60", (i + 1) % 7 === 0 && "border-r-0")}>
                  {k && (
                    <>
                      <div className="mb-1 flex items-center justify-between">
                        <span className={cn("grid size-6 place-items-center rounded-full text-[12px] font-bold tabular", k === todayKey ? "bg-accent text-night" : "text-ink-2")}>{Number(k.slice(8))}</span>
                        {canCreate && <button onClick={() => setCreating(k)} className="hidden size-5 place-items-center rounded text-subtle hover:bg-sunken md:grid" aria-label="Añadir"><Plus className="size-3" /></button>}
                      </div>
                      <div className="space-y-0.5">
                        {evs.slice(0, 3).map((e) => (
                          <button key={e.id} onClick={() => setSel(e)} className="flex w-full items-center gap-1 truncate rounded-md px-1 py-0.5 text-left text-[10.5px] font-semibold hover:bg-sunken md:text-[11px]" title={e.title}>
                            <span className="size-1.5 shrink-0 rounded-full" style={{ background: EVENT_KIND_COLOR[e.kind as EventKind] }} />
                            <span className="hidden tabular text-subtle md:inline">{fmtTime(e.starts_at)}</span>
                            <span className="truncate">{e.title}</span>
                          </button>
                        ))}
                        {evs.length > 3 && <button onClick={() => { setView("agenda"); }} className="px-1 text-[10.5px] font-semibold text-muted hover:underline">+{evs.length - 3} més</button>}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {upcoming.length === 0 && <p className="rounded-2xl border border-dashed border-line-strong p-10 text-center text-[13px] text-muted">No hay eventos próximos este mes.</p>}
          {upcoming.map((e) => (
            <button key={e.id} onClick={() => setSel(e)} className="flex w-full items-center gap-4 rounded-2xl border border-line bg-surface p-3.5 text-left shadow-card transition hover:border-line-strong">
              <div className="w-14 shrink-0 text-center"><p className="text-[11px] font-bold uppercase text-subtle">{fmtDate(e.starts_at, { short: true }).split(" ")[1]}</p><p className="text-[20px] font-extrabold leading-none tabular">{fmtDate(e.starts_at, { short: true }).split(" ")[0]}</p></div>
              <span className="h-10 w-1 rounded-full" style={{ background: EVENT_KIND_COLOR[e.kind as EventKind] }} />
              <div className="min-w-0 flex-1"><p className="truncate text-[14px] font-semibold">{e.title}</p><p className="truncate text-[12.5px] text-muted">{EVENT_KIND_LABEL[e.kind as EventKind]} · {fmtTime(e.starts_at)}{e.ends_at ? `–${fmtTime(e.ends_at)}` : ""}{e.location ? ` · ${e.location}` : ""}{e.team ? ` · ${e.team}` : ""}</p></div>
            </button>
          ))}
        </div>
      )}

      <EventModal ev={sel} onClose={() => setSel(null)} />
      {creating && <CreateEventModal day={creating} onClose={() => setCreating(null)} teams={teams} players={players} kinds={kinds} />}
    </div>
  );
}

function EventModal({ ev, onClose }: { ev: CalEvent | null; onClose: () => void }) {
  const { call, pending } = useApi();
  if (!ev) return null;
  return (
    <Modal open onClose={onClose} title={ev.title} subtitle={`${EVENT_KIND_LABEL[ev.kind as EventKind]} · ${fmtDate(ev.starts_at, { weekday: true })}`} size="sm"
      footer={ev.canDelete ? <Button variant="danger" size="sm" loading={pending} icon={<Trash2 className="size-3.5" />} onClick={async () => { const d = await call(`/api/events/${ev.id}`, { method: "DELETE", ok: "Evento eliminado" }); if (d) onClose(); }}>Eliminar</Button> : undefined}>
      <div className="space-y-3 text-[13.5px]">
        <p className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: EVENT_KIND_COLOR[ev.kind as EventKind] }} /> {fmtTime(ev.starts_at)}{ev.ends_at ? ` – ${fmtTime(ev.ends_at)}` : ""}</p>
        {ev.location && <p className="flex items-center gap-2 text-muted"><MapPin className="size-4" /> {ev.location}</p>}
        {ev.team && <p className="text-muted">Equipo: <span className="font-semibold text-ink">{ev.team}</span></p>}
        {ev.related && ev.relatedId && <p className="text-muted">Jugador: <Link href={`/club/jugadors/${ev.relatedId}`} className="font-semibold text-accent-ink hover:underline">{ev.related}</Link></p>}
        {ev.notes && <p className="rounded-xl bg-bg p-3 leading-relaxed text-ink-2">{ev.notes}</p>}
      </div>
    </Modal>
  );
}

function CreateEventModal({ day, onClose, teams, players, kinds }: { day: string; onClose: () => void; teams?: { id: string; name: string }[]; players?: { id: string; name: string }[]; kinds: EventKind[] }) {
  const [f, setF] = useState({ kind: kinds.includes("prova") ? "prova" : kinds[0], title: "", date: day, time: "18:00", duration: 60, team_id: teams?.[0]?.id ?? "", related_player_id: "", location: "", notes: "" });
  const { call, pending } = useApi();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: k === "duration" ? Number(e.target.value) : e.target.value }));
  const title = f.title || `${EVENT_KIND_LABEL[f.kind as EventKind]}${f.related_player_id ? `: ${players?.find((p) => p.id === f.related_player_id)?.name}` : ""}`;
  return (
    <Modal open onClose={onClose} title="Nuevo evento" size="md"
      footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="dark" loading={pending} onClick={async () => {
        const d = await call("/api/events", { body: { kind: f.kind, title, starts_at: new Date(`${f.date}T${f.time}:00`).toISOString(), duration: f.duration, team_id: f.team_id || null, related_player_id: f.related_player_id || null, location: f.location || null, notes: f.notes || null }, ok: "Evento creado", okSub: f.related_player_id && ["prova", "trucada", "reunio"].includes(f.kind) ? "También se ha añadido al calendario del jugador." : undefined });
        if (d) onClose();
      }}>Crear</Button></>}>
      <div className="space-y-4">
        <Field label="Tipo"><div className="flex flex-wrap gap-2">{kinds.map((k) => <Chip key={k} active={f.kind === k} onClick={() => setF((x) => ({ ...x, kind: k }))}><span className="size-2 rounded-full" style={{ background: EVENT_KIND_COLOR[k] }} />{EVENT_KIND_LABEL[k]}</Chip>)}</div></Field>
        <Field label="Título"><Input value={f.title} onChange={set("title")} placeholder={title} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Día"><Input type="date" value={f.date} onChange={set("date")} /></Field>
          <Field label="Hora"><Input type="time" value={f.time} onChange={set("time")} /></Field>
          <Field label="Duración"><Select value={f.duration} onChange={set("duration")}>{[15, 30, 45, 60, 90, 120].map((d) => <option key={d} value={d}>{d} min</option>)}</Select></Field>
        </div>
        {teams && teams.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Equipo"><Select value={f.team_id} onChange={set("team_id")}><option value="">Todo el club</option>{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
            {players && <Field label="Jugador relacionado"><Select value={f.related_player_id} onChange={set("related_player_id")}><option value="">Ninguno</option>{players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>}
          </div>
        )}
        <Field label="Lugar"><Input value={f.location} onChange={set("location")} placeholder="Campo, dirección o videollamada" /></Field>
        <Field label="Notas"><Textarea rows={3} value={f.notes} onChange={set("notes")} /></Field>
      </div>
    </Modal>
  );
}
