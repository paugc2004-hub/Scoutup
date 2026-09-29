import { api, apiUser, body } from "@/server/api";
import { run, nowIso } from "@/server/db/client";

export const POST = api(async (req) => {
  const u = await apiUser();
  const { id } = await body<{ id?: string }>(req);
  if (id) run("UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL", nowIso(), id, u.id);
  else run("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL", nowIso(), u.id);
  return { ok: true };
});
