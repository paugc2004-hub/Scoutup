import { z } from "zod";
import { api, apiPlayer, body } from "@/server/api";
import { upsertStats } from "@/server/services/player-actions";

const n = z.number().int().min(0).max(5000);
const S = z.object({ season_id: z.string(), team_name: z.string().max(90).nullable(), matches: n, starts: n, minutes: n, goals: n, assists: n, yellow: n, red: n, callups: n, clean_sheets: n });
export const POST = api(async (req) => {
  const u = await apiPlayer();
  return { ok: true, completeness: upsertStats(u, S.parse(await body(req))) };
});
