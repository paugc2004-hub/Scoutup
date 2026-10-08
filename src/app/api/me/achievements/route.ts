import { z } from "zod";
import { api, apiPlayer, body } from "@/server/api";
import { zText } from "@/server/validation";
import { addAchievement } from "@/server/services/player-actions";

const S = z.object({ title: zText(90, 3), season_label: z.string().max(10).nullable() });
export const POST = api(async (req) => {
  const u = await apiPlayer();
  return { ok: true, completeness: addAchievement(u, S.parse(await body(req))) };
});
