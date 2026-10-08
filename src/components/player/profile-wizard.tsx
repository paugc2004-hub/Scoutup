"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Plus, Trash2, Film, Lock, Trophy, Loader2 } from "lucide-react";
import { Button, Chip, Field, Input, Select, Textarea, Toggle } from "@/components/client/kit";
import { useToast } from "@/components/client/toast";
import { Card, MatchRing, cn } from "@/components/ui";
import { ATTRS, ATTR_LABEL, POSITIONS, POSITION_LABEL, LEVELS, INTEREST_LABEL, PROFILE_VISIBILITY_LABEL, CONTACT_PERMISSION_LABEL, LOCATION_LABEL } from "@/lib/domain";
import type { Position, Privacy, Preferences, Attrs } from "@/lib/domain";
import { PLACES } from "@/lib/geo";

export type WizardData = {
  first_name: string; last_name: string; birth_date: string; city: string; nationality: string; languages: string;
  primary_position: Position; secondary_positions: Position[]; foot: string; height_cm: number | null; style: string; description: string; attrs: Attrs;
  club_label: string; has_club: boolean; club_name_free: string; division_rank: number;
  availability: string; available_from: string; contract_status: string;
  preferences: Preferences; privacy: Privacy; minor: boolean;
  career: { id: string; season_label: string; club_name: string; team_name: string | null; category: string | null; division: string | null; role: string | null; verification: string }[];
  achievements: { id: string; title: string; season_label: string | null }[];
  videos: { id: string; title: string; kind: string; duration_s: number }[];
  seasons: { id: string; label: string; stats: Record<string, number> | null; team_name: string | null; verification: string | null }[];
  completeness: number;
  items: { key: string; label: string; weight: number; done: boolean; step: number }[];
};

const STEPS = ["Datos personales", "Perfil deportivo", "Trayectoria", "Estadísticas", "Vídeos", "Disponibilidad", "Preferencias", "Privacidad"];
const STAT_FIELDS: [string, string][] = [["callups", "Convocatorias"], ["matches", "Partidos jugados"], ["starts", "Titularidades"], ["minutes", "Minutos"], ["goals", "Goles"], ["assists", "Asistencias"], ["yellow", "Tarjetas amarillas"], ["red", "Tarjetas rojas"], ["clean_sheets", "Portería a cero"]];

async function api(url: string, method: string, body?: unknown) {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error ?? "No se ha podido guardar.");
  return d;
}

export function ProfileWizard({ initial, startStep }: { initial: WizardData; startStep: number }) {
  const [step, setStep] = useState(Math.min(8, Math.max(1, startStep)));
  const [d, setD] = useState(initial);
  const [score, setScore] = useState(initial.completeness);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const set = <K extends keyof WizardData>(k: K, v: WizardData[K]) => setD((x) => ({ ...x, [k]: v }));

  const saveStep = async (): Promise<boolean> => {
    setBusy(true);
    try {
      let body: Record<string, unknown> = {};
      if (step === 1) body = { first_name: d.first_name, last_name: d.last_name, birth_date: d.birth_date, city: d.city, nationality: d.nationality, languages: d.languages };
      if (step === 2) body = { primary_position: d.primary_position, secondary_positions: d.secondary_positions, foot: d.foot, height_cm: d.height_cm, style: d.style, description: d.description, attrs: d.attrs };
      if (step === 3) body = d.has_club ? { division_rank: d.division_rank } : { club_name_free: d.club_name_free, division_rank: d.division_rank };
      if (step === 6) body = { availability: d.availability, available_from: d.available_from || null, contract_status: d.contract_status };
      if (step === 7) body = { preferences: d.preferences };
      if (step === 8) body = { privacy: d.privacy, onboarding_done: true };
      if (step === 4) {
        for (const s of d.seasons) {
          if (!s.stats) continue;
          const r = await api("/api/me/stats", "POST", { season_id: s.id, team_name: s.team_name, ...Object.fromEntries(STAT_FIELDS.map(([k]) => [k, Number(s.stats![k] ?? 0)])) });
          setScore(r.completeness);
        }
        return true;
      }
      if (step !== 5) {
        const r = await api("/api/me/player", "PATCH", body);
        setScore(r.completeness);
      }
      return true;
    } catch (e) {
      toast((e as Error).message, "error");
      return false;
    } finally {
      setBusy(false);
    }
  };
  const next = async () => {
    if (!(await saveStep())) return;
    if (step < 8) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      toast("Perfil guardado", "ok", "Los clubes ya ven los cambios (según tu privacidad).");
      router.push("/jugador/perfil");
      router.refresh();
    }
  };

  const addCareer = async (row: { season_label: string; club_name: string; team_name: string; category: string; division: string; role: string }) => {
    try {
      const r = await api("/api/me/career", "POST", row);
      setScore(r.completeness);
      set("career", [...d.career, { id: `tmp${Date.now()}`, ...row, verification: "self" }]);
      toast("Temporada añadida", "ok");
      router.refresh();
    } catch (e) { toast((e as Error).message, "error"); }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[260px_1fr]">
      <aside className="xl:sticky xl:top-24 xl:self-start">
        <Card>
          <div className="flex items-center gap-3"><MatchRing score={score} size={58} stroke={6} /><div><p className="text-[14px] font-extrabold">Perfil {score}%</p><p className="text-[12px] text-muted">Se recalcula al guardar</p></div></div>
          <ol className="mt-4 space-y-0.5">
            {STEPS.map((s, i) => {
              const n = i + 1;
              const itemsDone = d.items.filter((it) => it.step === n);
              const done = itemsDone.length > 0 && itemsDone.every((it) => it.done);
              return (
                <li key={s}>
                  <button onClick={() => setStep(n)} className={cn("flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[13px] transition", step === n ? "bg-ink font-bold text-white" : "hover:bg-sunken")}>
                    <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold", step === n ? "bg-accent text-night" : done ? "bg-accent-soft text-accent-ink" : "bg-sunken text-muted")}>{done && step !== n ? <Check className="size-3.5" /> : n}</span>
                    {s}
                  </button>
                </li>
              );
            })}
          </ol>
        </Card>
      </aside>

      <Card className="animate-fade-in" key={step}>
        <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-accent-ink">Pas {step} de 8</p>
        <h2 className="mt-1 text-[22px] font-extrabold tracking-tight">{STEPS[step - 1]}</h2>
        <div className="mt-5">
          {step === 1 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nombre"><Input value={d.first_name} onChange={(e) => set("first_name", e.target.value)} /></Field>
              <Field label="Apellidos"><Input value={d.last_name} onChange={(e) => set("last_name", e.target.value)} /></Field>
              <Field label="Fecha de nacimiento"><Input type="date" value={d.birth_date} onChange={(e) => set("birth_date", e.target.value)} /></Field>
              <Field label="Municipio" hint="Los clubes ven el municipio, la comarca o solo la provincia, según tu privacidad."><Select value={d.city} onChange={(e) => set("city", e.target.value)}>{[...PLACES].sort((a, b) => a.city.localeCompare(b.city, "es")).map((p) => <option key={p.city}>{p.city}</option>)}</Select></Field>
              <Field label="Nacionalidad"><Input value={d.nationality} onChange={(e) => set("nationality", e.target.value)} /></Field>
              <Field label="Idiomas"><Input value={d.languages} onChange={(e) => set("languages", e.target.value)} placeholder="Catalán, castellano, inglés" /></Field>
              {d.minor && <p className="flex gap-2 rounded-xl border border-[#ddd6fe] bg-violet-soft p-3 text-[12.5px] text-ink-2 md:col-span-2"><Lock className="mt-0.5 size-4 shrink-0 text-violet" /> Eres menor de edad: tu tutor legal debe dar su consentimiento para que los clubes puedan verte, y debe autorizar cualquier contacto.</p>}
              <p className="text-[12px] text-subtle md:col-span-2">No te pedimos ningún documento de identidad, dirección, teléfono ni dato de salud.</p>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Posición principal"><Select value={d.primary_position} onChange={(e) => set("primary_position", e.target.value as Position)}>{POSITIONS.map((p) => <option key={p} value={p}>{POSITION_LABEL[p]}</option>)}</Select></Field>
                <Field label="Pie dominante"><Select value={d.foot} onChange={(e) => set("foot", e.target.value)}><option value="dret">Diestro</option><option value="esquerre">Zurdo</option><option value="ambdues">Ambidiestro</option></Select></Field>
                <Field label="Altura (cm)"><Input type="number" min={140} max={215} value={d.height_cm ?? ""} onChange={(e) => set("height_cm", e.target.value ? Number(e.target.value) : null)} /></Field>
              </div>
              <Field label="Posiciones secundarias (hasta 3)"><div className="flex flex-wrap gap-2">{POSITIONS.filter((p) => p !== d.primary_position).map((p) => <Chip key={p} active={d.secondary_positions.includes(p)} onClick={() => set("secondary_positions", d.secondary_positions.includes(p) ? d.secondary_positions.filter((x) => x !== p) : [...d.secondary_positions, p].slice(-3))}>{POSITION_LABEL[p]}</Chip>)}</div></Field>
              <Field label="Estilo de juego" hint="Una frase corta"><Input value={d.style} onChange={(e) => set("style", e.target.value)} placeholder="p. ej. Central con salida de balón" maxLength={120} /></Field>
              <Field label="Descripción" hint={`${d.description.length}/800 · mínimo 60 caracteres para contar en la completitud`}><Textarea rows={4} value={d.description} onChange={(e) => set("description", e.target.value)} maxLength={800} placeholder="¿Cómo eres como jugador? ¿Qué buscas?" /></Field>
              <div>
                <p className="mb-2 text-[12.5px] font-semibold text-ink-2">Autoevaluación de atributos</p>
                <div className="grid gap-x-6 gap-y-3 md:grid-cols-2">
                  {ATTRS.map((k) => (
                    <label key={k} className="block"><span className="mb-1 flex justify-between text-[12.5px] text-muted"><span>{ATTR_LABEL[k]}</span><span className="font-bold text-ink tabular">{d.attrs[k] ?? 5}</span></span><input type="range" min={1} max={10} value={d.attrs[k] ?? 5} onChange={(e) => set("attrs", { ...d.attrs, [k]: Number(e.target.value) })} className="w-full accent-[#00c768]" /></label>
                  ))}
                </div>
              </div>
            </div>
          )}
          {step === 3 && <CareerStep d={d} set={set} onAdd={addCareer} setScore={setScore} />}
          {step === 4 && (
            <div className="space-y-5">
              <p className="text-[13px] text-muted">Las estadísticas que introduces salen marcadas como <strong>Autodeclaradas</strong> o <strong>Actualizadas</strong>. En el futuro, con una fuente oficial, se podrían contrastar.</p>
              {d.seasons.map((s, si) => (
                <div key={s.id} className="rounded-2xl border border-line p-4">
                  <div className="mb-3 flex items-center justify-between"><p className="text-[14px] font-bold">Temporada {s.label}</p>{!s.stats && <Button size="sm" icon={<Plus className="size-3.5" />} onClick={() => set("seasons", d.seasons.map((x, i) => (i === si ? { ...x, stats: Object.fromEntries(STAT_FIELDS.map(([k]) => [k, 0])) } : x)))}>Añadir datos</Button>}</div>
                  {s.stats ? (
                    <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
                      {STAT_FIELDS.map(([k, l]) => <Field key={k} label={l}><Input type="number" min={0} value={s.stats![k] ?? 0} onChange={(e) => set("seasons", d.seasons.map((x, i) => (i === si ? { ...x, stats: { ...x.stats!, [k]: Number(e.target.value) } } : x)))} /></Field>)}
                    </div>
                  ) : <p className="text-[13px] text-subtle">Todavía no hay datos de esta temporada.</p>}
                </div>
              ))}
            </div>
          )}
          {step === 5 && <VideoStep d={d} set={set} setScore={setScore} />}
          {step === 6 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Disponibilidad" className="md:col-span-2"><div className="flex flex-wrap gap-2">{[["obert", "Abierto a nuevas oportunidades"], ["escoltant", "Escuchando propuestas"], ["no_disponible", "No disponible"]].map(([k, l]) => <Chip key={k} active={d.availability === k} onClick={() => set("availability", k)}>{l}</Chip>)}</div></Field>
              <Field label="Situación actual"><Select value={d.contract_status} onChange={(e) => set("contract_status", e.target.value)}><option value="amb_fitxa">Con ficha</option><option value="final_temporada">Ficha hasta final de temporada</option><option value="lliure">Sin equipo</option></Select></Field>
              <Field label="Disponible a partir de (opcional)"><Input type="date" value={d.available_from} onChange={(e) => set("available_from", e.target.value)} /></Field>
            </div>
          )}
          {step === 7 && (
            <div className="space-y-5">
              <Field label="Categorías que te interesan"><div className="flex flex-wrap gap-2">{["Cadete", "Juvenil", "Amateur"].map((c) => <Chip key={c} active={d.preferences.categories.includes(c)} onClick={() => set("preferences", { ...d.preferences, categories: d.preferences.categories.includes(c) ? d.preferences.categories.filter((x) => x !== c) : [...d.preferences.categories, c] })}>{c}</Chip>)}</div></Field>
              <Field label="Qué buscas"><div className="flex flex-wrap gap-2">{Object.entries(INTEREST_LABEL).map(([k, l]) => <Chip key={k} active={d.preferences.interests.includes(k)} onClick={() => set("preferences", { ...d.preferences, interests: d.preferences.interests.includes(k) ? d.preferences.interests.filter((x) => x !== k) : [...d.preferences.interests, k] })}>{l}</Chip>)}</div></Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={`Distancia máxima: ${d.preferences.maxKm} km`}><input type="range" min={5} max={100} step={5} value={d.preferences.maxKm} onChange={(e) => set("preferences", { ...d.preferences, maxKm: Number(e.target.value) })} className="mt-3 w-full accent-[#00c768]" /></Field>
                <Field label="Nivel mínimo que buscas"><Select value={d.preferences.levelMin ?? ""} onChange={(e) => set("preferences", { ...d.preferences, levelMin: e.target.value ? Number(e.target.value) : null })}><option value="">Indiferente</option>{LEVELS.map((l) => <option key={l.rank} value={l.rank}>{l.label}</option>)}</Select></Field>
              </div>
              <Field label="Otras preferencias"><Textarea rows={3} value={d.preferences.notes} onChange={(e) => set("preferences", { ...d.preferences, notes: e.target.value })} placeholder="p. ej. Horarios compatibles con los estudios" /></Field>
            </div>
          )}
          {step === 8 && <PrivacyFields privacy={d.privacy} minor={d.minor} onChange={(p) => set("privacy", p)} />}
        </div>
        <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
          <Button variant="ghost" icon={<ChevronLeft className="size-4" />} disabled={step === 1} onClick={() => setStep(step - 1)}>Anterior</Button>
          <Button variant={step === 8 ? "primary" : "dark"} loading={busy} onClick={next}>{step === 8 ? "Guardar y terminar" : <>Guardar y continuar <ChevronRight className="size-4" /></>}</Button>
        </div>
      </Card>
    </div>
  );
}

function CareerStep({ d, set, onAdd, setScore }: { d: WizardData; set: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void; onAdd: (r: { season_label: string; club_name: string; team_name: string; category: string; division: string; role: string }) => void; setScore: (n: number) => void }) {
  const [row, setRow] = useState({ season_label: "2023/24", club_name: "", team_name: "Juvenil A", category: "Juvenil", division: "Preferent", role: "Titular" });
  const [ach, setAch] = useState({ title: "", season_label: "2025/26" });
  const toast = useToast();
  const router = useRouter();
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Club actual">{d.has_club ? <Input value={d.club_label} disabled /> : <Input value={d.club_name_free} onChange={(e) => set("club_name_free", e.target.value)} placeholder="Nombre del club o «Sin equipo»" />}</Field>
        <Field label="Nivel de tu competición"><Select value={d.division_rank} onChange={(e) => set("division_rank", Number(e.target.value))}>{LEVELS.map((l) => <option key={l.rank} value={l.rank}>{l.label}</option>)}</Select></Field>
      </div>
      <div>
        <p className="mb-2 text-[13px] font-bold">Temporadas anteriores</p>
        <div className="space-y-2">
          {d.career.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2 text-[13px]">
              <span className="w-16 font-bold tabular">{c.season_label}</span>
              <span className="min-w-0 flex-1 truncate">{c.club_name} · {c.team_name} · {c.division}</span>
              <span className="text-[11.5px] text-subtle">{c.verification === "verified" ? "Verificado" : "Autodeclarado"}</span>
              {!c.id.startsWith("tmp") && c.verification !== "verified" && <button onClick={async () => { const r = await fetch(`/api/me/career/${c.id}`, { method: "DELETE" }); if (r.ok) { setScore((await r.json()).completeness); set("career", d.career.filter((x) => x.id !== c.id)); router.refresh(); } }} className="text-subtle hover:text-danger" aria-label="Eliminar"><Trash2 className="size-4" /></button>}
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-2 rounded-2xl bg-bg p-3 md:grid-cols-6">
          <Input value={row.season_label} onChange={(e) => setRow({ ...row, season_label: e.target.value })} placeholder="2023/24" />
          <Input className="md:col-span-2" value={row.club_name} onChange={(e) => setRow({ ...row, club_name: e.target.value })} placeholder="Club" />
          <Input value={row.team_name} onChange={(e) => setRow({ ...row, team_name: e.target.value })} placeholder="Equipo" />
          <Select value={row.division} onChange={(e) => setRow({ ...row, division: e.target.value })}>{LEVELS.map((l) => <option key={l.rank}>{l.label}</option>)}</Select>
          <Button icon={<Plus className="size-4" />} disabled={row.club_name.length < 2} onClick={() => onAdd(row)}>Añadir</Button>
        </div>
      </div>
      <div>
        <p className="mb-2 text-[13px] font-bold">Logros</p>
        <div className="flex flex-wrap gap-2">{d.achievements.map((a) => <span key={a.id} className="inline-flex items-center gap-1.5 rounded-full border border-[#f5e3a3] bg-[#fffbeb] px-2.5 py-1 text-[12.5px] font-semibold text-[#8a6100]"><Trophy className="size-3.5" />{a.title}</span>)}</div>
        <div className="mt-3 flex gap-2">
          <Input value={ach.title} onChange={(e) => setAch({ ...ach, title: e.target.value })} placeholder="p. ej. Capitán del equipo" />
          <Input className="!w-28" value={ach.season_label} onChange={(e) => setAch({ ...ach, season_label: e.target.value })} />
          <Button icon={<Plus className="size-4" />} disabled={ach.title.length < 3} onClick={async () => { try { const r = await api("/api/me/achievements", "POST", ach); setScore(r.completeness); set("achievements", [...d.achievements, { id: `tmp${Date.now()}`, ...ach }]); setAch({ ...ach, title: "" }); toast("Logro añadido", "ok"); } catch (e) { toast((e as Error).message, "error"); } }}>Añadir</Button>
        </div>
      </div>
    </div>
  );
}

function VideoStep({ d, set, setScore }: { d: WizardData; set: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void; setScore: (n: number) => void }) {
  const [v, setV] = useState({ title: "Highlights de la temporada", kind: "highlights", minutes: 3 });
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <div className="space-y-5">
      <p className="flex gap-2 rounded-xl bg-bg p-3 text-[12.5px] text-muted"><Film className="mt-0.5 size-4 shrink-0" /> En la demo no se sube ningún fichero: solo se registra el vídeo (título, tipo y duración) y se muestra con una miniatura de demostración. Los vídeos no se pueden descargar.</p>
      <div className="space-y-2">
        {d.videos.length === 0 && <p className="text-[13px] text-subtle">Todavía no tienes vídeos. Los perfiles con vídeo reciben más visitas.</p>}
        {d.videos.map((x) => (
          <div key={x.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-[13px]">
            <Film className="size-4 text-subtle" /><span className="flex-1 font-semibold">{x.title}</span><span className="text-muted">{x.kind} · {Math.round(x.duration_s / 60)} min</span>
            <button onClick={async () => { const r = await fetch(`/api/me/videos/${x.id}`, { method: "DELETE" }); if (r.ok) { setScore((await r.json()).completeness); set("videos", d.videos.filter((y) => y.id !== x.id)); } }} className="text-subtle hover:text-danger" aria-label="Eliminar"><Trash2 className="size-4" /></button>
          </div>
        ))}
      </div>
      <div className="grid gap-2 rounded-2xl bg-bg p-3 md:grid-cols-[1fr_160px_120px_auto]">
        <Input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} placeholder="Título del vídeo" />
        <Select value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value })}><option value="highlights">Highlights</option><option value="partit">Partido completo</option><option value="entrenament">Entrenamiento</option></Select>
        <Input type="number" min={1} max={120} value={v.minutes} onChange={(e) => setV({ ...v, minutes: Number(e.target.value) })} />
        <Button variant="dark" loading={busy} icon={<Plus className="size-4" />} onClick={async () => { setBusy(true); try { const r = await api("/api/me/videos", "POST", { title: v.title, kind: v.kind, duration_s: v.minutes * 60 }); setScore(r.completeness); set("videos", [...d.videos, { id: `tmp${Date.now()}`, title: v.title, kind: v.kind, duration_s: v.minutes * 60 }]); toast("Vídeo añadido", "ok"); } catch (e) { toast((e as Error).message, "error"); } finally { setBusy(false); } }}>Añadir</Button>
      </div>
      {busy && <Loader2 className="size-4 animate-spin" />}
    </div>
  );
}

export function PrivacyFields({ privacy, minor, onChange }: { privacy: Privacy; minor: boolean; onChange: (p: Privacy) => void }) {
  const set = <K extends keyof Privacy>(k: K, v: Privacy[K]) => onChange({ ...privacy, [k]: v });
  return (
    <div className="space-y-5">
      {minor && <p className="flex gap-2 rounded-xl border border-[#ddd6fe] bg-violet-soft p-3 text-[12.5px] text-ink-2"><Lock className="mt-0.5 size-4 shrink-0 text-violet" /> Como menor, tu perfil como máximo es visible para clubes verificados y cualquier contacto pasa por tu tutor legal.</p>}
      <Field label="Quién puede ver mi perfil"><div className="flex flex-wrap gap-2">{(["tots", "verificats", "contactats", "ocult"] as const).map((k) => <Chip key={k} active={privacy.profile === k} onClick={() => !(minor && k === "tots") && set("profile", k)} className={minor && k === "tots" ? "opacity-40" : ""}>{PROFILE_VISIBILITY_LABEL[k]}</Chip>)}</div></Field>
      <Field label="Quién puede ver mis vídeos"><div className="flex flex-wrap gap-2">{(["tots", "verificats", "contactats"] as const).map((k) => <Chip key={k} active={privacy.videos === k} onClick={() => set("videos", k)}>{PROFILE_VISIBILITY_LABEL[k]}</Chip>)}</div></Field>
      <Field label="Quién me puede enviar solicitudes de contacto"><div className="flex flex-wrap gap-2">{(["tots", "verificats", "ningu"] as const).map((k) => <Chip key={k} active={privacy.contact === k} onClick={() => !(minor && k === "tots") && set("contact", k)} className={minor && k === "tots" ? "opacity-40" : ""}>{CONTACT_PERMISSION_LABEL[k]}</Chip>)}</div></Field>
      <Field label="Ubicación que se muestra"><div className="flex flex-wrap gap-2">{(["ciutat", "comarca", "provincia"] as const).map((k) => <Chip key={k} active={privacy.location === k} onClick={() => set("location", k)}>{LOCATION_LABEL[k]}</Chip>)}</div></Field>
      <div className="divide-y divide-line rounded-xl border border-line px-4">
        <Toggle checked={privacy.showStats} onChange={(v) => set("showStats", v)} label="Mostrar mis estadísticas" hint="Convocatorias, minutos, goles, tarjetas…" />
        <Toggle checked={privacy.showHeight} onChange={(v) => set("showHeight", v)} label="Mostrar la altura" />
        <Toggle checked={privacy.notifyEmail} onChange={(v) => set("notifyEmail", v)} label="Avisos por correo" hint="En la demo no se envía ningún correo real" />
      </div>
    </div>
  );
}
