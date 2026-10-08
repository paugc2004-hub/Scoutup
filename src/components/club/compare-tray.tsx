"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Columns3, X, Plus, Check } from "lucide-react";
import { cn } from "@/components/ui";

const KEY = "su_compare";
type Item = { id: string; name: string; initials: string };

function read(): Item[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
function write(items: Item[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {}
  window.dispatchEvent(new Event("su-compare"));
}

export function useCompare() {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    const sync = () => setItems(read());
    sync();
    window.addEventListener("su-compare", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("su-compare", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const toggle = (it: Item) => {
    const cur = read();
    if (cur.some((x) => x.id === it.id)) write(cur.filter((x) => x.id !== it.id));
    else write([...cur, it].slice(-3));
  };
  return { items, toggle, has: (id: string) => items.some((x) => x.id === id), clear: () => write([]) };
}

export function CompareToggle({ id, name, initials, className, compact }: { id: string; name: string; initials: string; className?: string; compact?: boolean }) {
  const { has, toggle } = useCompare();
  const on = has(id);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle({ id, name, initials });
      }}
      title={on ? "Quitar del comparador" : "Añadir al comparador (máx. 3)"}
      className={cn("inline-flex items-center gap-1.5 rounded-lg border text-[12px] font-semibold transition", compact ? "size-8 justify-center" : "h-8 px-2.5", on ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-2 hover:border-line-strong", className)}
    >
      {on ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
      {!compact && (on ? "En el comparador" : "Comparar")}
    </button>
  );
}

export function CompareTray() {
  const { items, toggle, clear } = useCompare();
  const path = usePathname();
  if (!items.length || path.startsWith("/club/comparar")) return null;
  return (
    <div className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 animate-rise">
      <div className="flex items-center gap-2 rounded-2xl border border-night-line bg-night p-2 pl-3 text-white shadow-pop">
        <Columns3 className="size-4 text-accent" />
        <div className="flex -space-x-1.5">
          {items.map((i) => (
            <button key={i.id} onClick={() => toggle(i)} title={`Quitar a ${i.name}`} className="group relative grid size-8 place-items-center rounded-full border-2 border-night bg-night-3 text-[11px] font-bold">
              <span className="group-hover:hidden">{i.initials}</span>
              <X className="hidden size-3.5 group-hover:block" />
            </button>
          ))}
        </div>
        <span className="hidden text-[12.5px] text-night-text sm:inline">{items.length}/3 seleccionats</span>
        <Link href={`/club/comparar?ids=${items.map((i) => i.id).join(",")}`} className={cn("ml-1 inline-flex h-8 items-center rounded-xl px-3 text-[12.5px] font-bold", items.length >= 2 ? "bg-accent text-night" : "bg-night-3 text-night-muted pointer-events-none")}>
          Comparar
        </Link>
        <button onClick={clear} className="grid size-8 place-items-center rounded-lg text-night-muted hover:bg-night-2 hover:text-white" aria-label="Vaciar comparador">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
