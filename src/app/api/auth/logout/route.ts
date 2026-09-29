import { api } from "@/server/api";
import { destroySession } from "@/server/auth/session";

export const POST = api(async () => {
  await destroySession();
  return { ok: true };
});
