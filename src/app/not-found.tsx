import Link from "next/link";
import { Compass } from "lucide-react";

export const metadata = { title: "Pàgina no trobada" };

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-5">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-sunken text-subtle"><Compass className="size-6" /></span>
        <p className="mt-5 text-[12px] font-bold uppercase tracking-[0.14em] text-accent-ink">Error 404</p>
        <h1 className="mt-2 text-[26px] font-extrabold tracking-tight">No hem trobat aquesta pàgina</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">Pot ser que l&apos;enllaç sigui antic o que no tinguis accés a aquest contingut.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/club" className="inline-flex h-10 items-center rounded-xl bg-ink px-4 text-[14px] font-semibold text-white hover:bg-ink-2">Anar al tauler</Link>
          <Link href="/" className="inline-flex h-10 items-center rounded-xl border border-line bg-surface px-4 text-[14px] font-semibold hover:border-line-strong">Inici</Link>
        </div>
      </div>
    </main>
  );
}
