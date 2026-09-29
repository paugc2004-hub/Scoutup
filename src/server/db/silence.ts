/** Silencia l'avís "SQLite is an experimental feature" de node:sqlite (la resta d'avisos es mantenen). */
const g = globalThis as unknown as { __suSilenced?: boolean };
if (!g.__suSilenced) {
  g.__suSilenced = true;
  const orig = process.emitWarning.bind(process);
  process.emitWarning = ((warning: string | Error, ...rest: unknown[]) => {
    const msg = typeof warning === "string" ? warning : warning?.message;
    if (msg && msg.includes("SQLite")) return;
    return (orig as (...a: unknown[]) => void)(warning, ...rest);
  }) as typeof process.emitWarning;
}
export {};
