import { z } from "zod";
import { api, apiUser, ApiError, body, rateLimit } from "@/server/api";
import { createEvent } from "@/server/services/actions";
import { EVENT_KINDS } from "@/lib/domain";
import { hasPermission, isClubRole } from "@/lib/permissions";
import { zId, zIsoDate, zText } from "@/server/validation";

const S = z.object({ kind: z.enum(EVENT_KINDS), title: zText(120, 2), starts_at: zIsoDate, duration: z.number().int().min(15).max(600).default(60), team_id: zId.nullish(), related_player_id: zId.nullish(), location: zText(160).nullish(), notes: zText(1000).nullish(), conversation_id: zId.nullish() });
export const POST = api(async (req) => {
  const u = await apiUser();
  if (isClubRole(u.role) && !hasPermission(u.role, "calendar.manage")) throw new ApiError(403, "Tu rol no permite crear eventos.");
  rateLimit("write", u.id);
  const d = S.parse(await body(req));
  return { ok: true, ...createEvent(u, d) };
});
