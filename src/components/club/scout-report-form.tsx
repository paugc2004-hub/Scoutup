"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button, Chip, Field, Input, Modal, Select, Textarea, useApi } from "@/components/client/kit";
import { SCOUT_RECOMMENDATION, POSITIONS, POSITION_LABEL } from "@/lib/domain";

export function ScoutReportButton({ players, defaultPlayer }: { players: { id: string; name: string; pos: string }[]; defaultPlayer?: string }) {
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ player_id: defaultPlayer ?? players[0]?.id ?? "", match_title: "", match_date: today, competition: "", position_observed: players[0]?.pos ?? "DC", rating: 7, observations: "", recommendation: "seguir", reminder: false, reminder_date: "" });
  const { call, pending } = useApi();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: k === "rating" ? Number(e.target.value) : e.target.value }));
  return (
    <>
      <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>Nou informe</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Informe de scouting" subtitle="Observació d'un jugador en un partit. Només el veu el teu club." size="lg"
        footer={<><Button onClick={() => setOpen(false)}>Cancel·lar</Button><Button variant="dark" loading={pending} disabled={!f.match_title || f.observations.length < 5} onClick={async () => {
          const d = await call("/api/scout-reports", { body: { player_id: f.player_id, match_title: f.match_title, match_date: new Date(f.match_date).toISOString(), competition: f.competition || null, position_observed: f.position_observed, rating: f.rating, observations: f.observations, recommendation: f.recommendation, reminder_at: f.reminder && f.reminder_date ? new Date(`${f.reminder_date}T10:00:00`).toISOString() : null }, ok: "Informe guardat", okSub: f.reminder ? "Recordatori afegit al calendari" : undefined });
          if (d) setOpen(false);
        }}>Guardar informe</Button></>}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Jugador" className="md:col-span-2"><Select value={f.player_id} onChange={(e) => { const p = players.find((x) => x.id === e.target.value); setF((x) => ({ ...x, player_id: e.target.value, position_observed: p?.pos ?? x.position_observed })); }}>{players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
          <Field label="Partit"><Input value={f.match_title} onChange={set("match_title")} placeholder="Equip local – Equip visitant" /></Field>
          <Field label="Data"><Input type="date" value={f.match_date} onChange={set("match_date")} /></Field>
          <Field label="Competició"><Input value={f.competition} onChange={set("competition")} placeholder="p. ex. Juvenil Preferent" /></Field>
          <Field label="Posició observada"><Select value={f.position_observed} onChange={set("position_observed")}>{POSITIONS.map((p) => <option key={p} value={p}>{POSITION_LABEL[p]}</option>)}</Select></Field>
          <Field label={`Valoració: ${f.rating}/10`} className="md:col-span-2"><input type="range" min={1} max={10} value={f.rating} onChange={set("rating")} className="w-full accent-[#00c768]" /></Field>
          <Field label="Observacions" className="md:col-span-2"><Textarea rows={4} value={f.observations} onChange={set("observations")} placeholder="Què has vist? Punts forts, aspectes a millorar, context del partit…" /></Field>
          <Field label="Recomanació" className="md:col-span-2"><div className="flex flex-wrap gap-2">{Object.entries(SCOUT_RECOMMENDATION).map(([k, l]) => <Chip key={k} active={f.recommendation === k} onClick={() => setF((x) => ({ ...x, recommendation: k }))}>{l}</Chip>)}</div></Field>
          <label className="flex items-center gap-2 text-[13px] font-semibold md:col-span-2"><input type="checkbox" checked={f.reminder} onChange={(e) => setF((x) => ({ ...x, reminder: e.target.checked }))} className="size-4 accent-[#00c768]" /> Afegir un recordatori per tornar-lo a veure</label>
          {f.reminder && <Field label="Data del recordatori"><Input type="date" value={f.reminder_date} onChange={set("reminder_date")} /></Field>}
        </div>
      </Modal>
    </>
  );
}
