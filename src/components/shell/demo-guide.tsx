"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Compass, ChevronLeft, ChevronRight, X, ArrowRight, Loader2 } from "lucide-react";
import { DEMO_FLOWS } from "@/lib/demo-flows";
import type { DemoAccount } from "@/lib/demo-flows";
import { cn } from "@/components/ui";

const KEY = "su_guide";
const ROLE_LABEL: Record<DemoAccount, string> = { director: "club (dirección)", coordinator: "coordinación", coach: "entrenador", clubB: "Club B", player: "jugador", guardian: "tutor" };

type State = { flow: string; step: number } | null;
function read(): State {
  try {
    const v = localStorage.getItem(KEY);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}
function write(s: State) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {}
}

export async function goAs(role: string, href: string) {
  const r = await fetch("/api/auth/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
  if (r.ok) window.location.href = href;
}

export function startGuide(flow: string) {
  write({ flow, step: 0 });
}

/** `role` és el compte de demo actual (vegeu demoAccountOf), no el rol del RBAC. */
export function DemoGuide({ role }: { role: DemoAccount | null }) {
  const [state, setState] = useState<State>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const path = usePathname();
  useEffect(() => {
    setState(read());
    setMounted(true);
  }, [path]);
  if (!mounted) return null;
  const flow = state ? DEMO_FLOWS.find((f) => f.id === state.flow) : null;

  const set = (s: State) => {
    write(s);
    setState(s);
  };
  const go = async (i: number) => {
    if (!flow) return;
    const st = flow.steps[i];
    set({ flow: flow.id, step: i });
    if (st.role !== role) {
      setBusy(true);
      await goAs(st.role, st.href);
      return;
    }
    router.push(st.href);
  };

  if (!flow || !state) {
    return (
      <div className="fixed bottom-20 left-4 z-40 lg:bottom-5 lg:left-[264px]">
        {open ? (
          <div className="w-[300px] rounded-2xl border border-night-line bg-night p-3 text-white shadow-pop animate-pop">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-[13px] font-bold">Recorridos guiados</p>
              <button onClick={() => setOpen(false)} className="text-night-muted hover:text-white" aria-label="Cerrar"><X className="size-4" /></button>
            </div>
            {DEMO_FLOWS.map((f) => (
              <button key={f.id} onClick={() => { set({ flow: f.id, step: 0 }); setOpen(false); }} className="mb-1 block w-full rounded-xl px-3 py-2.5 text-left transition hover:bg-night-2">
                <span className="block text-[13px] font-semibold leading-snug">{f.title}</span>
                <span className="mt-0.5 block text-[11.5px] text-night-muted">{f.steps.length} pasos · {f.minutes}</span>
              </button>
            ))}
          </div>
        ) : (
          <button onClick={() => setOpen(true)} className="flex h-10 items-center gap-2 rounded-full border border-night-line bg-night px-4 text-[13px] font-semibold text-white shadow-pop transition hover:bg-night-2">
            <Compass className="size-4 text-accent" /> Guía de la demo
          </button>
        )}
      </div>
    );
  }

  const st = flow.steps[state.step];
  const needsSwitch = st.role !== role;
  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 sm:right-auto lg:bottom-5 lg:left-[264px]">
      <div className="w-full rounded-2xl border border-night-line bg-night p-4 text-white shadow-pop animate-rise sm:w-[340px]">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-accent">{flow.title}</p>
          <button onClick={() => set(null)} className="shrink-0 text-night-muted hover:text-white" aria-label="Salir de la guía"><X className="size-4" /></button>
        </div>
        <div className="mb-3 flex gap-1">
          {flow.steps.map((_, i) => (
            <span key={i} className={cn("h-1 flex-1 rounded-full", i <= state.step ? "bg-accent" : "bg-night-3")} />
          ))}
        </div>
        <p className="text-[14px] font-bold">
          {state.step + 1}. {st.title}
        </p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-night-text">{st.text}</p>
        <div className="mt-3 flex items-center gap-2">
          <button onClick={() => state.step > 0 && go(state.step - 1)} disabled={state.step === 0} className="grid size-8 place-items-center rounded-lg border border-night-line text-night-text hover:bg-night-2 disabled:opacity-40" aria-label="Paso anterior">
            <ChevronLeft className="size-4" />
          </button>
          <button onClick={() => go(state.step)} className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent px-3 text-[12.5px] font-bold text-night hover:bg-accent-600">
            {busy ? <Loader2 className="size-4 animate-spin" /> : needsSwitch ? <>Entrar como {ROLE_LABEL[st.role]} <ArrowRight className="size-3.5" /></> : <>Ir <ArrowRight className="size-3.5" /></>}
          </button>
          <button onClick={() => (state.step < flow.steps.length - 1 ? go(state.step + 1) : set(null))} className="flex h-8 items-center gap-1 rounded-lg border border-night-line px-2.5 text-[12.5px] font-semibold text-night-text hover:bg-night-2">
            {state.step < flow.steps.length - 1 ? <>Siguiente <ChevronRight className="size-4" /></> : "Terminar"}
          </button>
        </div>
      </div>
    </div>
  );
}
