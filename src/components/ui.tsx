/**
 * Primitives visuals compartides (sense estat; es poden fer servir a servidor i client).
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { ShieldCheck, Clock3, PenLine, RefreshCw, Lock } from "lucide-react";
import { AVAILABILITY_LABEL, STAGE_COLOR, STAGE_LABEL, VERIFICATION_HINT, VERIFICATION_LABEL } from "@/lib/domain";
import type { Stage } from "@/lib/domain";

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Card({ children, className, pad = true, as: As = "div" }: { children: ReactNode; className?: string; pad?: boolean; as?: "div" | "section" | "article" }) {
  const custom = className ?? "";
  return <As className={cn("rounded-2xl border shadow-card", !/(^|\s)bg-/.test(custom) && "bg-surface", !/(^|\s)border-(?!0|t|b|l|r|x|y|dashed)/.test(custom) && "border-line", pad && "p-5", className)}>{children}</As>;
}

export function CardHeader({ title, subtitle, action, icon }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && <div className="mt-0.5 text-subtle">{icon}</div>}
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold tracking-tight text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: ReactNode; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between animate-rise">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.12em] text-accent-ink">{eyebrow}</p>}
        <h1 className="text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-ink md:text-[30px]">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

type Tone = "neutral" | "accent" | "warn" | "danger" | "info" | "violet" | "dark";
const TONES: Record<Tone, string> = {
  neutral: "bg-sunken text-ink-2 border-line",
  accent: "bg-accent-soft text-accent-ink border-accent-soft-2",
  warn: "bg-warn-soft text-warn border-[#fde68a]",
  danger: "bg-danger-soft text-danger border-[#fbd0d0]",
  info: "bg-info-soft text-info border-[#bae6fd]",
  violet: "bg-violet-soft text-violet border-[#ddd6fe]",
  dark: "bg-ink text-white border-ink",
};
export function Badge({ children, tone = "neutral", className, title }: { children: ReactNode; tone?: Tone; className?: string; title?: string }) {
  return <span title={title} className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11.5px] font-semibold leading-4", TONES[tone], className)}>{children}</span>;
}

export function Dot({ color, className }: { color: string; className?: string }) {
  return <span className={cn("inline-block size-2 shrink-0 rounded-full", className)} style={{ background: color }} />;
}

export function Avatar({ initials, hue, size = 40, className, square }: { initials: string; hue: number; size?: number; className?: string; square?: boolean }) {
  return (
    <div
      className={cn("grid shrink-0 place-items-center font-bold text-white select-none", square ? "rounded-xl" : "rounded-full", className)}
      style={{ width: size, height: size, fontSize: size * 0.36, background: `linear-gradient(145deg, hsl(${hue} 42% 38%), hsl(${(hue + 28) % 360} 48% 24%))` }}
      aria-hidden
    >
      {initials}
    </div>
  );
}

export function ClubCrest({ initials, color, size = 36, className }: { initials: string; color: string; size?: number; className?: string }) {
  return (
    <div className={cn("grid shrink-0 place-items-center rounded-[10px] font-extrabold text-white", className)} style={{ width: size, height: size, fontSize: size * 0.34, background: color, boxShadow: "inset 0 -2px 0 rgba(0,0,0,.18)" }} aria-hidden>
      {initials}
    </div>
  );
}

export function matchColor(score: number) {
  return score >= 80 ? "#00b85f" : score >= 60 ? "#e0a100" : "#9aa0ab";
}

export function MatchRing({ score, size = 52, stroke = 5, label = true, className }: { score: number; size?: number; stroke?: number; label?: boolean; className?: string }) {
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  const off = len * (1 - Math.max(0, Math.min(100, score)) / 100);
  const col = matchColor(score);
  return (
    <div className={cn("relative grid shrink-0 place-items-center", className)} style={{ width: size, height: size }} title={`${score}% de compatibilitat`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ececE7" strokeWidth={stroke} />
        <circle className="ring-anim" cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={off} style={{ ["--ring-len" as string]: `${len}` }} />
      </svg>
      {label && (
        <span className="absolute inset-0 grid place-items-center font-extrabold tabular text-ink" style={{ fontSize: size * 0.27 }}>
          {score}
          <span className="sr-only">%</span>
        </span>
      )}
    </div>
  );
}

export function MatchPill({ score }: { score: number }) {
  const col = matchColor(score);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-0.5 text-[12px] font-bold tabular" style={{ color: col === "#9aa0ab" ? "#5b616e" : col }}>
      <span className="size-1.5 rounded-full" style={{ background: col }} />
      {score}%
    </span>
  );
}

export function Bar({ value, max = 100, color = "#00b85f", className, h = 6 }: { value: number; max?: number; color?: string; className?: string; h?: number }) {
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-sunken", className)} style={{ height: h }}>
      <div className="bar-anim h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, (value / max) * 100))}%`, background: color }} />
    </div>
  );
}

export function Stat({ label, value, hint, icon, tone, href }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: "accent" | "warn" | "info" | "violet"; href?: string }) {
  const ring = tone === "accent" ? "bg-accent-soft text-accent-ink" : tone === "warn" ? "bg-warn-soft text-warn" : tone === "info" ? "bg-info-soft text-info" : tone === "violet" ? "bg-violet-soft text-violet" : "bg-sunken text-ink-2";
  const inner = (
    <div className="flex h-full flex-col justify-between gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card transition hover:border-line-strong">
      <div className="flex items-center justify-between">
        <p className="text-[12.5px] font-semibold text-muted">{label}</p>
        {icon && <span className={cn("grid size-8 place-items-center rounded-lg", ring)}>{icon}</span>}
      </div>
      <div>
        <p className="text-[28px] font-extrabold leading-none tracking-tight tabular text-ink">{value}</p>
        {hint && <p className="mt-1.5 text-[12px] text-muted">{hint}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner;
}

export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-surface/60 px-6 py-12 text-center">
      {icon && <div className="mb-3 grid size-11 place-items-center rounded-xl bg-sunken text-subtle">{icon}</div>}
      <p className="text-[15px] font-bold text-ink">{title}</p>
      {text && <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function VerificationBadge({ status, compact }: { status: string; compact?: boolean }) {
  const map: Record<string, { tone: Tone; icon: ReactNode }> = {
    verified: { tone: "accent", icon: <ShieldCheck className="size-3" /> },
    pending: { tone: "warn", icon: <Clock3 className="size-3" /> },
    self: { tone: "neutral", icon: <PenLine className="size-3" /> },
    updated: { tone: "info", icon: <RefreshCw className="size-3" /> },
  };
  const m = map[status] ?? map.self;
  return (
    <Badge tone={m.tone} title={VERIFICATION_HINT[status]}>
      {m.icon}
      {!compact && VERIFICATION_LABEL[status]}
    </Badge>
  );
}

export function AvailabilityBadge({ value }: { value: string }) {
  const tone: Tone = value === "obert" ? "accent" : value === "escoltant" ? "info" : "neutral";
  return (
    <Badge tone={tone}>
      <span className={cn("size-1.5 rounded-full", value === "obert" ? "bg-accent-600 animate-pulse-dot" : value === "escoltant" ? "bg-info" : "bg-subtle")} />
      {AVAILABILITY_LABEL[value] ?? value}
    </Badge>
  );
}

export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-surface px-2 py-0.5 text-[11.5px] font-semibold text-ink-2">
      <Dot color={STAGE_COLOR[stage]} />
      {STAGE_LABEL[stage]}
    </span>
  );
}

export function MinorBadge() {
  return (
    <Badge tone="violet" title="Menor d'edat: perfil protegit i contacte amb autorització del tutor legal.">
      <Lock className="size-3" />
      Menor protegit
    </Badge>
  );
}

export function DemoTag({ className }: { className?: string }) {
  return <span className={cn("inline-flex items-center rounded-md bg-warn-soft px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-warn", className)}>Demo</span>;
}

export function KV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-2 last:border-0">
      <dt className="text-[13px] text-muted">{k}</dt>
      <dd className="text-right text-[13.5px] font-semibold text-ink">{v}</dd>
    </div>
  );
}

/** Radar hexagonal (SVG) per a una o diverses sèries. */
export function Radar({ series, size = 220, labels = true }: { series: { name: string; color: string; values: { key: string; label: string; value: number }[] }[]; size?: number; labels?: boolean }) {
  const axes = series[0]?.values ?? [];
  const n = axes.length;
  const pad = labels ? Math.max(34, size * 0.15) : 6;
  const r = size / 2 - pad;
  const cx = size / 2;
  const cy = size / 2;
  const pt = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(a) * r * (v / 10), cy + Math.sin(a) * r * (v / 10)];
  };
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size }} role="img" aria-label="Gràfic de radar d'atributs">
      {[2.5, 5, 7.5, 10].map((lv) => (
        <polygon key={lv} points={axes.map((_, i) => pt(i, lv).join(",")).join(" ")} fill={lv === 10 ? "#fafaf8" : "none"} stroke="#e4e4de" strokeWidth={1} />
      ))}
      {axes.map((_, i) => {
        const [x, y] = pt(i, 10);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#ececE6" />;
      })}
      {series.map((s, si) => (
        <polygon key={s.name} points={s.values.map((a, i) => pt(i, a.value).join(",")).join(" ")} fill={s.color} fillOpacity={series.length > 1 ? 0.12 : 0.18} stroke={s.color} strokeWidth={2} strokeLinejoin="round" style={{ animation: `pop .5s ${si * 0.08}s both` }} />
      ))}
      {series.length === 1 && series[0].values.map((a, i) => {
        const [x, y] = pt(i, a.value);
        return <circle key={a.key} cx={x} cy={y} r={3} fill={series[0].color} />;
      })}
      {labels && axes.map((a, i) => {
        const [x, y] = pt(i, 11.9);
        return (
          <text key={a.key} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={11} fontWeight={600} fill="#5b616e">
            {a.label}
          </text>
        );
      })}
    </svg>
  );
}

export function Section({ title, children, action, className }: { title: string; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.1em] text-subtle">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function LinkButton({ href, children, variant = "secondary", size = "md", className, icon }: { href: string; children: ReactNode; variant?: "primary" | "secondary" | "ghost" | "dark"; size?: "sm" | "md"; className?: string; icon?: ReactNode }) {
  return (
    <Link href={href} className={cn(btnClass(variant, size), className)}>
      {icon}
      {children}
    </Link>
  );
}

export function btnClass(variant: "primary" | "secondary" | "ghost" | "dark" | "danger" = "secondary", size: "sm" | "md" | "lg" = "md") {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition active:scale-[.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-glow whitespace-nowrap";
  const sz = size === "sm" ? "h-8 px-3 text-[12.5px]" : size === "lg" ? "h-12 px-5 text-[15px]" : "h-10 px-4 text-[13.5px]";
  const v = {
    primary: "bg-accent text-night hover:bg-accent-600 shadow-[inset_0_-2px_0_rgba(0,0,0,.12)]",
    secondary: "border border-line bg-surface text-ink hover:border-line-strong hover:bg-[#fbfbf9]",
    ghost: "text-ink-2 hover:bg-sunken",
    dark: "bg-ink text-white hover:bg-ink-2",
    danger: "border border-[#f5c2c2] bg-surface text-danger hover:bg-danger-soft",
  }[variant];
  return cn(base, sz, v);
}
