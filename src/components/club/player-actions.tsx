"use client";
import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Star, KanbanSquare, Send, MessageSquare, Clock3, Trash2, Lock, FlaskConical, ChevronDown, NotebookPen, Plus } from "lucide-react";
import { ActionButton, Button, Field, Input, Modal, Select, Textarea, Tabs, useApi, Chip } from "@/components/client/kit";
import { btnClass, cn, Dot } from "@/components/ui";
import { CONTACT_REASONS, PIPELINE_STAGES, STAGE_COLOR, STAGE_LABEL, EVAL_AREAS, EVAL_DECISIONS } from "@/lib/domain";
import type { Stage } from "@/lib/domain";
import { fmtRelative } from "@/lib/time";

export function FavoriteButton({ type, id, initial, label = true, size = "md" }: { type: "player" | "offer" | "club"; id: string; initial: boolean; label?: boolean; size?: "sm" | "md" }) {
  const [on, setOn] = useState(initial);
  const { call, pending } = useApi();
  return (
    <Button
      size={size}
      loading={pending}
      onClick={async () => {
        const d = await call<{ favorite: boolean }>("/api/favorites", { body: { type, id }, refresh: false });
        if (d) setOn(d.favorite);
      }}
      icon={<Star className={cn("size-4", on && "fill-[#f5b301] text-[#f5b301]")} />}
      aria-pressed={on}
      title={on ? "Treure de guardats" : "Guardar"}
      aria-label={on ? "Treure de guardats" : "Guardar"}
    >
      {label && (on ? "Guardado" : "Guardar")}
    </Button>
  );
}

export function PipelineControl({ playerId, entry, teams, offerId, canTeamSelect, defaultTeam }: { playerId: string; entry: { id: string; stage: Stage; team_name: string | null } | null; teams: { id: string; name: string }[]; offerId?: string | null; canTeamSelect: boolean; defaultTeam?: string | null }) {
  const { call, pending } = useApi();
  const [team, setTeam] = useState(defaultTeam ?? teams[0]?.id ?? "");
  const [open, setOpen] = useState(false);
  if (!entry) {
    return (
      <div className="flex items-center gap-2">
        {canTeamSelect && teams.length > 1 && (
          <Select value={team} onChange={(e) => setTeam(e.target.value)} className="!h-10 !w-auto">
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        )}
        <Button variant="dark" loading={pending} icon={<KanbanSquare className="size-4" />} onClick={() => call("/api/pipeline", { body: { playerId, teamId: team || null, offerId: offerId ?? null }, ok: "Añadido al pipeline", okSub: "Etapa: Nuevo" })}>
          Añadir al pipeline
        </Button>
      </div>
    );
  }
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className={cn(btnClass("secondary", "md"), "pr-3")}>
        <Dot color={STAGE_COLOR[entry.stage]} /> {STAGE_LABEL[entry.stage]}
        <ChevronDown className="size-4 text-subtle" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-30 w-56 rounded-2xl border border-line bg-surface p-1.5 shadow-pop animate-pop">
          <p className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-subtle">Mover a…</p>
          {PIPELINE_STAGES.map((s) => (
            <button
              key={s}
              disabled={s === entry.stage || pending}
              onClick={async () => {
                setOpen(false);
                await call(`/api/pipeline/${entry.id}`, { method: "PATCH", body: { stage: s }, ok: `Movido a «${STAGE_LABEL[s]}»` });
              }}
              className={cn("flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium hover:bg-sunken disabled:opacity-40", s === entry.stage && "bg-sunken")}
            >
              <Dot color={STAGE_COLOR[s]} /> {STAGE_LABEL[s]}
            </button>
          ))}
          <div className="my-1 h-px bg-line" />
          <button onClick={async () => { setOpen(false); await call(`/api/pipeline/${entry.id}`, { method: "DELETE", ok: "Retirado del pipeline" }); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-danger hover:bg-danger-soft">
            <Trash2 className="size-4" /> Quitar del pipeline
          </button>
        </div>
      )}
    </div>
  );
}

export type ContactState =
  | { kind: "can"; needsGuardian: boolean }
  | { kind: "blocked"; reason: string }
  | { kind: "pending"; requestId: string; status: string; created_at: string; minor: boolean }
  | { kind: "conversation"; conversationId: string };

export function ContactControl({ playerId, firstName, state, clubName, offerTitle, teams, defaultTeam }: { playerId: string; firstName: string; state: ContactState; clubName: string; offerTitle?: string | null; teams: { id: string; name: string }[]; defaultTeam?: string | null }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(offerTitle ? "oferta" : "seguiment");
  const [team, setTeam] = useState(defaultTeam ?? teams[0]?.id ?? "");
  const [msg, setMsg] = useState(`Hola ${firstName}, te escribimos desde el ${clubName}.${offerTitle ? ` Hem vist el teu perfil i creiem que encaixes molt bé amb la nostra oportunitat «${offerTitle}».` : " Hemos visto tu perfil y nos gustaría conocerte."} ¿Te gustaría que habláramos?`);
  const { call, pending } = useApi();
  const router = useRouter();

  if (state.kind === "conversation") {
    return <Link href={`/club/missatges/${state.conversationId}`} className={btnClass("primary", "md")}><MessageSquare className="size-4" /> Abrir conversación</Link>;
  }
  if (state.kind === "blocked") {
    return (
      <span title={state.reason} className={cn(btnClass("secondary", "md"), "cursor-not-allowed opacity-60")}>
        <Lock className="size-4" /> Contacto no disponible
      </span>
    );
  }
  if (state.kind === "pending") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn(btnClass("secondary", "md"), "cursor-default")}>
          <Clock3 className="size-4 text-warn" /> {state.status === "pendent_tutor" ? "Pendiente del tutor legal" : "Solicitud pendiente"}
        </span>
        {!state.minor && state.status === "pendent" && (
          <ActionButton
            url="/api/demo/simulate-accept"
            body={{ requestId: state.requestId }}
            ok="El jugador ha aceptado la solicitud"
            okSub="Se ha abierto la conversación (simulación de demo)"
            icon={<FlaskConical className="size-4" />}
            variant="ghost"
            onDone={(d) => d.conversationId && router.push(`/club/missatges/${d.conversationId}`)}
          >
            Simular respuesta del jugador
          </ActionButton>
        )}
        <ActionButton url={`/api/contacts/${state.requestId}`} body={{ action: "cancel" }} ok="Solicitud cancelada" variant="ghost" size="sm" confirm="¿Quieres cancelar la solicitud de contacto?">
          Cancelar
        </ActionButton>
      </div>
    );
  }
  return (
    <>
      <Button variant="primary" icon={<Send className="size-4" />} onClick={() => setOpen(true)}>Contactar</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Contactar ${firstName}`}
        subtitle="El jugador recibe una solicitud y decide si la acepta. Hasta entonces no se abre ninguna conversación."
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              variant="dark"
              loading={pending}
              icon={<Send className="size-4" />}
              onClick={async () => {
                const d = await call<{ status: string }>("/api/contacts", { body: { playerId, reason, message: msg, teamId: team || null }, ok: state.needsGuardian ? "Solicitud enviada al tutor legal" : "Solicitud de contacto enviada", okSub: state.needsGuardian ? "El club no podrá escribir hasta que el tutor lo autorice." : "Etapa del pipeline: Contactado" });
                if (d) setOpen(false);
              }}
            >
              Enviar solicitud
            </Button>
          </>
        }
      >
        {state.needsGuardian && (
          <div className="mb-4 flex gap-3 rounded-xl border border-[#ddd6fe] bg-violet-soft p-3 text-[12.5px] leading-relaxed text-ink-2">
            <Lock className="mt-0.5 size-4 shrink-0 text-violet" />
            <span><strong>{firstName} es menor de edad.</strong> La solicitud llegará primero a su tutor legal, que tendrá que autorizar el contacto.</span>
          </div>
        )}
        <div className="space-y-4">
          <Field label="Motivo">
            <div className="flex flex-wrap gap-2">
              {CONTACT_REASONS.map((r) => <Chip key={r.key} active={reason === r.key} onClick={() => setReason(r.key)}>{r.label}</Chip>)}
            </div>
          </Field>
          {teams.length > 1 && (
            <Field label="Equipo interesado">
              <Select value={team} onChange={(e) => setTeam(e.target.value)}>{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>
            </Field>
          )}
          <Field label="Mensaje" hint="Evita pedir teléfonos o redes sociales: la comunicación se hace dentro de ScoutUp.">
            <Textarea rows={5} value={msg} onChange={(e) => setMsg(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </>
  );
}

export function OfferSelector({ offers, value }: { offers: { id: string; title: string; score: number }[]; value: string | null }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  return (
    <Select
      value={value ?? ""}
      onChange={(e) => {
        const p = new URLSearchParams(sp.toString());
        if (e.target.value) p.set("offer", e.target.value);
        else p.delete("offer");
        router.replace(`${path}?${p.toString()}`, { scroll: false });
      }}
      className="!h-9 !text-[13px]"
    >
      {offers.map((o) => <option key={o.id} value={o.id}>{o.title} · {o.score}%</option>)}
    </Select>
  );
}

export function ClientTabs({ tabs, initial }: { tabs: { key: string; label: string; count?: number; content: ReactNode }[]; initial?: string }) {
  const [t, setT] = useState(initial ?? tabs[0].key);
  return (
    <div>
      <Tabs tabs={tabs.map(({ key, label, count }) => ({ key, label, count }))} value={t} onChange={setT} />
      <div className="mt-4 animate-fade-in" key={t}>{tabs.find((x) => x.key === t)?.content}</div>
    </div>
  );
}

export function EvaluationForm({ playerId, initial }: { playerId: string; initial: { scores: Record<string, Record<string, number>>; decision: string; comment: string; context?: string | null } | null }) {
  const base = Object.fromEntries(EVAL_AREAS.map((a) => [a.key, Object.fromEntries(a.criteria.map((c) => [c.key, initial?.scores?.[a.key]?.[c.key] ?? 6]))]));
  const [scores, setScores] = useState<Record<string, Record<string, number>>>(base);
  const [decision, setDecision] = useState(initial?.decision ?? "seguir");
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [context, setContext] = useState(initial?.context ?? "");
  const { call, pending } = useApi();
  const avg = (k: string) => {
    const v = Object.values(scores[k]);
    return Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10;
  };
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {EVAL_AREAS.map((a) => (
          <div key={a.key} className="rounded-2xl border border-line p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[14px] font-bold">{a.label}</p>
              <span className="rounded-lg bg-sunken px-2 py-0.5 text-[13px] font-extrabold tabular">{avg(a.key)}</span>
            </div>
            <div className="space-y-3">
              {a.criteria.map((cr) => (
                <label key={cr.key} className="block">
                  <span className="mb-1 flex justify-between text-[12.5px] text-muted"><span>{cr.label}</span><span className="font-bold tabular text-ink">{scores[a.key][cr.key]}</span></span>
                  <input type="range" min={1} max={10} value={scores[a.key][cr.key]} onChange={(e) => setScores((s) => ({ ...s, [a.key]: { ...s[a.key], [cr.key]: Number(e.target.value) } }))} className="w-full accent-[#00c768]" />
                </label>
              ))}
            </div>
          </div>
        ))}
        <div className="rounded-2xl border border-line p-4">
          <p className="mb-3 text-[14px] font-bold">Decisión</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(EVAL_DECISIONS).map(([k, l]) => <Chip key={k} active={decision === k} onClick={() => setDecision(k)}>{l}</Chip>)}
          </div>
          <label className="mt-3 block">
            <span className="mb-1 block text-[12.5px] font-semibold text-ink-2">Contexto</span>
            <Input list="eval-contexts" maxLength={120} value={context} onChange={(e) => setContext(e.target.value)} placeholder="P. ej. Partido de liga vs UE Serralada" />
            <datalist id="eval-contexts"><option value="Partido de liga" /><option value="Sesión de entrenamiento" /><option value="Prueba en el club" /><option value="Vídeo del partido" /><option value="Torneo" /></datalist>
          </label>
          <label className="mt-3 block">
            <span className="mb-1 block text-[12.5px] font-semibold text-ink-2">Observaciones</span>
            <Textarea rows={4} maxLength={1500} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Solo visible para el club" />
          </label>
        </div>
      </div>
      <div className="flex justify-end">
        <Button variant="dark" loading={pending} onClick={() => call("/api/evaluations", { body: { playerId, scores, decision, comment, context: context.trim() || null }, ok: initial ? "Evaluación actualizada" : "Evaluación guardada" })}>
          {initial ? "Actualizar mi evaluación" : "Guardar evaluación"}
        </Button>
      </div>
    </div>
  );
}

export function NotesPanel({ playerId, notes, meId, isDirector }: { playerId: string; notes: { id: string; body: string; created_at: string; author_name: string; author_user_id: string }[]; meId: string; isDirector: boolean }) {
  const [text, setText] = useState("");
  const { call, pending } = useApi();
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 rounded-xl border border-line bg-bg px-3 py-2 text-[12.5px] text-muted">
        <Lock className="size-3.5" /> Las notas son privadas del club. El jugador nunca las ve.
      </div>
      <div className="flex gap-2">
        <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe una nota privada…" className="!min-h-0" />
        <Button variant="dark" loading={pending} disabled={!text.trim()} className="self-end" icon={<NotebookPen className="size-4" />} onClick={async () => { const d = await call("/api/notes", { body: { playerId, body: text }, ok: "Nota añadida" }); if (d) setText(""); }}>
          Añadir
        </Button>
      </div>
      <div className="mt-4 space-y-2.5">
        {notes.length === 0 && <p className="py-6 text-center text-[13px] text-subtle">Todavía no hay notas.</p>}
        {notes.map((n) => (
          <div key={n.id} className="group rounded-xl border border-line bg-[#fffdf5] p-3">
            <p className="whitespace-pre-line text-[13.5px] leading-relaxed">{n.body}</p>
            <div className="mt-1.5 flex items-center justify-between text-[11.5px] text-subtle">
              <span>{n.author_name} · {fmtRelative(n.created_at)}</span>
              {(n.author_user_id === meId || isDirector) && (
                <button onClick={() => call(`/api/notes/${n.id}`, { method: "DELETE", ok: "Nota eliminada" })} className="opacity-0 transition group-hover:opacity-100 hover:text-danger" aria-label="Eliminar nota"><Trash2 className="size-3.5" /></button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InteractionForm({ playerId }: { playerId: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("trucada");
  const [text, setText] = useState("");
  const { call, pending } = useApi();
  return (
    <>
      <Button size="sm" icon={<Plus className="size-3.5" />} onClick={() => setOpen(true)}>Registrar interacción</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Registrar interacción" subtitle="Queda en el historial del jugador en tu club." size="sm"
        footer={<><Button onClick={() => setOpen(false)}>Cancelar</Button><Button variant="dark" loading={pending} disabled={text.trim().length < 2} onClick={async () => { const d = await call("/api/pipeline/interaction", { body: { playerId, kind, text }, ok: "Interacción registrada" }); if (d) { setOpen(false); setText(""); } }}>Guardar</Button></>}>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[["trucada", "Llamada"], ["reunio", "Reunión"], ["partit", "Visto en un partido"], ["familia", "Familia"], ["entrenador", "Entrenador actual"], ["altre", "Otro"]].map(([k, l]) => <Chip key={k} active={kind === k} onClick={() => setKind(k)}>{l}</Chip>)}
          </div>
          <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="¿Qué ha pasado?" />
        </div>
      </Modal>
    </>
  );
}
