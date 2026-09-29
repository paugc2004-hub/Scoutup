import { z } from "zod";
import { api, apiUser, ApiError, body } from "@/server/api";
import { rejectApplication, withdrawApplication, addToPipeline } from "@/server/services/actions";
import { get } from "@/server/db/client";
import type { SessionUser } from "@/server/auth/session";

type Ctx = { params: Promise<{ id: string }> };
const S = z.object({ action: z.enum(["reject", "withdraw", "shortlist"]) });
export const POST = api<Ctx>(async (req, { params }) => {
  const u = await apiUser();
  const { id } = await params;
  const { action } = S.parse(await body(req));
  if (action === "withdraw") {
    if (u.role !== "player" || !u.player_id) throw new ApiError(403, "Només el jugador pot retirar la sol·licitud.");
    withdrawApplication(u as SessionUser & { player_id: string }, id);
    return { ok: true };
  }
  if ((u.role !== "director" && u.role !== "coach") || !u.club_id) throw new ApiError(403, "Només el club pot gestionar sol·licituds.");
  const staff = u as SessionUser & { club_id: string };
  if (action === "reject") rejectApplication(staff, id);
  else {
    const a = get<{ player_id: string; offer_id: string; team_id: string | null; club_id: string }>("SELECT a.player_id, a.offer_id, o.team_id, o.club_id FROM applications a JOIN offers o ON o.id = a.offer_id WHERE a.id = ?", id);
    if (!a || a.club_id !== staff.club_id) throw new ApiError(404, "Sol·licitud no trobada.");
    addToPipeline(staff, a.player_id, { offerId: a.offer_id, teamId: a.team_id, stage: "revisar" });
  }
  return { ok: true };
});
