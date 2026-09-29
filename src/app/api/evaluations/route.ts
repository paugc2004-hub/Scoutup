import { z } from "zod";
import { api, apiStaff, body } from "@/server/api";
import { saveEvaluation } from "@/server/services/actions";

const S = z.object({ playerId: z.string(), scores: z.record(z.string(), z.record(z.string(), z.number().min(1).max(10))), decision: z.enum(["seguir", "prova", "fitxar", "descartar"]), comment: z.string().max(1500).default("") });
export const POST = api(async (req) => {
  const u = await apiStaff();
  const d = S.parse(await body(req));
  saveEvaluation(u, d.playerId, d);
  return { ok: true };
});
