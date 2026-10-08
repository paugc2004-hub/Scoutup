import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ban, Flag } from "lucide-react";
import { requirePlayer } from "@/server/auth/session";
import { get } from "@/server/db/client";
import { club as getClub } from "@/server/services/club";
import { ClubProfileView } from "@/components/club-profile";
import { FavoriteButton } from "@/components/club/player-actions";
import { BlockButton } from "@/components/player/block-button";
import { ReportButton } from "@/components/player/report-button";

export default async function PlayerClubPage({ params }: { params: Promise<{ id: string }> }) {
  const u = await requirePlayer();
  const { id } = await params;
  if (!get("SELECT id FROM clubs WHERE id = ?", id)) notFound();
  const c = getClub(id);
  const fav = !!get("SELECT id FROM favorites WHERE user_id = ? AND target_type = 'club' AND target_id = ?", u.id, id);
  const blocked = !!get("SELECT id FROM blocks WHERE player_id = ? AND club_id = ?", u.player_id, id);
  return (
    <div className="space-y-4">
      <Link href="/jugador/clubs" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" /> Clubes</Link>
      <ClubProfileView club={c} offerHref={(oid) => `/jugador/oportunitats/${oid}`} actions={<div className="flex flex-wrap items-center gap-2"><FavoriteButton type="club" id={id} initial={fav} /><BlockButton clubId={id} blocked={blocked} icon={<Ban className="size-3.5" />} /><ReportButton targetType="club" targetId={id} icon={<Flag className="size-3.5" />} /></div>} />
    </div>
  );
}
