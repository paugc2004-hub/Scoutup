"use client";
import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

type Toast = { id: number; text: string; tone: "ok" | "error" | "info"; sub?: string };
const Ctx = createContext<(text: string, tone?: Toast["tone"], sub?: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast["tone"] = "ok", sub?: string) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x.slice(-3), { id, text, tone, sub }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), tone === "error" ? 6000 : 3800);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:px-6" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-night-line bg-night px-4 py-3 text-white shadow-pop animate-rise">
            {t.tone === "ok" ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-accent" /> : t.tone === "error" ? <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[#ff8a8f]" /> : <Info className="mt-0.5 size-5 shrink-0 text-[#7dd3fc]" />}
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold leading-snug">{t.text}</p>
              {t.sub && <p className="mt-0.5 text-[12.5px] text-night-text">{t.sub}</p>}
            </div>
            <button onClick={() => setItems((x) => x.filter((y) => y.id !== t.id))} className="text-night-muted hover:text-white" aria-label="Cerrar">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}
