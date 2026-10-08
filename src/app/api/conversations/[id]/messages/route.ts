import { z } from "zod";
import { api, apiUser, body, rateLimit } from "@/server/api";
import { sendMessage } from "@/server/services/actions";
import { zId, zText } from "@/server/validation";

type Ctx = { params: Promise<{ id: string }> };
const S = z.object({ body: zText(2000, 1) });
export const POST = api<Ctx>(async (req, { params }) => {
  const u = await apiUser();
  rateLimit("message", u.id);
  const id = zId.parse((await params).id);
  const d = S.parse(await body(req));
  return { ok: true, ...sendMessage(u, id, d.body) };
});
