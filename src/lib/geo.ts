/** Utilitats geogràfiques (sense àlies: també les fa servir el seed). */

export type Place = { city: string; comarca: string; province: string; lat: number; lng: number };

/** Municipis reals, només com a referència geogràfica (cap club real associat). */
export const PLACES: Place[] = [
  { city: "Sabadell", comarca: "Vallès Occidental", province: "Barcelona", lat: 41.5463, lng: 2.1086 },
  { city: "Terrassa", comarca: "Vallès Occidental", province: "Barcelona", lat: 41.5632, lng: 2.0089 },
  { city: "Sant Cugat del Vallès", comarca: "Vallès Occidental", province: "Barcelona", lat: 41.4722, lng: 2.0864 },
  { city: "Rubí", comarca: "Vallès Occidental", province: "Barcelona", lat: 41.4933, lng: 2.0325 },
  { city: "Cerdanyola del Vallès", comarca: "Vallès Occidental", province: "Barcelona", lat: 41.4913, lng: 2.1408 },
  { city: "Barberà del Vallès", comarca: "Vallès Occidental", province: "Barcelona", lat: 41.5159, lng: 2.1246 },
  { city: "Castellar del Vallès", comarca: "Vallès Occidental", province: "Barcelona", lat: 41.6166, lng: 2.0873 },
  { city: "Granollers", comarca: "Vallès Oriental", province: "Barcelona", lat: 41.6079, lng: 2.2876 },
  { city: "Mollet del Vallès", comarca: "Vallès Oriental", province: "Barcelona", lat: 41.5401, lng: 2.2135 },
  { city: "Badalona", comarca: "Barcelonès", province: "Barcelona", lat: 41.4500, lng: 2.2474 },
  { city: "Barcelona", comarca: "Barcelonès", province: "Barcelona", lat: 41.3874, lng: 2.1686 },
  { city: "L'Hospitalet de Llobregat", comarca: "Barcelonès", province: "Barcelona", lat: 41.3662, lng: 2.1169 },
  { city: "Cornellà de Llobregat", comarca: "Baix Llobregat", province: "Barcelona", lat: 41.3569, lng: 2.0707 },
  { city: "Sant Boi de Llobregat", comarca: "Baix Llobregat", province: "Barcelona", lat: 41.3436, lng: 2.0366 },
  { city: "Castelldefels", comarca: "Baix Llobregat", province: "Barcelona", lat: 41.2800, lng: 1.9767 },
  { city: "Martorell", comarca: "Baix Llobregat", province: "Barcelona", lat: 41.4745, lng: 1.9305 },
  { city: "Mataró", comarca: "Maresme", province: "Barcelona", lat: 41.5381, lng: 2.4445 },
  { city: "Premià de Mar", comarca: "Maresme", province: "Barcelona", lat: 41.4919, lng: 2.3619 },
  { city: "Manresa", comarca: "Bages", province: "Barcelona", lat: 41.7250, lng: 1.8266 },
  { city: "Igualada", comarca: "Anoia", province: "Barcelona", lat: 41.5791, lng: 1.6172 },
  { city: "Vilanova i la Geltrú", comarca: "Garraf", province: "Barcelona", lat: 41.2241, lng: 1.7252 },
  { city: "Vilafranca del Penedès", comarca: "Alt Penedès", province: "Barcelona", lat: 41.3465, lng: 1.6996 },
  { city: "Vic", comarca: "Osona", province: "Barcelona", lat: 41.9304, lng: 2.2546 },
  { city: "Girona", comarca: "Gironès", province: "Girona", lat: 41.9794, lng: 2.8214 },
  { city: "Figueres", comarca: "Alt Empordà", province: "Girona", lat: 42.2667, lng: 2.9617 },
  { city: "Tarragona", comarca: "Tarragonès", province: "Tarragona", lat: 41.1189, lng: 1.2445 },
  { city: "Reus", comarca: "Baix Camp", province: "Tarragona", lat: 41.1561, lng: 1.1069 },
  { city: "Lleida", comarca: "Segrià", province: "Lleida", lat: 41.6176, lng: 0.6200 },
];

export function placeByCity(city: string): Place | undefined {
  return PLACES.find((p) => p.city.toLowerCase() === city.toLowerCase());
}

export const COMARQUES = Array.from(new Set(PLACES.map((p) => p.comarca))).sort((a, b) => a.localeCompare(b, "ca"));

export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)) * 10) / 10;
}
