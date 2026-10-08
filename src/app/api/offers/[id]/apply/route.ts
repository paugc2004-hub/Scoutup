import { z } from "zod";
import { api, apiPlayer, body, rateLimit } from "@/server/api";
import { applyToOffer } from "@/server/services/actions";
import { zId, zText } from "@/server/validation";

type Ctx = { params: Promise<{ id: string }> };
const S = z.object({ message: zText(800).nullish() });
export const POST = api<Ctx>(async (req, { params }) => {
  const u = await apiPlayer();
  rateLimit("write", u.id);
  const id = zId.parse((await params).id);
  const d = S.parse(await body(req));
  return { ok: true, ...applyToOffer(u, id, d.message ?? null) };
});
