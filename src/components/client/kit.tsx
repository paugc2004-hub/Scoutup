"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { useToast } from "@/components/client/toast";
import { btnClass, cn } from "@/components/ui";

/** Crida a l'API interna amb gestió d'errors i refresc de la pàgina. */
export function useApi() {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [, startTransition] = useTransition();
  const call = useCallback(
    async <T = Record<string, unknown>>(url: string, init: { method?: string; body?: unknown; ok?: string; okSub?: string; refresh?: boolean } = {}): Promise<T | null> => {
      setPending(true);
      try {
        const res = await fetch(url, { method: init.method ?? "POST", headers: { "Content-Type": "application/json" }, body: init.body === undefined ? undefined : JSON.stringify(init.body) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast(data.error ?? "No s'ha pogut completar l'acció.", "error");
          return null;
        }
        if (init.ok) toast(init.ok, "ok", init.okSub);
        if (init.refresh !== false) startTransition(() => router.refresh());
        return data as T;
      } catch {
        toast("Error de connexió amb el servidor de la demo.", "error");
        return null;
      } finally {
        setPending(false);
      }
    },
    [router, toast],
  );
  return { call, pending };
}

export function Button({ children, variant = "secondary", size = "md", loading, className, icon, ...rest }: { children?: ReactNode; variant?: "primary" | "secondary" | "ghost" | "dark" | "danger"; size?: "sm" | "md" | "lg"; loading?: boolean; icon?: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} disabled={rest.disabled || loading} className={cn(btnClass(variant, size), className)}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

/** Botó que executa una acció d'API. */
export function ActionButton({ url, method, body, ok, okSub, children, variant, size, icon, className, confirm, onDone }: { url: string; method?: string; body?: unknown; ok?: string; okSub?: string; children?: ReactNode; variant?: "primary" | "secondary" | "ghost" | "dark" | "danger"; size?: "sm" | "md" | "lg"; icon?: ReactNode; className?: string; confirm?: string; onDone?: (d: Record<string, unknown>) => void }) {
  const { call, pending } = useApi();
  const [asking, setAsking] = useState(false);
  const run = async () => {
    const d = await call(url, { method, body, ok, okSub });
    if (d && onDone) onDone(d);
  };
  if (confirm) {
    return (
      <>
        <Button variant={variant} size={size} icon={icon} className={className} loading={pending} onClick={() => setAsking(true)}>
          {children}
        </Button>
        <Modal open={asking} onClose={() => setAsking(false)} title="Confirmar acció" size="sm">
          <p className="text-[14px] text-muted">{confirm}</p>
          <div className="mt-5 flex justify-end gap-2">
            <Button onClick={() => setAsking(false)}>Cancel·lar</Button>
            <Button variant={variant === "danger" ? "danger" : "dark"} loading={pending} onClick={async () => { await run(); setAsking(false); }}>
              Confirmar
            </Button>
          </div>
        </Modal>
      </>
    );
  }
  return (
    <Button variant={variant} size={size} icon={icon} className={className} loading={pending} onClick={run}>
      {children}
    </Button>
  );
}

export function Modal({ open, onClose, title, subtitle, children, size = "md", footer }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; size?: "sm" | "md" | "lg" | "xl"; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    setTimeout(() => ref.current?.querySelector<HTMLElement>("input,textarea,select,button")?.focus(), 30);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  const w = size === "sm" ? "max-w-md" : size === "lg" ? "max-w-2xl" : size === "xl" ? "max-w-4xl" : "max-w-lg";
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-night/50 p-0 backdrop-blur-[2px] animate-fade-in sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true">
      <div ref={ref} className={cn("flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-line bg-surface shadow-pop animate-pop sm:rounded-3xl", w)}>
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            <h2 className="text-[17px] font-extrabold tracking-tight">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-lg text-subtle hover:bg-sunken hover:text-ink" aria-label="Tancar">
            <X className="size-4" />
          </button>
        </div>
        <div className="scroll-thin overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-subtle">{hint}</span>}
    </label>
  );
}

const inputBase = "w-full rounded-xl border border-line bg-surface px-3 text-[14px] text-ink placeholder:text-subtle transition focus:border-accent-600 focus:outline-none focus:shadow-glow disabled:bg-sunken";
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputBase, "h-10", props.className)} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(inputBase, "h-10 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%238a8f9c%22 stroke-width=%222.5%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[right_12px_center] bg-no-repeat pr-8", props.className)} />;
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputBase, "min-h-24 py-2.5 leading-relaxed", props.className)} />;
}

export function Chip({ active, onClick, children, className }: { active?: boolean; onClick?: () => void; children: ReactNode; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-semibold transition", active ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-2 hover:border-line-strong", className)}>
      {children}
    </button>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 py-2.5 text-left">
      <span>
        <span className="block text-[14px] font-semibold text-ink">{label}</span>
        {hint && <span className="block text-[12.5px] text-muted">{hint}</span>}
      </span>
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-accent-600" : "bg-line-strong")}>
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </span>
    </button>
  );
}

export function Tabs({ tabs, value, onChange }: { tabs: { key: string; label: ReactNode; count?: number }[]; value: string; onChange: (k: string) => void }) {
  return (
    <div className="scroll-thin -mx-1 flex gap-1 overflow-x-auto px-1 pb-px">
      {tabs.map((t) => (
        <button key={t.key} onClick={() => onChange(t.key)} className={cn("relative flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition", value === t.key ? "bg-ink text-white" : "text-muted hover:bg-sunken hover:text-ink")}>
          {t.label}
          {t.count !== undefined && <span className={cn("rounded-full px-1.5 text-[11px] tabular", value === t.key ? "bg-white/15" : "bg-sunken")}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
