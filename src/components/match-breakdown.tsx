import { CheckCircle2, CircleDashed, MinusCircle } from "lucide-react";
import type { MatchResult } from "@/lib/matching";
import { MatchRing, matchColor, cn } from "@/components/ui";

export function MatchBreakdown({ match, title, subtitle, dense }: { match: MatchResult; title?: string; subtitle?: string; dense?: boolean }) {
  const ok = match.factors.filter((f) => f.status === "ok").length;
  return (
    <div>
      <div className="flex items-center gap-4">
        <MatchRing score={match.score} size={dense ? 60 : 76} stroke={dense ? 6 : 7} />
        <div className="min-w-0">
          <p className="text-[15px] font-extrabold tracking-tight">{title ?? `${match.score}% de compatibilitat`}</p>
          <p className="text-[12.5px] text-muted">{subtitle ?? `Compleix ${ok} de 7 factors · càlcul determinista i explicable`}</p>
        </div>
      </div>
      <div className={cn("mt-4", dense ? "space-y-2.5" : "space-y-3")}>
        {match.factors.map((f) => {
          const pct = (f.score / f.weight) * 100;
          return (
            <div key={f.key}>
              <div className="flex items-center gap-2 text-[13px]">
                {f.status === "ok" ? <CheckCircle2 className="size-4 shrink-0 text-accent-600" /> : f.status === "partial" ? <CircleDashed className="size-4 shrink-0 text-warn" /> : <MinusCircle className="size-4 shrink-0 text-subtle" />}
                <span className="font-semibold">{f.label}</span>
                <span className="ml-auto font-bold tabular">{Number.isInteger(f.score) ? f.score : f.score.toFixed(1)}<span className="font-medium text-subtle">/{f.weight}</span></span>
              </div>
              <div className="ml-6 mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunken">
                <div className="bar-anim h-full rounded-full" style={{ width: `${Math.max(3, pct)}%`, background: matchColor(pct) }} />
              </div>
              {!dense && <p className="ml-6 mt-1 text-[12px] leading-snug text-muted">{f.detail}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
