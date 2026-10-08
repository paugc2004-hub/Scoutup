import { z } from "zod";
import { api, apiStaff, body } from "@/server/api";
import { setOfferStatus } from "@/server/services/offer-actions";
import { zId } from "@/server/validation";

type Ctx = { params: Promise<{ id: string }> };
const S = z.object({ status: z.enum(["oberta", "pausada", "tancada"]) });
export const PATCH = api<Ctx>(async (req, { params }) => {
  const u = await apiStaff("opportunities.manage");
  const id = zId.parse((await params).id);
  const { status } = S.parse(await body(req));
  setOfferStatus(u, id, status);
  return { ok: true };
});
