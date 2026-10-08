"use client";
import Link from "next/link";
import { ErrorState } from "@/components/ui";

/** Error dins del software del club: la navegació lateral continua disponible. */
export default function ClubError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="pt-6">
      <ErrorState
        title="No hemos podido cargar esta pantalla"
        text={`El resto del software del club sigue funcionando.${error.digest ? ` Código: ${error.digest}.` : ""}`}
        action={
          <div className="flex gap-2">
            <button onClick={reset} className="inline-flex h-9 items-center rounded-xl bg-ink px-3.5 text-[13px] font-semibold text-white">Reintentar</button>
            <Link href="/club" className="inline-flex h-9 items-center rounded-xl border border-line bg-surface px-3.5 text-[13px] font-semibold">Panel</Link>
          </div>
        }
      />
    </div>
  );
}
