"use client";
import { useMemo, useState } from "react";
import { Building2, UserRound, Loader2, Lock } from "lucide-react";
import { Field, Input, Select } from "@/components/client/kit";
import { btnClass, cn } from "@/components/ui";
import { PLACES } from "@/lib/geo";
import { POSITIONS, POSITION_LABEL } from "@/lib/domain";

export function RegisterForm({ initialType }: { initialType: "player" | "club" }) {
  const [type, setType] = useState<"player" | "club">(initialType);
  const [f, setF] = useState<Record<string, string>>({ gender: "M", position: "DC", city: "Sabadell" });
  const [accept, setAccept] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const minor = useMemo(() => {
    if (!f.birth_date) return false;
    const b = new Date(f.birth_date);
    const now = new Date();
    let a = now.getFullYear() - b.getFullYear();
    if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) a--;
    return a < 18;
  }, [f.birth_date]);
  const cities = [...PLACES].sort((a, b) => a.city.localeCompare(b.city, "es"));

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-line bg-surface p-1.5">
        {([["player", "Soy jugador/a", UserRound], ["club", "Soy un club", Building2]] as const).map(([k, l, Icon]) => (
          <button key={k} type="button" onClick={() => setType(k)} className={cn("flex h-11 items-center justify-center gap-2 rounded-xl text-[13.5px] font-semibold transition", type === k ? "bg-ink text-white shadow" : "text-muted hover:bg-sunken")}>
            <Icon className="size-4" /> {l}
          </button>
        ))}
      </div>
      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          const r = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, type, accept }) });
          const d = await r.json().catch(() => ({}));
          if (!r.ok) {
            setError(d.error ?? "No se ha podido crear la cuenta.");
            setBusy(false);
            return;
          }
          window.location.href = d.redirect;
        }}
      >
        {type === "player" ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre"><Input required value={f.first_name ?? ""} onChange={set("first_name")} /></Field>
              <Field label="Apellidos"><Input required value={f.last_name ?? ""} onChange={set("last_name")} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha de nacimiento"><Input type="date" required value={f.birth_date ?? ""} onChange={set("birth_date")} max="2014-12-31" min="1990-01-01" /></Field>
              <Field label="Equipo">
                <Select value={f.gender} onChange={set("gender")}><option value="M">Masculino</option><option value="F">Femenino</option></Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Municipio"><Select value={f.city} onChange={set("city")}>{cities.map((p) => <option key={p.city}>{p.city}</option>)}</Select></Field>
              <Field label="Posición principal"><Select value={f.position} onChange={set("position")}>{POSITIONS.map((p) => <option key={p} value={p}>{POSITION_LABEL[p]}</option>)}</Select></Field>
            </div>
            {minor && (
              <div className="rounded-2xl border border-[#ddd6fe] bg-violet-soft p-4">
                <p className="flex items-center gap-2 text-[13.5px] font-bold text-violet"><Lock className="size-4" /> Eres menor de edad</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">Tu perfil no será visible para ningún club hasta que tu padre, madre o tutor legal dé su consentimiento. Ningún club podrá escribirte sin su autorización.</p>
                <Field label="Correo del tutor legal" className="mt-3"><Input type="email" required value={f.guardian_email ?? ""} onChange={set("guardian_email")} placeholder="tutor@exemple.cat" /></Field>
              </div>
            )}
          </>
        ) : (
          <>
            <Field label="Nombre del club"><Input required value={f.club_name ?? ""} onChange={set("club_name")} placeholder="CF Ejemplo" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Municipio de la sede"><Select value={f.city} onChange={set("city")}>{cities.map((p) => <option key={p.city}>{p.city}</option>)}</Select></Field>
              <Field label="Persona responsable"><Input required value={f.name ?? ""} onChange={set("name")} /></Field>
            </div>
            <p className="rounded-xl bg-warn-soft px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-2">
              Los clubes nuevos quedan <strong>pendientes de verificación</strong>: pueden explorar la plataforma y publicar oportunidades, pero no pueden contactar jugadores hasta que se verifiquen (en la demo, la verificación no se hace).
            </p>
          </>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Correo electrónico"><Input type="email" required value={f.email ?? ""} onChange={set("email")} /></Field>
          <Field label="Contraseña"><Input type="password" required minLength={4} value={f.password ?? ""} onChange={set("password")} /></Field>
        </div>
        <label className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-muted">
          <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5 size-4 accent-[#00c768]" />
          Entiendo que es una demo: la cuenta se guarda solo en esta instalación y los datos se pueden borrar al restaurar la demo.
        </label>
        {error && <p className="rounded-xl border border-[#fbd0d0] bg-danger-soft px-3 py-2 text-[13px] font-medium text-danger">{error}</p>}
        <button type="submit" disabled={busy || !accept} className={cn(btnClass("primary", "lg"), "w-full")}>
          {busy && <Loader2 className="size-4 animate-spin" />} {type === "player" ? "Crear mi perfil" : "Crear la cuenta del club"}
        </button>
      </form>
    </div>
  );
}
