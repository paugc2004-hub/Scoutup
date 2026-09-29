/**
 * Dates i formats (zona horària Europe/Madrid, català). Sense àlies: també el fa servir el seed.
 * Servidor i client formategen igual per evitar diferències d'hidratació.
 */
export const TZ = "Europe/Madrid";

function parts(d: Date) {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const v = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return { y: v("year"), m: v("month"), d: v("day"), h: v("hour") % 24, min: v("minute") };
}

/** Minuts de diferència entre Madrid i UTC per a una data. */
function offsetMinutes(d: Date): number {
  const p = parts(d);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min);
  return Math.round((asUtc - d.getTime()) / 60000 / 15) * 15;
}

/** Data a Madrid: `dayOffset` dies des d'avui, a l'hora local indicada. */
export function madridAt(now: Date, dayOffset: number, hh: number, mm = 0): Date {
  const p = parts(now);
  const guess = new Date(Date.UTC(p.y, p.m - 1, p.d + dayOffset, hh, mm));
  const off = offsetMinutes(guess);
  return new Date(guess.getTime() - off * 60000);
}

/** Clau AAAA-MM-DD del dia a Madrid. */
export function dayKey(d: Date | string): string {
  const p = parts(typeof d === "string" ? new Date(d) : d);
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

/** Dia de la setmana a Madrid (0 = dilluns). */
export function weekdayMon0(d: Date): number {
  const w = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short" }).format(d);
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(w);
}

const MONTHS = ["gener", "febrer", "març", "abril", "maig", "juny", "juliol", "agost", "setembre", "octubre", "novembre", "desembre"];
const MONTHS_SHORT = ["gen.", "febr.", "març", "abr.", "maig", "juny", "jul.", "ag.", "set.", "oct.", "nov.", "des."];
const DAYS = ["dilluns", "dimarts", "dimecres", "dijous", "divendres", "dissabte", "diumenge"];
const DAYS_SHORT = ["dl.", "dt.", "dc.", "dj.", "dv.", "ds.", "dg."];

export function monthName(m1: number): string {
  return MONTHS[m1 - 1];
}
export function dayName(mon0: number, short = false): string {
  return (short ? DAYS_SHORT : DAYS)[mon0];
}

function de(month: string) {
  return /^[aeiouàèéíòóú]/i.test(month) ? `d'${month}` : `de ${month}`;
}

export function fmtDate(v: string | Date, opts: { weekday?: boolean; year?: boolean; short?: boolean } = {}): string {
  const d = typeof v === "string" ? new Date(v) : v;
  const p = parts(d);
  const m = opts.short ? MONTHS_SHORT[p.m - 1] : MONTHS[p.m - 1];
  let s = opts.short ? `${p.d} ${m}` : `${p.d} ${de(m)}`;
  if (opts.year) s += ` ${opts.short ? "" : "de "}${p.y}`.replace("  ", " ");
  if (opts.weekday) s = `${DAYS[weekdayMon0(d)]}, ${s}`;
  return s;
}
export function fmtTime(v: string | Date): string {
  const p = parts(typeof v === "string" ? new Date(v) : v);
  return `${String(p.h).padStart(2, "0")}:${String(p.min).padStart(2, "0")}`;
}
export function fmtDateTime(v: string | Date): string {
  return `${fmtDate(v, { short: true })} · ${fmtTime(v)}`;
}

/** "fa 5 min", "fa 3 h", "ahir", "fa 4 dies", "demà a les 18:30", "dijous"... */
export function fmtRelative(v: string | Date, now: Date = new Date()): string {
  const d = typeof v === "string" ? new Date(v) : v;
  const diff = (now.getTime() - d.getTime()) / 1000;
  const dayDiff = Math.round((Date.parse(dayKey(now)) - Date.parse(dayKey(d))) / 86400000);
  if (diff >= 0) {
    if (diff < 60) return "ara mateix";
    if (diff < 3600) return `fa ${Math.floor(diff / 60)} min`;
    if (dayDiff === 0) return `fa ${Math.floor(diff / 3600)} h`;
    if (dayDiff === 1) return "ahir";
    if (dayDiff < 7) return `fa ${dayDiff} dies`;
    if (dayDiff < 30) return `fa ${Math.floor(dayDiff / 7)} ${Math.floor(dayDiff / 7) === 1 ? "setmana" : "setmanes"}`;
    if (dayDiff < 365) return `fa ${Math.floor(dayDiff / 30)} ${Math.floor(dayDiff / 30) === 1 ? "mes" : "mesos"}`;
    return fmtDate(d, { year: true, short: true });
  }
  if (dayDiff === 0) return `avui a les ${fmtTime(d)}`;
  if (dayDiff === -1) return `demà a les ${fmtTime(d)}`;
  if (dayDiff > -7) return `${DAYS[weekdayMon0(d)]} a les ${fmtTime(d)}`;
  return fmtDate(d, { short: true });
}
