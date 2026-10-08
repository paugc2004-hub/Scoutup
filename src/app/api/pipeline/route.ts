import { z } from "zod";
import { api, apiStaff, body, rateLimit } from "@/server/api";
import { addToPipeline } from "@/server/services/actions";
import { PIPELINE_STAGES } from "@/lib/domain";
import { zId } from "@/server/validation";

const S = z.object({ playerId: zId, teamId: zId.nullish(), offerId: zId.nullish(), stage: z.enum(PIPELINE_STAGES).optional() });
export const POST = api(async (req) => {
  const u = await apiStaff("pipeline.manage");
  rateLimit("write", u.id);
  const d = S.parse(await body(req));
  const e = addToPipeline(u, d.playerId, { teamId: d.teamId, offerId: d.offerId, stage: d.stage });
  return { ok: true, entry: { id: e.id, stage: e.stage, team_id: e.team_id, player_id: e.player_id } };
});
