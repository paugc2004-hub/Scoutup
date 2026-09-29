import { z } from "zod";
import { api, apiStaff, body } from "@/server/api";
import { addToPipeline } from "@/server/services/actions";
import { PIPELINE_STAGES } from "@/lib/domain";

const S = z.object({ playerId: z.string(), teamId: z.string().nullish(), offerId: z.string().nullish(), stage: z.enum(PIPELINE_STAGES).optional() });
export const POST = api(async (req) => {
  const u = await apiStaff();
  const d = S.parse(await body(req));
  const e = addToPipeline(u, d.playerId, { teamId: d.teamId, offerId: d.offerId, stage: d.stage });
  return { ok: true, entry: e };
});
