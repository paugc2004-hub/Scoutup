import { z } from "zod";
import { api, apiStaff, body, rateLimit } from "@/server/api";
import { moveStage, removeFromPipeline } from "@/server/services/actions";
import { PIPELINE_STAGES } from "@/lib/domain";
import { zId } from "@/server/validation";

type Ctx = { params: Promise<{ id: string }> };
const S = z.object({ stage: z.enum(PIPELINE_STAGES) });
export const PATCH = api<Ctx>(async (req, { params }) => {
  const u = await apiStaff("pipeline.manage");
  rateLimit("write", u.id);
  const id = zId.parse((await params).id);
  const { stage } = S.parse(await body(req));
  moveStage(u, id, stage);
  return { ok: true };
});
export const DELETE = api<Ctx>(async (_req, { params }) => {
  const u = await apiStaff("pipeline.manage");
  removeFromPipeline(u, zId.parse((await params).id));
  return { ok: true };
});
