import { ShieldCheck, Lock, MessagesSquare, Eye, UserRound } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { all, get } from "@/server/db/client";
import { playerCtx, playerRow, presentPlayer, privacyOf } from "@/server/services/players";
import { conversationsFor, messagesOf, requestsForPlayer } from "@/server/services/messages";
import { Avatar, Badge, Card, CardHeader, ClubCrest, EmptyState, PageHeader, cn } from "@/components/ui";
import { ConsentToggle, GuardianDecision, GuardianPrivacy, RevokeButton } from "@/components/player/guardian-actions";
import { CONTACT_STATUS_LABEL } from "@/lib/domain";
import { fmtDateTime, fmtRelative } from "@/lib/time";

export const metadata = { title: "Panell del tutor" };

export default async function TutorPage() {
  const u = await requireUser(["guardian"]);
  const row = playerRow(u.player_id!)!;
  const p = presentPlayer(row, playerCtx(), { full: true });
  const priv = privacyOf(row);
  const reqs = requestsForPlayer(row.id);
  const pending = reqs.filter((r) => r.status === "pendent_tutor");
  const convs = conversationsFor(u);
  const blocked = new Set(all<{ club_id: string }>("SELECT club_id FROM blocks WHERE player_id = ?", row.id).map((b) => b.club_id));
  const views = get<{ n: number }>("SELECT COUNT(*) AS n FROM profile_views WHERE player_id = ? AND created_at > ?", row.id, new Date(Date.now() - 30 * 86400000).toISOString())?.n ?? 0;
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Tutor legal" title={`Hola, ${u.name.split(" ")[0]}`} subtitle={`Gestiones el perfil de ${p.first_name}, que és menor d'edat. Cap club no pot contactar-lo sense la teva autorització.`} />
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <Avatar initials={p.initials} hue={p.hue} size={64} />
          <div className="min-w-0 flex-1">
            <p className="text-[18px] font-extrabold">{p.name}</p>
            <p className="text-[13px] text-muted">{p.age} anys · {p.position_label} · {p.club_name}{p.team_name ? ` · ${p.team_name}` : ""}</p>
            <div className="mt-2 flex flex-wrap gap-2"><Badge tone="violet"><Lock className="size-3" /> Menor protegit</Badge><Badge tone={row.guardian_consent ? "accent" : "warn"}>{row.guardian_consent ? "Consentiment actiu" : "Sense consentiment"}</Badge><Badge><Eye className="size-3" /> {views} visites de clubs (30 dies)</Badge></div>
          </div>
        </div>
        <div className="mt-4 border-t border-line pt-2"><ConsentToggle consent={!!row.guardian_consent} /></div>
      </Card>

      <Card className={cn(pending.length > 0 && "border-violet/30")}>
        <CardHeader title="Sol·licituds pendents d'autorització" subtitle="Els clubs no poden escriure fins que ho autoritzis" icon={<ShieldCheck className="size-4 text-violet" />} />
        {pending.length === 0 ? <p className="text-[13px] text-subtle">No hi ha cap sol·licitud pendent.</p> : pending.map((r) => (
          <div key={r.id} className="rounded-2xl border border-line p-4">
            <div className="flex items-start gap-3">
              <ClubCrest initials={r.club_initials} color={r.club_color} size={42} />
              <div className="min-w-0 flex-1">
                <p className="text-[14.5px] font-bold">{r.club_name} {r.club_verified ? <Badge tone="accent" className="ml-1"><ShieldCheck className="size-3" /> Verificat</Badge> : null}</p>
                <p className="text-[12.5px] text-muted">{r.from_name}{r.team_name ? ` · ${r.team_name}` : ""} · {r.club_city} · {fmtRelative(r.created_at)}</p>
                <p className="mt-2 rounded-xl bg-bg p-3 text-[13.5px] leading-relaxed">{r.message}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3"><p className="text-[12px] text-subtle">Si autoritzes, s'obrirà una conversa i en podràs llegir el contingut.</p><GuardianDecision id={r.id} /></div>
          </div>
        ))}
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader title="Clubs autoritzats i converses" subtitle="Lectura completa; pots revocar l'autorització en qualsevol moment" icon={<MessagesSquare className="size-4" />} />
          {convs.length === 0 ? <EmptyState title="Cap conversa" text={`${p.first_name} encara no parla amb cap club.`} /> : convs.map((c) => {
            const msgs = messagesOf(c.id).slice(-4);
            const isBlocked = blocked.has(c.club_id);
            return (
              <div key={c.id} className="mb-3 rounded-2xl border border-line p-4">
                <div className="flex items-center gap-3"><ClubCrest initials={c.club_initials} color={c.club_color} size={34} /><div className="min-w-0 flex-1"><p className="text-[14px] font-bold">{c.club_name}</p><p className="text-[12px] text-muted">{c.subject} · {fmtRelative(c.last_message_at)}</p></div>{isBlocked ? <Badge tone="danger">Revocat</Badge> : <RevokeButton clubId={c.club_id} clubName={c.club_name} />}</div>
                <div className="mt-3 space-y-1.5">{msgs.map((m) => <p key={m.id} className={cn("rounded-xl px-3 py-2 text-[12.5px]", m.sender_side === "club" ? "bg-bg" : m.sender_side === "system" ? "italic text-muted" : "bg-accent-soft/60")}><span className="font-semibold">{m.sender_side === "club" ? c.club_name : m.sender_side === "system" ? "Sistema" : p.first_name}:</span> {m.body} <span className="text-subtle">· {fmtDateTime(m.created_at)}</span></p>)}</div>
              </div>
            );
          })}
          {reqs.filter((r) => r.status !== "pendent_tutor").length > 0 && (
            <div className="mt-4"><p className="mb-2 text-[12px] font-bold uppercase tracking-[0.1em] text-subtle">Historial de sol·licituds</p>{reqs.filter((r) => r.status !== "pendent_tutor").map((r) => <div key={r.id} className="flex justify-between py-1 text-[13px]"><span>{r.club_name}</span><Badge>{CONTACT_STATUS_LABEL[r.status]}</Badge></div>)}</div>
          )}
        </Card>
        <Card>
          <CardHeader title="Privacitat del menor" icon={<UserRound className="size-4" />} />
          <GuardianPrivacy profile={priv.profile} contact={priv.contact} showStats={priv.showStats} />
          <p className="mt-4 text-[12px] leading-relaxed text-muted">Per protecció, la ubicació d'un menor només es mostra per comarca i el perfil mai no és públic per a tothom.</p>
        </Card>
      </div>
    </div>
  );
}
