import { z } from "zod";
import { api, apiUser, body } from "@/server/api";
import { sendMessage } from "@/server/services/actions";

type Ctx = { params: Promise<{ id: string }> };
const S = z.object({ body: z.string().min(1).max(2000) });
export const POST = api<Ctx>(async (req, { params }) => {
  const u = await apiUser();
  const { id } = await params;
  const d = S.parse(await body(req));
  return { ok: true, ...sendMessage(u, id, d.body) };
});
