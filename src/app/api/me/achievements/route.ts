import { z } from "zod";
import { api, apiPlayer, body } from "@/server/api";
import { addAchievement } from "@/server/services/player-actions";

const S = z.object({ title: z.string().trim().min(3).max(90), season_label: z.string().max(10).nullable() });
export const POST = api(async (req) => {
  const u = await apiPlayer();
  return { ok: true, completeness: addAchievement(u, S.parse(await body(req))) };
});
