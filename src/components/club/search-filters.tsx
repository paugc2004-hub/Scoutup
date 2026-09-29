"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { RotateCcw, SlidersHorizontal, X } from "lucide-react";
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

  const panel = (
    <div className="space-y-4">
      <Field label="Text lliure"><Input value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => setParam("q", q)} onKeyDown={(e) => e.key === "Enter" && setParam("q", q)} placeholder="Nom, municipi o club" /></Field>
      <Field label="Comparar amb oferta" hint="Mostra i ordena per compatibilitat">
        <Select value={val("offer")} onChange={(e) => setParam("offer", e.target.value)}>
          <option value="">Cap oferta</option>
          {offers.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Posició">
          <Select value={val("pos")} onChange={(e) => setParam("pos", e.target.value)}>
            <option value="">Totes</option>
            {POSITIONS.map((p) => <option key={p} value={p}>{POSITION_LABEL[p]}</option>)}
          </Select>
        </Field>
        <Field label="Categoria">
          <Select value={val("cat")} onChange={(e) => setParam("cat", e.target.value)}>
            <option value="">Totes</option>
            {["Cadet", "Juvenil", "Amateur"].map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Edat mínima"><Input type="number" min={13} max={30} value={val("amin")} onChange={(e) => setParam("amin", e.target.value)} placeholder="14" /></Field>
        <Field label="Edat màxima"><Input type="number" min={13} max={30} value={val("amax")} onChange={(e) => setParam("amax", e.target.value)} placeholder="23" /></Field>
        <Field label="Equip">
          <Select value={val("g")} onChange={(e) => setParam("g", e.target.value)}><option value="">Tots</option><option value="M">Masculí</option><option value="F">Femení</option></Select>
        </Field>
        <Field label="Peu">
          <Select value={val("foot")} onChange={(e) => setParam("foot", e.target.value)}><option value="">Qualsevol</option><option value="esquerre">Esquerre</option><option value="dret">Dret</option><option value="ambdues">Ambidextre</option></Select>
        </Field>
        <Field label="Nivell mínim">
          <Select value={val("lvl")} onChange={(e) => setParam("lvl", e.target.value)}><option value="">Qualsevol</option>{LEVELS.map((l) => <option key={l.rank} value={l.rank}>{l.label}+</option>)}</Select>
        </Field>
        <Field label="Alçada mínima"><Input type="number" min={150} max={205} value={val("hmin")} onChange={(e) => setParam("hmin", e.target.value)} placeholder="cm" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="A prop de">
          <Select value={val("city")} onChange={(e) => setParam("city", e.target.value)}><option value="">Qualsevol</option>{PLACES.map((p) => <option key={p.city}>{p.city}</option>)}</Select>
        </Field>
        <Field label="Radi (km)">
          <Select value={val("km", "30")} onChange={(e) => setParam("km", e.target.value)} disabled={!val("city")}>{[10, 20, 30, 50, 80].map((k) => <option key={k}>{k}</option>)}</Select>
        </Field>
      </div>
      <Field label="Comarca">
        <Select value={val("comarca")} onChange={(e) => setParam("comarca", e.target.value)}><option value="">Totes</option>{COMARQUES.map((c) => <option key={c}>{c}</option>)}</Select>
      </Field>
      <Field label="Disponibilitat">
        <Select value={val("disp")} onChange={(e) => setParam("disp", e.target.value)}><option value="">Totes</option><option value="obert">Obert a ofertes</option><option value="escoltant">Escoltant propostes</option><option value="actius">Obert o escoltant</option></Select>
      </Field>
      <Field label="Minuts mínims la temporada passada"><Input type="number" min={0} step={100} value={val("minmin")} onChange={(e) => setParam("minmin", e.target.value)} placeholder="p. ex. 1000" /></Field>
      <div className="divide-y divide-line rounded-xl border border-line px-3">
        <Toggle checked={val("ver") === "1"} onChange={(v) => setParam("ver", v ? "1" : null)} label="Només dades verificades" />
        <Toggle checked={val("video") === "1"} onChange={(v) => setParam("video", v ? "1" : null)} label="Amb vídeo" />
        <Toggle checked={val("lliure") === "1"} onChange={(v) => setParam("lliure", v ? "1" : null)} label="Sense equip ara mateix" />
        <Toggle checked={val("sec") === "1"} onChange={(v) => setParam("sec", v ? "1" : null)} label="Incloure posició secundària" />
      </div>
      <Button variant="ghost" icon={<RotateCcw className="size-4" />} onClick={() => router.replace(path)} className="w-full">Netejar filtres</Button>
    </div>
  );

  return (
    <>
      <div className="lg:hidden">
        <Button icon={<SlidersHorizontal className="size-4" />} onClick={() => setOpen(true)}>Filtres {active ? `(${active})` : ""}</Button>
        {open && (
          <div className="fixed inset-0 z-[80] bg-night/50" onClick={() => setOpen(false)}>
            <div className="absolute inset-y-0 right-0 w-[340px] max-w-[92vw] overflow-y-auto bg-surface p-5 animate-rise" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between"><p className="text-[16px] font-bold">Filtres</p><button onClick={() => setOpen(false)} aria-label="Tancar"><X className="size-5" /></button></div>
              {panel}
            </div>
          </div>
        )}
      </div>
      <aside className={cn("hidden lg:block")}>
        <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-2xl border border-line bg-surface p-4 shadow-card scroll-thin">
          <p className="mb-4 flex items-center gap-2 text-[14px] font-bold"><SlidersHorizontal className="size-4" /> Filtres {active > 0 && <span className="rounded-full bg-ink px-1.5 text-[11px] text-white">{active}</span>}</p>
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
      {hasOffer && <option value="match">Compatibilitat</option>}
      <option value="recent">Actualitzats recentment</option>
      <option value="minuts">Més minuts</option>
      <option value="gols">Més gols</option>
      <option value="edat">Més joves</option>
      <option value="nom">Nom</option>
    </Select>
  );
}
