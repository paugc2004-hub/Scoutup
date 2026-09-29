import { z } from "zod";
import { api, apiPlayer, body } from "@/server/api";
import { addCareer } from "@/server/services/player-actions";

const S = z.object({ season_label: z.string().regex(/^\d{4}\/\d{2}$/, "format 2024/25"), club_name: z.string().trim().min(2).max(80), team_name: z.string().trim().max(40), category: z.string().max(30), division: z.string().max(40), role: z.string().max(40) });
export const POST = api(async (req) => {
  const u = await apiPlayer();
  return { ok: true, completeness: addCareer(u, S.parse(await body(req))) };
});
