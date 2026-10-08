import { z } from "zod";
import { api, apiPlayer, body } from "@/server/api";
import { zText } from "@/server/validation";
import { addCareer } from "@/server/services/player-actions";

const S = z.object({ season_label: z.string().regex(/^\d{4}\/\d{2}$/, "format 2024/25"), club_name: zText(80, 2), team_name: zText(40), category: zText(30), division: zText(40), role: zText(40) });
export const POST = api(async (req) => {
  const u = await apiPlayer();
  return { ok: true, completeness: addCareer(u, S.parse(await body(req))) };
});
