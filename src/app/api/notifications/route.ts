import { api, apiUser } from "@/server/api";
import { all } from "@/server/db/client";

export const GET = api(async () => {
  const u = await apiUser();
  const items = all("SELECT id, kind, title, body, link, created_at, read_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30", u.id);
  return { items };
});
