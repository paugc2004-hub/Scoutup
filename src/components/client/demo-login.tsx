"use client";
import { useState } from "react";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { btnClass, cn } from "@/components/ui";
import { useToast } from "@/components/client/toast";
import type { DemoAccount } from "@/lib/demo-flows";

export function DemoLoginButton({ role, children, variant = "primary", size = "lg", className, icon, next, guide }: { role: DemoAccount; children: ReactNode; variant?: "primary" | "secondary" | "dark" | "ghost"; size?: "sm" | "md" | "lg"; className?: string; icon?: ReactNode; next?: string; guide?: string }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const go = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/auth/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (guide) {
        try { localStorage.setItem("su_guide", JSON.stringify({ flow: guide, step: 0 })); } catch {}
      }
      window.location.href = next ?? d.redirect;
    } catch (e) {
      toast((e as Error).message || "No se ha podido entrar.", "error");
      setBusy(false);
    }
  };
  return (
    <button onClick={go} disabled={busy} className={cn(btnClass(variant, size), className)}>
      {busy ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

export function ResetDemoButton({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState(false);
  const toast = useToast();
  if (ask)
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <span className="text-[13px] text-muted">Se perderán los cambios hechos durante la demo.</span>
        <button className={btnClass("secondary", "sm")} onClick={() => setAsk(false)}>Cancelar</button>
        <button
          className={btnClass("dark", "sm")}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const r = await fetch("/api/demo/reset", { method: "POST" });
            if (r.ok) {
              toast("Datos de demo restaurados", "ok");
              try { localStorage.removeItem("su_guide"); } catch {}
              setTimeout(() => (window.location.href = "/demo"), 600);
            } else {
              toast("No se han podido restaurar los datos.", "error");
              setBusy(false);
            }
          }}
        >
          {busy && <Loader2 className="size-3.5 animate-spin" />} Sí, restaurar
        </button>
      </div>
    );
  return (
    <button className={cn(btnClass("secondary", "sm"), className)} onClick={() => setAsk(true)}>
      Restaurar datos de demo
    </button>
  );
}
