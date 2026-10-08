"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronDown, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { Field, Input, Select, Toggle, Button } from "@/components/client/kit";
import { POSITIONS, POSITION_LABEL, LEVELS } from "@/lib/domain";
import { PLACES, COMARQUES } from "@/lib/geo";
import { cn } from "@/components/ui";

export function SearchFilters({ offers }: { offers: { id: string; title: string }[] }) {
  const sp = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(sp.get("q") ?? "");
  useEffect(() => setQ(sp.get("q") ?? ""), [sp]);

  const setParam = (k: string, v: string | null) => {
    const p = new URLSearchParams(sp.toString());
    if (v === null || v === "" || v === "tots") p.delete(k);
    else p.set(k, v);
    p.delete("page");
    router.replace(`${path}?${p.toString()}`, { scroll: false });
  };
  const val = (k: string, d = "") => sp.get(k) ?? d;
  const active = [...sp.keys()].filter((k) => !["page", "sort", "offer"].includes(k)).length;

  const advKeys = ["foot", "hmin", "comarca", "minmin", "ver", "video", "lliure", "sec"];
  const advActive = advKeys.filter((k) => sp.has(k)).length;
  const [advOpen, setAdvOpen] = useState(advActive > 0);

  const panel = (
    <div className="space-y-4">
      <Field label="Texto libre"><Input value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => setParam("q", q)} onKeyDown={(e) => e.key === "Enter" && setParam("q", q)} placeholder="Nombre, municipio o club" /></Field>
      <Field label="Comparar con oportunidad" hint="Muestra y ordena por compatibilidad">
        <Select value={val("offer")} onChange={(e) => setParam("offer", e.target.value)}>
          <option value="">Ninguna oportunidad</option>
          {offers.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Posición">
          <Select value={val("pos")} onChange={(e) => setParam("pos", e.target.value)}>
            <option value="">Todas</option>
            {POSITIONS.map((p) => <option key={p} value={p}>{POSITION_LABEL[p]}</option>)}
          </Select>
        </Field>
        <Field label="Categoría">
          <Select value={val("cat")} onChange={(e) => setParam("cat", e.target.value)}>
            <option value="">Todas</option>
            {["Cadete", "Juvenil", "Amateur"].map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Edad mínima"><Input type="number" min={13} max={30} value={val("amin")} onChange={(e) => setParam("amin", e.target.value)} placeholder="14" /></Field>
        <Field label="Edad máxima"><Input type="number" min={13} max={30} value={val("amax")} onChange={(e) => setParam("amax", e.target.value)} placeholder="23" /></Field>
        <Field label="Equipo">
          <Select value={val("g")} onChange={(e) => setParam("g", e.target.value)}><option value="">Todos</option><option value="M">Masculino</option><option value="F">Femenino</option></Select>
        </Field>
        <Field label="Nivel mínimo">
          <Select value={val("lvl")} onChange={(e) => setParam("lvl", e.target.value)}><option value="">Cualquiera</option>{LEVELS.map((l) => <option key={l.rank} value={l.rank}>{l.label}+</option>)}</Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cerca de">
          <Select value={val("city")} onChange={(e) => setParam("city", e.target.value)}><option value="">Cualquiera</option>{PLACES.map((p) => <option key={p.city}>{p.city}</option>)}</Select>
        </Field>
        <Field label="Radio (km)">
          <Select value={val("km", "30")} onChange={(e) => setParam("km", e.target.value)} disabled={!val("city")}>{[10, 20, 30, 50, 80].map((k) => <option key={k}>{k}</option>)}</Select>
        </Field>
      </div>
      <Field label="Disponibilidad">
        <Select value={val("disp")} onChange={(e) => setParam("disp", e.target.value)}><option value="">Todas</option><option value="obert">Abierto a oportunidades</option><option value="escoltant">Escuchando propuestas</option><option value="actius">Abierto o escuchando</option></Select>
      </Field>
      <div className="rounded-xl border border-line">
        <button type="button" onClick={() => setAdvOpen((v) => !v)} aria-expanded={advOpen} className="flex w-full items-center justify-between px-3 py-2.5 text-[13.5px] font-semibold">
          <span>Filtros avanzados {advActive > 0 && <span className="ml-1 rounded-full bg-ink px-1.5 text-[11px] text-white">{advActive}</span>}</span>
          <ChevronDown className={cn("size-4 transition-transform", advOpen && "rotate-180")} />
        </button>
        {advOpen && (
          <div className="space-y-4 border-t border-line p-3">
            <div className="grid grid-cols-2 gap-3">
            <Field label="Pie">
              <Select value={val("foot")} onChange={(e) => setParam("foot", e.target.value)}><option value="">Cualquiera</option><option value="esquerre">Zurdo</option><option value="dret">Diestro</option><option value="ambdues">Ambidiestro</option></Select>
            </Field>
            <Field label="Altura mínima"><Input type="number" min={150} max={205} value={val("hmin")} onChange={(e) => setParam("hmin", e.target.value)} placeholder="cm" /></Field>
            </div>
            <Field label="Comarca">
              <Select value={val("comarca")} onChange={(e) => setParam("comarca", e.target.value)}><option value="">Todas</option>{COMARQUES.map((c) => <option key={c}>{c}</option>)}</Select>
            </Field>
            <Field label="Minutos mínimos la temporada pasada"><Input type="number" min={0} step={100} value={val("minmin")} onChange={(e) => setParam("minmin", e.target.value)} placeholder="p. ej. 1000" /></Field>
            <div className="divide-y divide-line rounded-xl border border-line px-3">
              <Toggle checked={val("ver") === "1"} onChange={(v) => setParam("ver", v ? "1" : null)} label="Solo datos verificados" />
              <Toggle checked={val("video") === "1"} onChange={(v) => setParam("video", v ? "1" : null)} label="Con vídeo" />
              <Toggle checked={val("lliure") === "1"} onChange={(v) => setParam("lliure", v ? "1" : null)} label="Sin equipo ahora mismo" />
              <Toggle checked={val("sec") === "1"} onChange={(v) => setParam("sec", v ? "1" : null)} label="Incluir posición secundaria" />
            </div>
          </div>
        )}
      </div>
      <Button variant="ghost" icon={<RotateCcw className="size-4" />} onClick={() => router.replace(path)} className="w-full">Limpiar filtros</Button>
    </div>
  );

  return (
    <>
      <div className="lg:hidden">
        <Button icon={<SlidersHorizontal className="size-4" />} onClick={() => setOpen(true)}>Filtros {active ? `(${active})` : ""}</Button>
        {open && (
          <div className="fixed inset-0 z-[80] bg-night/50" onClick={() => setOpen(false)}>
            <div className="absolute inset-y-0 right-0 w-[340px] max-w-[92vw] overflow-y-auto bg-surface p-5 animate-rise" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between"><p className="text-[16px] font-bold">Filtros</p><button onClick={() => setOpen(false)} aria-label="Cerrar"><X className="size-5" /></button></div>
              {panel}
            </div>
          </div>
        )}
      </div>
      <aside className={cn("hidden lg:block")}>
        <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-2xl border border-line bg-surface p-4 shadow-card scroll-thin">
          <p className="mb-4 flex items-center gap-2 text-[14px] font-bold"><SlidersHorizontal className="size-4" /> Filtros {active > 0 && <span className="rounded-full bg-ink px-1.5 text-[11px] text-white">{active}</span>}</p>
          {panel}
        </div>
      </aside>
    </>
  );
}

export function SortSelect({ hasOffer }: { hasOffer: boolean }) {
  const sp = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  return (
    <Select
      value={sp.get("sort") ?? (hasOffer ? "match" : "recent")}
      onChange={(e) => {
        const p = new URLSearchParams(sp.toString());
        p.set("sort", e.target.value);
        router.replace(`${path}?${p.toString()}`, { scroll: false });
      }}
      className="!h-9 !w-auto !text-[13px]"
    >
      {hasOffer && <option value="match">Compatibilidad</option>}
      <option value="recent">Actualizados recientemente</option>
      <option value="minuts">Más minutos</option>
      <option value="gols">Más goles</option>
      <option value="edat">Más jóvenes</option>
      <option value="nom">Nombre</option>
    </Select>
  );
}
