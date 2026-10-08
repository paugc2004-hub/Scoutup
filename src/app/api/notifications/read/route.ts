import { z } from "zod";
import { api, apiUser, body } from "@/server/api";
import { run, nowIso } from "@/server/db/client";
import { zId } from "@/server/validation";

const S = z.object({ id: zId.optional() });
export const POST = api(async (req) => {
  const u = await apiUser();
  const { id } = S.parse(await body(req));
  if (id) run("UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL", nowIso(), id, u.id);
  else run("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL", nowIso(), u.id);
  return { ok: true };
});
