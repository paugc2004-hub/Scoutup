import { z } from "zod";
import { api, apiStaff, body, rateLimit } from "@/server/api";
import { saveEvaluation } from "@/server/services/actions";
import { EVAL_AREAS } from "@/lib/domain";
import { zId, zText } from "@/server/validation";

// Només s'accepten les àrees i criteris definits al domini (cap clau arbitrària).
const areaKeys = EVAL_AREAS.map((a) => a.key) as [string, ...string[]];
const score = z.number().int().min(1).max(10);
const Scores = z.record(z.enum(areaKeys), z.record(z.string().max(30), score)).refine(
  (sc) => Object.entries(sc).every(([a, crit]) => {
    const area = EVAL_AREAS.find((x) => x.key === a)!;
    return Object.keys(crit).every((k) => area.criteria.some((c) => c.key === k));
  }),
  "criterio de evaluación desconocido",
);
const S = z.object({ playerId: zId, scores: Scores, decision: z.enum(["seguir", "prova", "fitxar", "descartar"]), comment: zText(1500).default(""), context: zText(120).nullish() });
export const POST = api(async (req) => {
  const u = await apiStaff("evaluations.write");
  rateLimit("write", u.id);
  const d = S.parse(await body(req));
  saveEvaluation(u, d.playerId, d);
  return { ok: true };
});
