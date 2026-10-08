/**
 * Logging estructurat (JSON per línia) amb redacció de camps sensibles.
 * Punt únic on connectar una eina d'observabilitat externa (Sentry, Datadog, OpenTelemetry…) en el futur.
 */
type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

const SENSITIVE = /pass(word)?|token|secret|cookie|authorization|session|hash/i;

function redact(v: unknown, depth = 0): unknown {
  if (depth > 4 || v === null || typeof v !== "object") return v;
  if (v instanceof Error) return { name: v.name, message: v.message, stack: process.env.NODE_ENV === "production" ? undefined : v.stack };
  if (Array.isArray(v)) return v.slice(0, 20).map((x) => redact(x, depth + 1));
  const out: Fields = {};
  for (const [k, x] of Object.entries(v as Fields)) out[k] = SENSITIVE.test(k) ? "[redacted]" : redact(x, depth + 1);
  return out;
}

function emit(level: Level, msg: string, fields?: Fields) {
  if (process.env.SCOUTUP_LOG === "silent") return;
  if (level === "debug" && process.env.SCOUTUP_LOG !== "debug") return;
  const line = JSON.stringify({ t: new Date().toISOString(), level, msg, ...(fields ? (redact(fields) as Fields) : {}) });
  if (level === "error" || level === "warn") console.error(line);
  else console.log(line);
}

export const log = {
  debug: (msg: string, f?: Fields) => emit("debug", msg, f),
  info: (msg: string, f?: Fields) => emit("info", msg, f),
  warn: (msg: string, f?: Fields) => emit("warn", msg, f),
  error: (msg: string, f?: Fields) => emit("error", msg, f),
};
