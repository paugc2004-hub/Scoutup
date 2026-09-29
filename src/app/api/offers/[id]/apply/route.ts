import { z } from "zod";
import { api, apiPlayer, body } from "@/server/api";
import { applyToOffer } from "@/server/services/actions";

type Ctx = { params: Promise<{ id: string }> };
const S = z.object({ message: z.string().max(800).nullish() });
export const POST = api<Ctx>(async (req, { params }) => {
  const u = await apiPlayer();
  const { id } = await params;
  const d = S.parse(await body(req));
  return { ok: true, ...applyToOffer(u, id, d.message ?? null) };
});
