import { z } from "zod";
import { api, apiUser, ApiError, body } from "@/server/api";
import { cancelContactRequest, respondContactAsGuardian, respondContactAsPlayer } from "@/server/services/actions";
import type { SessionUser } from "@/server/auth/session";
import { isClubRole } from "@/lib/permissions";
import { zId } from "@/server/validation";

type Ctx = { params: Promise<{ id: string }> };
const S = z.object({ action: z.enum(["accept", "reject", "cancel"]) });
export const POST = api<Ctx>(async (req, { params }) => {
  const u = await apiUser();
  const id = zId.parse((await params).id);
  const { action } = S.parse(await body(req));
  if (action === "cancel") {
    if (!isClubRole(u.role) || !u.club_id) throw new ApiError(403, "No permès.");
    cancelContactRequest(u as SessionUser & { club_id: string }, id);
    return { ok: true };
  }
  if (u.role === "player" && u.player_id) return { ok: true, ...respondContactAsPlayer(u as SessionUser & { player_id: string }, id, action === "accept") };
  if (u.role === "guardian") return { ok: true, ...respondContactAsGuardian(u, id, action === "accept") };
  throw new ApiError(403, "No permès.");
});
