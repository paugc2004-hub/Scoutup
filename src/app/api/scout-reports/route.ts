import { z } from "zod";
import { api, apiStaff, body } from "@/server/api";
import { createScoutReport } from "@/server/services/actions";

const S = z.object({ player_id: z.string(), match_title: z.string().trim().min(3), match_date: z.string(), competition: z.string().nullish(), position_observed: z.string().nullish(), rating: z.number().int().min(1).max(10), observations: z.string().trim().min(5), recommendation: z.enum(["seguir", "contactar", "prova", "descartar"]), reminder_at: z.string().nullish() });
export const POST = api(async (req) => {
  const u = await apiStaff();
  const d = S.parse(await body(req));
  return { ok: true, ...createScoutReport(u, d) };
});
