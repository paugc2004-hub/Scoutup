"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ShieldCheck, MapPin, Search, Megaphone } from "lucide-react";
import { Badge, ClubCrest, EmptyState } from "@/components/ui";
import { Chip, Select } from "@/components/client/kit";

export type ClubLite = { id: string; name: string; initials: string; color: string; city: string; comarca: string; verified: boolean; km: number; offers: number; teams: { name: string; category: string; gender: string; level: string }[]; favorite: boolean };

export function ClubBrowser({ clubs, comarques }: { clubs: ClubLite[]; comarques: string[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [gender, setGender] = useState("");
  const [comarca, setComarca] = useState("");
  const [onlyOffers, setOnlyOffers] = useState(false);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [view, setView] = useState<"clubs" | "equips">("clubs");
  const list = useMemo(() => clubs.filter((c) =>
    (!q || `${c.name} ${c.city}`.toLowerCase().includes(q.toLowerCase())) &&
    (!comarca || c.comarca === comarca) &&
    (!onlyOffers || c.offers > 0) &&
    (!onlyVerified || c.verified) &&
    c.teams.some((t) => (!cat || t.category === cat) && (!gender || t.gender === gender)),
  ).sort((a, b) => a.km - b.km), [clubs, q, cat, gender, comarca, onlyOffers, onlyVerified]);
  const teams = list.flatMap((c) => c.teams.filter((t) => (!cat || t.category === cat) && (!gender || t.gender === gender)).map((t) => ({ ...t, club: c })));
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre o municipio" className="h-9 w-56 rounded-xl border border-line bg-surface pl-9 pr-3 text-[13px] focus:border-accent-600 focus:outline-none" /></div>
        <Select value={cat} onChange={(e) => setCat(e.target.value)} className="!h-9 !w-auto !text-[13px]"><option value="">Todas las categorías</option>{["Infantil", "Cadete", "Juvenil", "Amateur"].map((c) => <option key={c}>{c}</option>)}</Select>
        <Select value={gender} onChange={(e) => setGender(e.target.value)} className="!h-9 !w-auto !text-[13px]"><option value="">Masculino y femenino</option><option value="M">Masculino</option><option value="F">Femenino</option></Select>
        <Select value={comarca} onChange={(e) => setComarca(e.target.value)} className="!h-9 !w-auto !text-[13px]"><option value="">Todas las comarcas</option>{comarques.map((c) => <option key={c}>{c}</option>)}</Select>
        <Chip active={onlyOffers} onClick={() => setOnlyOffers((x) => !x)}>Con oportunidades</Chip>
        <Chip active={onlyVerified} onClick={() => setOnlyVerified((x) => !x)}>Verificados</Chip>
        <div className="ml-auto flex rounded-xl border border-line bg-surface p-0.5">
          {(["clubs", "equips"] as const).map((v) => <button key={v} onClick={() => setView(v)} className={`h-8 rounded-lg px-3 text-[12.5px] font-semibold capitalize ${view === v ? "bg-ink text-white" : "text-muted"}`}>{v === "clubs" ? "clubes" : "equipos"}</button>)}
        </div>
      </div>
      {list.length === 0 ? <EmptyState title="Ningún club con estos filtros" /> : view === "clubs" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => (
            <Link key={c.id} href={`/jugador/clubs/${c.id}`} className="group flex flex-col rounded-2xl border border-line bg-surface p-4 shadow-card transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-pop">
              <div className="flex items-center gap-3">
                <ClubCrest initials={c.initials} color={c.color} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate text-[15px] font-bold group-hover:underline">{c.name}{c.verified ? <ShieldCheck className="size-4 shrink-0 text-accent-ink" /> : null}</p>
                  <p className="flex items-center gap-1 text-[12.5px] text-muted"><MapPin className="size-3.5" />{c.city} · {Math.round(c.km)} km</p>
                </div>
                {c.favorite && <Badge tone="warn">Guardado</Badge>}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">{c.teams.map((t) => <span key={t.name} className="rounded-md bg-sunken px-2 py-0.5 text-[11.5px] font-semibold text-ink-2">{t.name}</span>)}</div>
              <div className="mt-auto flex items-center justify-between pt-4 text-[12px]">
                {c.offers > 0 ? <span className="inline-flex items-center gap-1 font-semibold text-accent-ink"><Megaphone className="size-3.5" /> {c.offers} {c.offers === 1 ? "oportunidad abierta" : "oportunidades abiertas"}</span> : <span className="text-subtle">Sin oportunidades ahora</span>}
                {!c.verified && <Badge tone="warn">Pendiente de verificación</Badge>}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <table className="w-full text-[13px]">
            <thead><tr className="border-b border-line bg-bg text-left text-[11.5px] font-bold uppercase tracking-wider text-subtle"><th className="px-4 py-2.5">Equipo</th><th className="px-4 py-2.5">Categoría</th><th className="hidden px-4 py-2.5 md:table-cell">Nivel (demo)</th><th className="px-4 py-2.5 text-right">Distancia</th></tr></thead>
            <tbody>
              {teams.map((t, i) => (
                <tr key={i} className="border-b border-line last:border-0 hover:bg-bg">
                  <td className="px-4 py-2.5"><Link href={`/jugador/clubs/${t.club.id}`} className="flex items-center gap-2 font-semibold hover:underline"><ClubCrest initials={t.club.initials} color={t.club.color} size={24} />{t.club.name} · {t.name}</Link></td>
                  <td className="px-4 py-2.5">{t.category}{t.gender === "F" ? " femení" : ""}</td>
                  <td className="hidden px-4 py-2.5 md:table-cell">{t.level}</td>
                  <td className="px-4 py-2.5 text-right tabular">{Math.round(t.club.km)} km</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
