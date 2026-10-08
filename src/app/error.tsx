"use client";
import { useEffect } from "react";
import Link from "next/link";

/** Error inesperat en una pàgina: missatge humà, sense detalls tècnics. El servidor ja l'ha registrat. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // només l'identificador, mai el missatge intern
    if (error.digest) console.warn("Error de página", error.digest);
  }, [error]);
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-5">
      <div role="alert" className="max-w-md text-center">
        <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-danger">Algo no ha ido bien</p>
        <h1 className="mt-2 text-[26px] font-extrabold tracking-tight">Ha ocurrido un error</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">No hemos podido mostrar esta página. Vuelve a intentarlo; si sigue pasando, avisa al equipo de ScoutUp{error.digest ? <> con el código <code className="rounded bg-sunken px-1">{error.digest}</code></> : null}.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={reset} className="inline-flex h-10 items-center rounded-xl bg-ink px-4 text-[14px] font-semibold text-white hover:bg-ink-2">Reintentar</button>
          <Link href="/club" className="inline-flex h-10 items-center rounded-xl border border-line bg-surface px-4 text-[14px] font-semibold hover:border-line-strong">Ir al panel</Link>
        </div>
      </div>
    </main>
  );
}
