"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SendHorizonal, ShieldAlert, Video, FileQuestion, Info, CheckCheck, Check } from "lucide-react";
import { Button, Field, Input, Modal, Select, Textarea, useApi } from "@/components/client/kit";
import { useToast } from "@/components/client/toast";
import { cn } from "@/components/ui";
import { fmtTime, fmtDate, dayKey } from "@/lib/time";

export type ThreadMsg = { id: string; side: string; body: string; flagged: boolean; created_at: string; sender: string | null; read: boolean };

export function Thread({ conversationId, messages, me, readOnly, minor, otherName }: { conversationId: string; messages: ThreadMsg[]; me: "club" | "player" | "guardian"; readOnly?: boolean; minor?: boolean; otherName: string }) {
  const [text, setText] = useState("");
  const [warn, setWarn] = useState(false);
  const { call, pending } = useApi();
  const end = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);
  useEffect(() => {
    if (me === "guardian") return;
    fetch(`/api/conversations/${conversationId}/read`, { method: "POST" }).then(() => router.refresh());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);
  const risky = /(\b\d{3}[\s.-]?\d{3}[\s.-]?\d{3}\b|@[a-z0-9.-]+\.[a-z]{2,}|whats\s?app|instagram|telegram|m[oò]bil)/i.test(text);

  let lastDay = "";
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="scroll-thin flex-1 space-y-2 overflow-y-auto px-4 py-5 md:px-6">
        {messages.map((m) => {
          const day = dayKey(m.created_at);
          const showDay = day !== lastDay;
          lastDay = day;
          const mine = m.side === me || (me === "guardian" && false);
          return (
            <div key={m.id}>
              {showDay && <p className="my-4 text-center text-[11.5px] font-semibold text-subtle">{fmtDate(m.created_at, { weekday: true })}</p>}
              {m.side === "system" ? (
                <div className="mx-auto my-3 flex max-w-md items-start gap-2 rounded-xl border border-line bg-bg px-3 py-2 text-[12.5px] text-muted"><Info className="mt-0.5 size-3.5 shrink-0" />{m.body}</div>
              ) : (
                <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed shadow-card animate-rise", mine ? "rounded-br-md bg-ink text-white" : "rounded-bl-md border border-line bg-surface")}>
                    {!mine && m.sender && <p className="mb-0.5 text-[11.5px] font-bold text-accent-ink">{m.sender}</p>}
                    <p className="whitespace-pre-line">{m.body}</p>
                    <p className={cn("mt-1 flex items-center justify-end gap-1 text-[10.5px]", mine ? "text-white/60" : "text-subtle")}>
                      {m.flagged && <ShieldAlert className="size-3 text-warn" />}
                      {fmtTime(m.created_at)}
                      {mine && (m.read ? <CheckCheck className="size-3.5 text-accent" /> : <Check className="size-3.5" />)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div ref={end} />
      </div>
      {readOnly ? (
        <div className="border-t border-line bg-bg px-5 py-3 text-center text-[12.5px] text-muted">Com a tutor pots llegir la conversa, però no escriure-hi.</div>
      ) : (
        <div className="border-t border-line bg-surface p-3 md:p-4">
          {(risky || warn) && (
            <div className="mb-2 flex items-start gap-2 rounded-xl border border-[#fde68a] bg-warn-soft px-3 py-2 text-[12.5px] text-ink-2">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warn" />
              <span>Per seguretat{minor ? " (és un menor)" : ""}, et recomanem mantenir la comunicació dins de ScoutUp i no compartir telèfons, correus ni xarxes socials. Els missatges amb dades de contacte queden marcats per a revisió.</span>
            </div>
          )}
          <form
            className="flex items-end gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!text.trim()) return;
              const d = await call<{ flagged: boolean }>(`/api/conversations/${conversationId}/messages`, { body: { body: text } });
              if (d) {
                setText("");
                setWarn(d.flagged);
              }
            }}
          >
            <Textarea
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  (e.currentTarget.form as HTMLFormElement).requestSubmit();
                }
              }}
              placeholder={`Escriu a ${otherName}…`}
              className="!min-h-11 max-h-40 resize-none"
            />
            <Button type="submit" variant="primary" loading={pending} disabled={!text.trim()} className="!h-11 !w-11 !px-0" aria-label="Enviar"><SendHorizonal className="size-4" /></Button>
          </form>
        </div>
      )}
    </div>
  );
}

export function ScheduleCallButton({ conversationId, playerId, playerName, teamId }: { conversationId: string; playerId: string; playerName: string; teamId: string | null }) {
  const [open, setOpen] = useState(false);
  const tomorrow = new Date(Date.now() + 86400000);
  const [date, setDate] = useState(`${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`);
  const [time, setTime] = useState("18:30");
  const [dur, setDur] = useState(30);
  const [kind, setKind] = useState("trucada");
  const { call, pending } = useApi();
  const toast = useToast();
  return (
    <>
      <Button size="sm" icon={<Video className="size-3.5" />} onClick={() => setOpen(true)}>Programar videotrucada</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Programar una trobada" subtitle={`S'afegirà al teu calendari i al de ${playerName}, i s'avisarà a la conversa.`} size="sm"
        footer={<><Button onClick={() => setOpen(false)}>Cancel·lar</Button><Button variant="dark" loading={pending} onClick={async () => {
          const starts = new Date(`${date}T${time}:00`);
          const d = await call("/api/events", { body: { kind, title: `${kind === "trucada" ? "Videotrucada" : kind === "prova" ? "Prova" : "Reunió"} amb ${playerName}`, starts_at: starts.toISOString(), duration: dur, team_id: teamId, related_player_id: playerId, location: kind === "trucada" ? "Videotrucada (enllaç per ScoutUp)" : "Instal·lacions del club", conversation_id: conversationId } });
          if (d) { setOpen(false); toast("Videotrucada programada", "ok", "Afegida als dos calendaris"); }
        }}>Programar</Button></>}>
        <div className="space-y-4">
          <Field label="Tipus"><Select value={kind} onChange={(e) => setKind(e.target.value)}><option value="trucada">Videotrucada</option><option value="reunio">Reunió presencial</option><option value="prova">Prova / entrenament</option></Select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dia"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Hora"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
          </div>
          <Field label="Durada"><Select value={dur} onChange={(e) => setDur(Number(e.target.value))}>{[15, 30, 45, 60, 90].map((d) => <option key={d} value={d}>{d} min</option>)}</Select></Field>
          <p className="rounded-xl bg-bg px-3 py-2 text-[12px] text-muted">A la demo no es genera cap enllaç real de videotrucada.</p>
        </div>
      </Modal>
    </>
  );
}

export function RequestInfoButton({ conversationId }: { conversationId: string }) {
  const { call, pending } = useApi();
  return (
    <Button size="sm" loading={pending} icon={<FileQuestion className="size-3.5" />} onClick={() => call(`/api/conversations/${conversationId}/messages`, { body: { body: "Per poder valorar-te millor, ens podries compartir per ScoutUp el vídeo complet d'un partit recent i la teva disponibilitat d'horaris per entrenar? Gràcies!" }, ok: "Sol·licitud d'informació enviada" })}>
      Sol·licitar informació
    </Button>
  );
}
