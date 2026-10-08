import { Play, Trophy, Film, Info } from "lucide-react";
import type { SeasonStats, CareerRow, VideoRow, AchievementRow } from "@/server/services/player-detail";
import { VerificationBadge, EmptyState, cn, Bar } from "@/components/ui";
import { ATTR_LABEL } from "@/lib/domain";
import type { Attrs, AttrKey } from "@/lib/domain";
import { fmtDate } from "@/lib/time";

export function StatsTable({ stats, hidden }: { stats: SeasonStats[]; hidden?: boolean }) {
  if (hidden) return <EmptyState icon={<Info className="size-5" />} title="Estadísticas ocultas" text="El jugador ha decidido no mostrar las estadísticas a los clubes." />;
  if (!stats.length) return <EmptyState title="Sin estadísticas" text="Todavía no hay datos de ninguna temporada." />;
  const cols: [keyof SeasonStats, string][] = [["callups", "Conv."], ["matches", "PJ"], ["starts", "Tit."], ["minutes", "Min."], ["goals", "Goles"], ["assists", "Assist."], ["yellow", "TA"], ["red", "TR"]];
  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="w-full min-w-[640px] text-[13px]">
        <thead>
          <tr className="border-b border-line text-left text-[11.5px] font-bold uppercase tracking-wider text-subtle">
            <th className="py-2 pr-3">Temporada</th>
            {cols.map(([, l]) => <th key={l} className="px-2 py-2 text-right">{l}</th>)}
            <th className="py-2 pl-3 text-right">Fuente</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => (
            <tr key={s.season_id} className="border-b border-line last:border-0">
              <td className="py-2.5 pr-3">
                <p className="font-bold">{s.label}</p>
                <p className="text-[11.5px] text-muted">{s.team_name ?? "—"}</p>
              </td>
              {cols.map(([k]) => <td key={k} className="px-2 py-2.5 text-right font-semibold tabular">{k === "minutes" ? (s[k] as number).toLocaleString("es-ES") : String(s[k])}</td>)}
              <td className="py-2.5 pl-3 text-right"><VerificationBadge status={s.verification} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11.5px] text-subtle">Conv.: convocatorias · PJ: partidos jugados · Tit.: titularidades · TA/TR: tarjetas amarillas/rojas. Datos de demostración.</p>
    </div>
  );
}

export function CareerList({ career }: { career: CareerRow[] }) {
  if (!career.length) return <EmptyState title="Sin trayectoria" />;
  return (
    <ol className="relative space-y-4 border-l border-line pl-5">
      {career.map((c, i) => (
        <li key={c.id} className="relative">
          <span className={cn("absolute -left-[26px] top-1 size-3 rounded-full border-2 border-surface", i === 0 ? "bg-accent-600" : "bg-line-strong")} />
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[14px] font-bold">{c.club_name} <span className="font-medium text-muted">· {c.team_name}</span></p>
              <p className="text-[12.5px] text-muted">{c.season_label} · {c.category} · {c.division}{c.role ? ` · ${c.role}` : ""}</p>
            </div>
            <VerificationBadge status={c.verification} />
          </div>
        </li>
      ))}
    </ol>
  );
}

export function VideoGrid({ videos, hidden }: { videos: VideoRow[]; hidden?: boolean }) {
  if (hidden) return <EmptyState icon={<Film className="size-5" />} title="Vídeos privados" text="El jugador solo comparte los vídeos con clubes verificados o con quien tiene contacto." />;
  if (!videos.length) return <EmptyState icon={<Film className="size-5" />} title="Todavía no hay vídeos" />;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {videos.map((v, i) => (
        <div key={v.id} className="group overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="relative aspect-video overflow-hidden" style={{ background: `linear-gradient(135deg, hsl(${140 + i * 40} 30% 18%), hsl(${170 + i * 40} 35% 28%))` }}>
            <div className="pitch-lines absolute inset-0 opacity-60" />
            <div className="absolute inset-x-6 top-1/2 h-px bg-white/15" />
            <div className="absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid size-12 place-items-center rounded-full bg-white/90 text-night shadow-pop transition group-hover:scale-105"><Play className="ml-0.5 size-5 fill-night" /></span>
            </span>
            <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-bold text-white tabular">{Math.floor(v.duration_s / 60)}:{String(v.duration_s % 60).padStart(2, "0")}</span>
            <span className="absolute left-2 top-2 rounded-md bg-black/50 px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-white/80">Vídeo de demostración</span>
          </div>
          <div className="p-3">
            <p className="truncate text-[13.5px] font-semibold">{v.title}</p>
            <p className="text-[12px] text-muted">{fmtDate(v.recorded_at, { short: true, year: true })} · {v.views} visualizaciones</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Achievements({ items, experiences }: { items: AchievementRow[]; experiences: { id: string; title: string; year: number | null }[] }) {
  if (!items.length && !experiences.length) return <p className="text-[13px] text-subtle">Sin logros registrados.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((a) => (
        <span key={a.id} className="inline-flex items-center gap-1.5 rounded-full border border-[#f5e3a3] bg-[#fffbeb] px-2.5 py-1 text-[12.5px] font-semibold text-[#8a6100]"><Trophy className="size-3.5" /> {a.title}</span>
      ))}
      {experiences.map((e) => (
        <span key={e.id} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-sunken px-2.5 py-1 text-[12.5px] font-semibold text-ink-2">{e.title}{e.year ? ` · ${e.year}` : ""}</span>
      ))}
    </div>
  );
}

export function AttrBars({ attrs, position }: { attrs: Attrs; position: string }) {
  const keys = (Object.keys(attrs) as AttrKey[]).filter((k) => position === "POR" || (k !== "reflexos" && k !== "sortides"));
  return (
    <div className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
      {keys.map((k) => (
        <div key={k} className="grid grid-cols-[110px_1fr_22px] items-center gap-3 text-[12.5px]">
          <span className="text-muted">{ATTR_LABEL[k]}</span>
          <Bar value={attrs[k] ?? 0} max={10} color={(attrs[k] ?? 0) >= 8 ? "#00b85f" : (attrs[k] ?? 0) >= 6 ? "#34c47c" : "#c7c9ce"} />
          <span className="text-right font-bold tabular">{attrs[k]}</span>
        </div>
      ))}
    </div>
  );
}

import { POSITION_PITCH } from "@/lib/domain";
import type { Position } from "@/lib/domain";

/** Mini camp vertical amb la posició principal (sòlida) i les secundàries (contorn). */
export function PositionPitch({ primary, secondary, size = 150 }: { primary: Position; secondary: Position[]; size?: number }) {
  const w = size;
  const h = size * 1.35;
  return (
    <svg viewBox="0 0 100 135" width={w} height={h} role="img" aria-label="Posición en el campo" className="shrink-0">
      <rect x="1" y="1" width="98" height="133" rx="6" fill="#0f5132" />
      <g stroke="rgba(255,255,255,.35)" strokeWidth="0.8" fill="none">
        <rect x="6" y="6" width="88" height="123" rx="2" />
        <line x1="6" y1="67.5" x2="94" y2="67.5" />
        <circle cx="50" cy="67.5" r="11" />
        <rect x="27" y="6" width="46" height="18" />
        <rect x="27" y="111" width="46" height="18" />
      </g>
      {secondary.map((p) => {
        const c = POSITION_PITCH[p];
        return <circle key={p} cx={c.x} cy={c.y * 1.35} r="5.5" fill="none" stroke="#9ff5c8" strokeWidth="1.6" strokeDasharray="2 1.5" />;
      })}
      {(() => {
        const c = POSITION_PITCH[primary];
        return (
          <g>
            <circle cx={c.x} cy={c.y * 1.35} r="9" fill="#00e87a" opacity=".25" />
            <circle cx={c.x} cy={c.y * 1.35} r="6" fill="#00e87a" stroke="#fff" strokeWidth="1.2" />
          </g>
        );
      })()}
    </svg>
  );
}
