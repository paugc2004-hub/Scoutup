import Link from "next/link";
import { ShieldCheck, Ban, Flag, Lock, UserCheck } from "lucide-react";
import { requirePlayer } from "@/server/auth/session";
import { all, get } from "@/server/db/client";
import { playerRow, privacyOf } from "@/server/services/players";
import { Badge, Card, CardHeader, ClubCrest, PageHeader, VerificationBadge } from "@/components/ui";
import { PrivacyEditor } from "@/components/player/privacy-editor";
import { BlockButton } from "@/components/player/block-button";
import { isMinor } from "@/lib/domain";
import { fmtRelative } from "@/lib/time";

export const metadata = { title: "Privacitat i seguretat" };

export default async function PrivacyPage() {
  const u = await requirePlayer();
  const p = playerRow(u.player_id)!;
  const minor = isMinor(p.birth_date);
  const blocks = all<{ club_id: string; name: string; initials: string; color_primary: string; created_at: string }>("SELECT b.club_id, c.name, c.initials, c.color_primary, b.created_at FROM blocks b JOIN clubs c ON c.id = b.club_id WHERE b.player_id = ?", u.player_id);
  const reports = all<{ id: string; reason: string; status: string; created_at: string }>("SELECT * FROM reports WHERE reporter_user_id = ? ORDER BY created_at DESC", u.id);
  const guardian = p.guardian_user_id ? get<{ name: string }>("SELECT name FROM users WHERE id = ?", p.guardian_user_id) : null;
  return (
    <div>
      <PageHeader eyebrow="Tu decideixes" title="Privacitat i seguretat" subtitle="Controla qui et veu, què veu i qui et pot contactar. Els canvis s'apliquen a l'instant a totes les cerques dels clubs." />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card><PrivacyEditor initial={privacyOf(p)} minor={minor} /></Card>
        <div className="space-y-5">
          <Card>
            <CardHeader title="Verificació del perfil" icon={<ShieldCheck className="size-4" />} />
            <VerificationBadge status={p.verification} />
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">A la demo, «Verificat» vol dir que el club emissor ha confirmat les dades (simulat). No és una verificació oficial de cap federació.</p>
          </Card>
          {minor && (
            <Card className="border-[#ddd6fe] bg-violet-soft/50">
              <CardHeader title="Tutor legal" icon={<UserCheck className="size-4 text-violet" />} />
              <p className="text-[13px]">{guardian ? <><strong>{guardian.name}</strong> gestiona el consentiment del teu perfil.</> : <>Tutor: {p.guardian_email}</>}</p>
              <p className="mt-2 text-[12.5px] text-muted">Consentiment: {p.guardian_consent ? <Badge tone="accent">Actiu</Badge> : <Badge tone="warn">Pendent</Badge>} · Els contactes de clubs passen primer pel tutor.</p>
            </Card>
          )}
          <Card>
            <CardHeader title="Clubs bloquejats" icon={<Ban className="size-4" />} />
            {blocks.length === 0 ? <p className="text-[13px] text-subtle">No has bloquejat cap club.</p> : (
              <div className="space-y-2">
                {blocks.map((b) => (
                  <div key={b.club_id} className="flex items-center gap-3"><ClubCrest initials={b.initials} color={b.color_primary} size={30} /><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold">{b.name}</p><p className="text-[11.5px] text-subtle">{fmtRelative(b.created_at)}</p></div><BlockButton clubId={b.club_id} blocked /></div>
                ))}
              </div>
            )}
          </Card>
          <Card>
            <CardHeader title="Denúncies" icon={<Flag className="size-4" />} />
            {reports.length === 0 ? <p className="text-[13px] text-subtle">No has fet cap denúncia.</p> : reports.map((r) => <div key={r.id} className="flex items-center justify-between py-1.5 text-[13px]"><span>{r.reason}</span><Badge tone={r.status === "revisada" ? "accent" : "warn"}>{r.status === "revisada" ? "Revisada" : "Rebuda"}</Badge></div>)}
            <p className="mt-3 flex gap-2 text-[12px] text-muted"><Lock className="mt-0.5 size-3.5 shrink-0" /> Si un club et demana dades fora de ScoutUp o et fa sentir incòmode, denuncia'l des del seu perfil o des de la conversa. <Link href="/jugador/clubs" className="font-semibold text-accent-ink">Clubs</Link></p>
          </Card>
        </div>
      </div>
    </div>
  );
}
