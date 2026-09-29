import { api, apiStaff, body } from "@/server/api";
import { OfferInput, previewOffer } from "@/server/services/offer-actions";

export const POST = api(async (req) => {
  const u = await apiStaff();
  const d = OfferInput.parse({ title: "Previsualització", ...(await body(req)) });
  return previewOffer(u, d);
});
