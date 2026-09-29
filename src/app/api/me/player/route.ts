import { api, apiPlayer, body } from "@/server/api";
import { ProfilePatch, patchProfile } from "@/server/services/player-actions";

export const PATCH = api(async (req) => {
  const u = await apiPlayer();
  const d = ProfilePatch.parse(await body(req));
  return { ok: true, ...patchProfile(u, d) };
});
