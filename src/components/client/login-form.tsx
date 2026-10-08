"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Field, Input } from "@/components/client/kit";
import { btnClass, cn } from "@/components/ui";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) {
          setError(d.error ?? "No se ha podido iniciar sesión.");
          setBusy(false);
          return;
        }
        window.location.href = d.redirect;
      }}
    >
      <Field label="Correo electrónico">
        <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nom@exemple.cat" />
      </Field>
      <Field label="Contraseña">
        <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••" />
      </Field>
      {error && <p className="rounded-xl border border-[#fbd0d0] bg-danger-soft px-3 py-2 text-[13px] font-medium text-danger">{error}</p>}
      <button type="submit" disabled={busy} className={cn(btnClass("dark", "lg"), "w-full")}>
        {busy && <Loader2 className="size-4 animate-spin" />} Entrar
      </button>
    </form>
  );
}
