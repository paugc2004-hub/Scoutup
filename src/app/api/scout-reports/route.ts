import { z } from "zod";
import { api, apiStaff, body, rateLimit } from "@/server/api";
import { createScoutReport } from "@/server/services/actions";
import { POSITIONS } from "@/lib/domain";
import { zId, zIsoDate, zText } from "@/server/validation";

const S = z.object({ player_id: zId, match_title: zText(120, 3), match_date: zIsoDate, competition: zText(120).nullish(), position_observed: z.enum(POSITIONS).nullish(), rating: z.number().int().min(1).max(10), observations: zText(2000, 5), recommendation: z.enum(["seguir", "contactar", "prova", "descartar"]), reminder_at: zIsoDate.nullish() });
export const POST = api(async (req) => {
  const u = await apiStaff("evaluations.write");
  rateLimit("write", u.id);
  const d = S.parse(await body(req));
  return { ok: true, ...createScoutReport(u, d) };
});
