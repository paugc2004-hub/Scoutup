"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Loader2, Building2, Users, Target, Sparkles } from "lucide-react";
import { Avatar, MatchRing, btnClass, cn } from "@/components/ui";
import { Chip, Field, Select, Textarea } from "@/components/client/kit";
import { useToast } from "@/components/client/toast";
import { LEVELS, POSITIONS, POSITION_LABEL } from "@/lib/domain";
import type { Position } from "@/lib/domain";

type Preset = { key: string; name: string };
type Top = { id: string; name: string; initials: string; hue: number; pos: string; age: number; club: string; score: number };
type Result = { offerId: string; preview: { total: number; over80: number; over70: number; top: Top[] } };

const STEPS = [
  { title: "Tu club", icon: Building2 },
  { title: "Equipos", icon: Users },
  { title: "Primera necesidad", icon: Target },
  { title: "Primeros jugadores", icon: Sparkles },
];

/** Asistente de bienvenida: pide lo mínimo para llegar al primer valor (jugadores compatibles). */
export function OnboardingWizard({ clubName, city, verified, presets }: { clubName: string; city: string; verified: boolean; presets: Preset[] }) {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [teams, setTeams] = useState<string[]>(["cada", "juva"]);
  const [need, setNeed] = useState({ team: "cada", position: "LD" as Position, level_min: 3, foot: "indiferent", text: "" });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const toggle = (k: string) => setTeams((t) => (t.includes(k) ? t.filter((x) => x !== k) : [...t, k]));
  const teamName = presets.find((p) => p.key === need.team)?.name ?? "";

  const finish = async () => {
    setBusy(true);
    try {
      const text = need.text.trim() || `Buscamos un ${POSITION_LABEL[need.position].toLowerCase()} para el ${teamName}.`;
      const r = await fetch("/api/club/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teams, need: { ...need, text } }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setResult(d);
      setStep(3);
    } catch (e) {
      toast((e as Error).message || "No se ha podido completar la configuración.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <ol className="mb-6 grid grid-cols-4 gap-2" aria-label="Pasos de la configuración">
        {STEPS.map((s, i) => (
          <li key={s.title} className={cn("flex items-center gap-2 rounded-xl border px-3 py-2 text-[12.5px] font-semibold", i === step ? "border-ink bg-ink text-white" : i < step ? "border-accent-soft-2 bg-accent-soft text-accent-ink" : "border-line bg-surface text-subtle")} aria-current={i === step ? "step" : undefined}>
            {i < step ? <Check className="size-4 shrink-0" /> : <s.icon className="size-4 shrink-0" />}
            <span className="hidden truncate sm:inline">{s.title}</span>
          </li>
        ))}
      </ol>

      <div className="rounded-3xl border border-line bg-surface p-6 shadow-card md:p-8">
        {step === 0 && (
          <div>
            <h2 className="text-[22px] font-extrabold tracking-tight">Bienvenido a ScoutUp Club</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-muted">En tres pasos verás tus primeros jugadores compatibles. Lo demás (historia, filosofía, instalaciones…) lo puedes completar más tarde desde el perfil del club.</p>
            <div className="mt-5 rounded-2xl bg-bg p-4 text-[14px]">
              <p><span className="text-muted">Club:</span> <strong>{clubName}</strong></p>
              <p className="mt-1"><span className="text-muted">Sede:</span> <strong>{city}</strong></p>
              <p className="mt-1"><span className="text-muted">Verificación:</span> <strong>{verified ? "Verificado" : "Pendiente"}</strong>{!verified && <span className="text-muted"> · puedes buscar y publicar, pero no contactar hasta que se verifique.</span>}</p>
            </div>
            <div className="mt-6 flex justify-end"><button className={btnClass("dark", "md")} onClick={() => setStep(1)}>Empezar <ArrowRight className="size-4" /></button></div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="text-[22px] font-extrabold tracking-tight">¿Qué equipos tiene el club?</h2>
            <p className="mt-2 text-[14px] text-muted">Elige los que quieras gestionar ahora. Podrás añadir más después.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {presets.map((p) => <Chip key={p.key} active={teams.includes(p.key)} onClick={() => toggle(p.key)}>{teams.includes(p.key) && <Check className="size-3.5" />}{p.name}</Chip>)}
            </div>
            <div className="mt-6 flex justify-between">
              <button className={btnClass("ghost", "md")} onClick={() => setStep(0)}>Atrás</button>
              <button className={btnClass("dark", "md")} disabled={teams.length === 0} onClick={() => { if (!teams.includes(need.team)) setNeed({ ...need, team: teams[0] }); setStep(2); }}>Continuar <ArrowRight className="size-4" /></button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-[22px] font-extrabold tracking-tight">¿Qué necesita el equipo?</h2>
            <p className="mt-2 text-[14px] text-muted">Con esto creamos tu primera oportunidad y ScoutUp busca jugadores compatibles al instante.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Equipo">
                <Select value={need.team} onChange={(e) => setNeed({ ...need, team: e.target.value })}>
                  {presets.filter((p) => teams.includes(p.key)).map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
                </Select>
              </Field>
              <Field label="Posición">
                <Select value={need.position} onChange={(e) => setNeed({ ...need, position: e.target.value as Position })}>
                  {POSITIONS.map((p) => <option key={p} value={p}>{POSITION_LABEL[p]}</option>)}
                </Select>
              </Field>
              <Field label="Nivel mínimo">
                <Select value={need.level_min} onChange={(e) => setNeed({ ...need, level_min: Number(e.target.value) })}>
                  {LEVELS.map((l) => <option key={l.rank} value={l.rank}>{l.label}</option>)}
                </Select>
              </Field>
              <Field label="Pie">
                <Select value={need.foot} onChange={(e) => setNeed({ ...need, foot: e.target.value })}>
                  <option value="indiferent">Indiferente</option><option value="dret">Diestro</option><option value="esquerre">Zurdo</option>
                </Select>
              </Field>
              <Field label="En una frase (opcional)" className="sm:col-span-2">
                <Textarea rows={2} maxLength={200} value={need.text} onChange={(e) => setNeed({ ...need, text: e.target.value })} placeholder={`Buscamos un ${POSITION_LABEL[need.position].toLowerCase()} para el ${teamName}.`} />
              </Field>
            </div>
            <div className="mt-6 flex justify-between">
              <button className={btnClass("ghost", "md")} onClick={() => setStep(1)}>Atrás</button>
              <button className={btnClass("primary", "md")} disabled={busy} onClick={finish}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Crear oportunidad y buscar</button>
            </div>
          </div>
        )}

        {step === 3 && result && (
          <div>
            <h2 className="text-[22px] font-extrabold tracking-tight">Tus primeros jugadores compatibles</h2>
            <p className="mt-2 text-[14px] text-muted">
              ScoutUp ha encontrado <strong className="text-ink">{result.preview.over70}</strong> jugadores con más del 70 % de compatibilidad ({result.preview.total} por encima del 50 %). Solo se muestran perfiles visibles para tu club.
            </p>
            {result.preview.top.length === 0 ? (
              <p className="mt-5 rounded-2xl bg-bg p-4 text-[14px] text-muted">Todavía no hay perfiles visibles que encajen. Prueba a bajar el nivel mínimo desde la oportunidad.</p>
            ) : (
              <div className="mt-5 space-y-2">
                {result.preview.top.map((t) => (
                  <Link key={t.id} href={`/club/jugadors/${t.id}?offer=${result.offerId}`} className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3 transition hover:border-line-strong hover:bg-bg">
                    <Avatar initials={t.initials} hue={t.hue} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-bold">{t.name}</p>
                      <p className="truncate text-[12.5px] text-muted">{t.pos} · {t.age} años · {t.club}</p>
                    </div>
                    <MatchRing score={t.score} size={44} stroke={4} />
                  </Link>
                ))}
              </div>
            )}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Link href="/club" className={btnClass("secondary", "md")}>Ir al panel</Link>
              <Link href={`/club/oportunitats/${result.offerId}`} className={btnClass("dark", "md")}>Ver la oportunidad <ArrowRight className="size-4" /></Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
