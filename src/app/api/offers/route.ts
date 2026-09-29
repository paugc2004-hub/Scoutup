import { api, apiStaff, body } from "@/server/api";
import { OfferInput, createOffer } from "@/server/services/offer-actions";

export const POST = api(async (req) => {
  const u = await apiStaff();
  const d = OfferInput.parse(await body(req));
  return { ok: true, ...createOffer(u, d) };
});
