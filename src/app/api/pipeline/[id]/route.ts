import { z } from "zod";
import { api, apiStaff, body } from "@/server/api";
import { moveStage, removeFromPipeline } from "@/server/services/actions";
import { PIPELINE_STAGES } from "@/lib/domain";

type Ctx = { params: Promise<{ id: string }> };
const S = z.object({ stage: z.enum(PIPELINE_STAGES) });
export const PATCH = api<Ctx>(async (req, { params }) => {
  const u = await apiStaff();
  const { id } = await params;
  const { stage } = S.parse(await body(req));
  moveStage(u, id, stage);
  return { ok: true };
});
export const DELETE = api<Ctx>(async (_req, { params }) => {
  const u = await apiStaff();
  const { id } = await params;
  removeFromPipeline(u, id);
  return { ok: true };
});
