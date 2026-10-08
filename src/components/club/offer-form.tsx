"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Sparkles, Loader2, Users } from "lucide-react";
import { Button, Chip, Field, Input, Select, Textarea, Toggle } from "@/components/client/kit";
import { Avatar, Card, MatchRing } from "@/components/ui";
import { useToast } from "@/components/client/toast";
import { POSITIONS, POSITION_LABEL, LEVELS, TRAITS } from "@/lib/domain";
import type { Position } from "@/lib/domain";
import { PLACES } from "@/lib/geo";

type Team = { id: string; name: string; category: string; gender: string };
type Preview = { total: number; over80: number; over70: number; top: { id: string; name: string; initials: string; hue: number; pos: string; age: number; club: string; score: number }[]; birth_year_min: number; birth_year_max: number };

export function OfferForm({ teams, clubCity, initial }: { teams: Team[]; clubCity: string; initial?: Partial<Record<string, string>> }) {
  const router = useRouter();
  const toast = useToast();
  const [f, setF] = useState({
    team_id: initial?.team ?? teams.find((t) => t.name === "Juvenil A")?.id ?? teams[0]?.id ?? "",
    kind: "incorporacio",
    title: "",
    position: (initial?.position as Position) ?? "DC",
    accepts_secondary: true,
    level_min: 3,
    zone_city: clubCity,
    max_km: 30,
    foot: "indiferent",
    height_min: "",
    traits: [] as string[],
    availability_req: "temporada",
    description: "",
    restrictions: "",
    trial_date: "",
    expires_days: 30,
  });
  const [pv, setPv] = useState<Preview | null>(null);
  const [loadingPv, setLoadingPv] = useState(false);
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const team = teams.find((t) => t.id === f.team_id);
  const autoTitle = useMemo(() => `Buscamos ${POSITION_LABEL[f.position as Position].toLowerCase()} para el ${team?.name ?? "equipo"}`, [f.position, team]);

  const payload = () => ({
    ...f,
    title: f.title.trim() || autoTitle,
    height_min: f.height_min ? Number(f.height_min) : null,
    trial_date: f.kind === "prova" && f.trial_date ? new Date(f.trial_date).toISOString() : null,
  });

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoadingPv(true);
      const r = await fetch("/api/offers/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) });
      if (r.ok) setPv(await r.json());
      setLoadingPv(false);
    }, 350);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.team_id, f.position, f.accepts_secondary, f.level_min, f.zone_city, f.max_km, f.foot, f.height_min, f.traits.join(","), f.availability_req]);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const traitOptions = TRAITS.filter((t) => (f.position === "POR" ? true : t.key !== "reflexos"));

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <Card>
          <p className="mb-4 text-[15px] font-bold">1 · Equipo y tipo</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Equipo">
              <Select value={f.team_id} onChange={(e) => set("team_id", e.target.value)}>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.category}{t.gender === "F" ? " femení" : ""}</option>)}
              </Select>
            </Field>
            <Field label="Tipo">
              <div className="flex gap-2">
                <Chip active={f.kind === "incorporacio"} onClick={() => set("kind", "incorporacio")}>Incorporación</Chip>
                <Chip active={f.kind === "prova"} onClick={() => set("kind", "prova")}>Jornada de pruebas</Chip>
              </div>
            </Field>
            <Field label="Título" hint={`Si lo dejas vacío: «${autoTitle}»`} className="md:col-span-2">
              <Input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder={autoTitle} maxLength={90} />
            </Field>
            {f.kind === "prova" && (
              <Field label="Fecha y hora de la prueba"><Input type="datetime-local" value={f.trial_date} onChange={(e) => set("trial_date", e.target.value)} /></Field>
            )}
          </div>
        </Card>

        <Card>
          <p className="mb-4 text-[15px] font-bold">2 · Perfil que buscas</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Posición">
              <Select value={f.position} onChange={(e) => set("position", e.target.value as Position)}>{POSITIONS.map((p) => <option key={p} value={p}>{POSITION_LABEL[p]}</option>)}</Select>
            </Field>
            <Field label="Nivel mínimo del jugador" hint="Nivel de la competición en la que juega actualmente">
              <Select value={f.level_min} onChange={(e) => set("level_min", Number(e.target.value))}>{LEVELS.map((l) => <option key={l.rank} value={l.rank}>{l.label} o superior</option>)}</Select>
            </Field>
            <Field label="Pie dominante">
              <div className="flex gap-2">{[["indiferent", "Indiferente"], ["esquerre", "Zurdo"], ["dret", "Diestro"]].map(([k, l]) => <Chip key={k} active={f.foot === k} onClick={() => set("foot", k)}>{l}</Chip>)}</div>
            </Field>
            <Field label="Altura mínima (opcional)"><Input type="number" min={150} max={205} value={f.height_min} onChange={(e) => set("height_min", e.target.value)} placeholder="p. ej. 180" /></Field>
            <Field label="Características clave (hasta 4)" className="md:col-span-2">
              <div className="flex flex-wrap gap-2">
                {traitOptions.map((t) => (
                  <Chip key={t.key} active={f.traits.includes(t.key)} onClick={() => set("traits", f.traits.includes(t.key) ? f.traits.filter((x) => x !== t.key) : [...f.traits, t.key].slice(-4))}>{t.label}</Chip>
                ))}
              </div>
            </Field>
            <div className="md:col-span-2"><Toggle checked={f.accepts_secondary} onChange={(v) => set("accepts_secondary", v)} label="Acepto jugadores con esta posición como secundaria" hint="Cuentan con una puntuación de posición algo más baja" /></div>
          </div>
        </Card>

        <Card>
          <p className="mb-4 text-[15px] font-bold">3 · Zona, condicions i restriccions</p>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Zona de referencia"><Select value={f.zone_city} onChange={(e) => set("zone_city", e.target.value)}>{PLACES.map((p) => <option key={p.city}>{p.city}</option>)}</Select></Field>
            <Field label={`Distancia máxima: ${f.max_km} km`}><input type="range" min={5} max={80} step={5} value={f.max_km} onChange={(e) => set("max_km", Number(e.target.value))} className="mt-3 w-full accent-[#00c768]" /></Field>
            <Field label="Disponibilidad">
              <Select value={f.availability_req} onChange={(e) => set("availability_req", e.target.value)}><option value="temporada">Para la temporada</option><option value="immediata">Inmediata</option></Select>
            </Field>
            <Field label="Descripción" className="md:col-span-3"><Textarea rows={4} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Explica el contexto: qué busca el equipo, rol previsto, estilo de juego…" /></Field>
            <Field label="Restricciones y condiciones" hint="Horarios, desplazamientos, compromiso… Se muestra a los jugadores." className="md:col-span-2"><Textarea rows={2} value={f.restrictions} onChange={(e) => set("restrictions", e.target.value)} placeholder="p. ej. Entrenamientos L, X y V a las 19:30 h" /></Field>
            <Field label="Duración de la publicación"><Select value={f.expires_days} onChange={(e) => set("expires_days", Number(e.target.value))}>{[15, 30, 45, 60].map((d) => <option key={d} value={d}>{d} dies</option>)}</Select></Field>
          </div>
        </Card>
      </div>

      <div className="xl:sticky xl:top-24 xl:self-start">
        <Card className="border-night bg-night text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-accent" />
            <p className="text-[14px] font-bold">Vista previa en directo</p>
            {loadingPv && <Loader2 className="ml-auto size-4 animate-spin text-night-muted" />}
          </div>
          {pv ? (
            <>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[["≥ 80%", pv.over80], ["≥ 70%", pv.over70], ["≥ 50%", pv.total]].map(([k, v]) => (
                  <div key={k as string} className="rounded-xl bg-night-2 p-2.5"><p className="text-[22px] font-extrabold tabular">{v}</p><p className="text-[11px] text-night-muted">{k}</p></div>
                ))}
              </div>
              <p className="mt-3 text-[12px] text-night-text">Nascuts {pv.birth_year_min}–{pv.birth_year_max} · {team?.category}{team?.gender === "F" ? " femení" : ""}</p>
              <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-[0.12em] text-night-muted">Mejores candidatos</p>
              <div className="space-y-2">
                {pv.top.length === 0 && <p className="text-[12.5px] text-night-muted">Ningún candidato con estos criterios.</p>}
                {pv.top.map((t) => (
                  <div key={t.id} className="flex items-center gap-2.5 rounded-xl bg-night-2 p-2">
                    <Avatar initials={t.initials} hue={t.hue} size={32} />
                    <div className="min-w-0 flex-1"><p className="truncate text-[12.5px] font-bold">{t.name}</p><p className="truncate text-[11.5px] text-night-muted">{t.pos} · {t.age} años · {t.club}</p></div>
                    <div className="rounded-full bg-white p-0.5"><MatchRing score={t.score} size={34} stroke={3.5} /></div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-4 space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-xl bg-night-2" />)}</div>
          )}
          <Button
            variant="primary"
            size="lg"
            loading={saving}
            className="mt-5 w-full"
            icon={<Send className="size-4" />}
            onClick={async () => {
              setSaving(true);
              const r = await fetch("/api/offers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) });
              const d = await r.json();
              if (!r.ok) {
                toast(d.error ?? "No se ha podido publicar.", "error");
                setSaving(false);
                return;
              }
              toast("Oportunidad publicada", "ok", `${d.preview.over80} perfiles por encima del 80%`);
              router.push(`/club/oportunitats/${d.id}`);
            }}
          >
            Publicar oportunidad
          </Button>
          <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-night-muted"><Users className="size-3.5" /> Solo se tienen en cuenta perfiles visibles para tu club.</p>
        </Card>
      </div>
    </div>
  );
}
