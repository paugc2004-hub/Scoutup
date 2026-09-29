"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowUp } from "lucide-react";
import { cn } from "@/components/ui";

export const EXAMPLES = [
  "Necessito un central esquerrà sub-19 de la zona del Vallès amb bon joc aeri",
  "Extrem dret ràpid i desequilibrant, juvenil, a menys de 25 km",
  "Porter alt per a l'amateur amb bons reflexos",
  "Migcampista femenina amb visió de joc a prop de Sabadell",
];

export function IntelligenceBox({ initial = "", compact, autoFocus }: { initial?: string; compact?: boolean; autoFocus?: boolean }) {
  const [q, setQ] = useState(initial);
  const router = useRouter();
  const submit = (text: string) => {
    if (!text.trim()) return;
    router.push(`/club/intelligence?q=${encodeURIComponent(text.trim())}`);
  };
  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(q);
        }}
        className={cn("group relative rounded-2xl border border-line bg-surface shadow-card transition focus-within:border-accent-600 focus-within:shadow-glow", compact ? "" : "p-1")}
      >
        <Sparkles className="pointer-events-none absolute left-4 top-4 size-5 text-accent-ink" />
        <textarea
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(q);
            }
          }}
          rows={compact ? 2 : 3}
          placeholder="Descriu el jugador que necessites… p. ex. «central esquerrà sub-19 de la zona del Vallès amb bon joc aeri»"
          className="w-full resize-none rounded-2xl bg-transparent py-3.5 pl-12 pr-14 text-[14.5px] leading-relaxed placeholder:text-subtle focus:outline-none"
        />
        <button type="submit" className="absolute bottom-3 right-3 grid size-9 place-items-center rounded-xl bg-accent text-night transition hover:bg-accent-600 disabled:opacity-40" disabled={!q.trim()} aria-label="Cercar">
          <ArrowUp className="size-4" strokeWidth={2.5} />
        </button>
      </form>
      {!compact && (
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button key={ex} onClick={() => { setQ(ex); submit(ex); }} className="rounded-full border border-line bg-surface px-3 py-1.5 text-left text-[12.5px] font-medium text-ink-2 transition hover:border-line-strong hover:bg-sunken">
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
