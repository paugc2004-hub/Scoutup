import { api, apiPlayer } from "@/server/api";
import { deleteVideo } from "@/server/services/player-actions";

type Ctx = { params: Promise<{ id: string }> };
export const DELETE = api<Ctx>(async (_r, { params }) => {
  const u = await apiPlayer();
  return { ok: true, completeness: deleteVideo(u, (await params).id) };
});
