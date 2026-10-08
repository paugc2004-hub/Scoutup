/**
 * Clubs FICTICIS de la demo. Els municipis són reals només com a referència geogràfica;
 * cap d'aquests clubs existeix ni representa cap entitat real.
 */
export type ClubDef = {
  id: string;
  name: string;
  short: string;
  initials: string;
  c1: string;
  c2: string;
  city: string;
  founded: number;
  tier: 1 | 2 | 3;
  verified: boolean;
  teams: { key: string; name: string; category: "Infantil" | "Cadete" | "Juvenil" | "Amateur"; gender: "M" | "F"; rank: number; first?: boolean }[];
};

export const HOME_CLUB_ID = "club_vn";
/** Segon club amb usuari de demo, per demostrar l'aïllament entre clubs. */
export const CLUB_B_ID = "club_mediterrani";

export const CLUBS: ClubDef[] = [
  {
    id: "club_vn", name: "CF Vallès Nord", short: "Vallès Nord", initials: "VN", c1: "#0F5132", c2: "#00E87A", city: "Sabadell", founded: 1961, tier: 1, verified: true,
    teams: [
      { key: "juva", name: "Juvenil A", category: "Juvenil", gender: "M", rank: 2 },
      { key: "juvb", name: "Juvenil B", category: "Juvenil", gender: "M", rank: 4 },
      { key: "cada", name: "Cadete A", category: "Cadete", gender: "M", rank: 2 },
      { key: "cadb", name: "Cadete B", category: "Cadete", gender: "M", rank: 4 },
      { key: "infa", name: "Infantil A", category: "Infantil", gender: "M", rank: 3 },
      { key: "ama", name: "Amateur A", category: "Amateur", gender: "M", rank: 3, first: true },
      { key: "juvf", name: "Juvenil Femenino", category: "Juvenil", gender: "F", rank: 2 },
    ],
  },
  { id: "club_serralada", name: "UE Serralada", short: "Serralada", initials: "US", c1: "#7A1F2B", c2: "#F2C14E", city: "Terrassa", founded: 1954, tier: 2, verified: true,
    teams: [{ key: "juva", name: "Juvenil A", category: "Juvenil", gender: "M", rank: 3 }, { key: "cada", name: "Cadete A", category: "Cadete", gender: "M", rank: 3 }, { key: "ama", name: "Amateur A", category: "Amateur", gender: "M", rank: 4, first: true }] },
  { id: "club_mediterrani", name: "FC Mediterrani", short: "Mediterrani", initials: "FM", c1: "#1E4FA3", c2: "#FFFFFF", city: "Badalona", founded: 1972, tier: 1, verified: true,
    teams: [{ key: "juva", name: "Juvenil A", category: "Juvenil", gender: "M", rank: 1 }, { key: "cada", name: "Cadete A", category: "Cadete", gender: "M", rank: 1 }, { key: "juvf", name: "Juvenil Femenino", category: "Juvenil", gender: "F", rank: 2 }, { key: "ama", name: "Amateur A", category: "Amateur", gender: "M", rank: 2, first: true }] },
  { id: "club_ribera", name: "Atlètic Ribera Nord", short: "Ribera Nord", initials: "AR", c1: "#C8102E", c2: "#FFFFFF", city: "Cornellà de Llobregat", founded: 1968, tier: 1, verified: true,
    teams: [{ key: "juva", name: "Juvenil A", category: "Juvenil", gender: "M", rank: 2 }, { key: "cada", name: "Cadete A", category: "Cadete", gender: "M", rank: 2 }, { key: "ama", name: "Amateur A", category: "Amateur", gender: "M", rank: 3, first: true }] },
  { id: "club_turo", name: "CF Turó Alt", short: "Turó Alt", initials: "TA", c1: "#2E3A87", c2: "#F5A623", city: "Sant Cugat del Vallès", founded: 1979, tier: 1, verified: true,
    teams: [{ key: "juva", name: "Juvenil A", category: "Juvenil", gender: "M", rank: 2 }, { key: "cada", name: "Cadete A", category: "Cadete", gender: "M", rank: 3 }, { key: "juvf", name: "Juvenil Femenino", category: "Juvenil", gender: "F", rank: 3 }] },
  { id: "club_ribes", name: "CD Ribes Blanques", short: "Ribes Blanques", initials: "RB", c1: "#0077B6", c2: "#FFFFFF", city: "Vilanova i la Geltrú", founded: 1983, tier: 2, verified: true,
    teams: [{ key: "juva", name: "Juvenil A", category: "Juvenil", gender: "M", rank: 3 }, { key: "ama", name: "Amateur A", category: "Amateur", gender: "M", rank: 4, first: true }] },
  { id: "club_delta", name: "FC Delta Sud", short: "Delta Sud", initials: "DS", c1: "#F28C28", c2: "#1B1B1B", city: "Sant Boi de Llobregat", founded: 1975, tier: 2, verified: true,
    teams: [{ key: "juva", name: "Juvenil A", category: "Juvenil", gender: "M", rank: 3 }, { key: "cada", name: "Cadete A", category: "Cadete", gender: "M", rank: 3 }, { key: "ama", name: "Amateur A", category: "Amateur", gender: "M", rank: 3, first: true }] },
  { id: "club_planou", name: "UE Pla Nou", short: "Pla Nou", initials: "PN", c1: "#6A2C91", c2: "#FFFFFF", city: "Rubí", founded: 1988, tier: 3, verified: true,
    teams: [{ key: "juva", name: "Juvenil A", category: "Juvenil", gender: "M", rank: 4 }, { key: "cada", name: "Cadete A", category: "Cadete", gender: "M", rank: 4 }] },
  { id: "club_olivera", name: "CE Olivera", short: "Olivera", initials: "CO", c1: "#3C6E47", c2: "#E9D8A6", city: "Martorell", founded: 1958, tier: 3, verified: true,
    teams: [{ key: "juva", name: "Juvenil A", category: "Juvenil", gender: "M", rank: 4 }, { key: "ama", name: "Amateur A", category: "Amateur", gender: "M", rank: 5, first: true }] },
  { id: "club_serraverda", name: "CF Serra Verda", short: "Serra Verda", initials: "SV", c1: "#2D6A4F", c2: "#FFFFFF", city: "Granollers", founded: 1965, tier: 2, verified: true,
    teams: [{ key: "juva", name: "Juvenil A", category: "Juvenil", gender: "M", rank: 2 }, { key: "cada", name: "Cadete A", category: "Cadete", gender: "M", rank: 3 }, { key: "juvf", name: "Juvenil Femenino", category: "Juvenil", gender: "F", rank: 2 }] },
  { id: "club_torrent", name: "AE Torrent Blau", short: "Torrent Blau", initials: "TB", c1: "#1D3557", c2: "#A8DADC", city: "Mataró", founded: 1970, tier: 2, verified: true,
    teams: [{ key: "juva", name: "Juvenil A", category: "Juvenil", gender: "M", rank: 2 }, { key: "cada", name: "Cadete A", category: "Cadete", gender: "M", rank: 3 }, { key: "ama", name: "Amateur A", category: "Amateur", gender: "M", rank: 3, first: true }] },
  { id: "club_rambla", name: "UD Rambla Nova", short: "Rambla Nova", initials: "RN", c1: "#9B2226", c2: "#FFFFFF", city: "Tarragona", founded: 1981, tier: 2, verified: true,
    teams: [{ key: "juva", name: "Juvenil A", category: "Juvenil", gender: "M", rank: 3 }, { key: "ama", name: "Amateur A", category: "Amateur", gender: "M", rank: 3, first: true }] },
  { id: "club_fontclara", name: "CE Font Clara", short: "Font Clara", initials: "FC", c1: "#00A6A6", c2: "#FFFFFF", city: "Mollet del Vallès", founded: 1990, tier: 3, verified: true,
    teams: [{ key: "juva", name: "Juvenil A", category: "Juvenil", gender: "M", rank: 4 }, { key: "juvf", name: "Juvenil Femenino", category: "Juvenil", gender: "F", rank: 3 }] },
  { id: "club_portal", name: "FC Portal Nord", short: "Portal Nord", initials: "PO", c1: "#B5179E", c2: "#FFFFFF", city: "Girona", founded: 1973, tier: 1, verified: true,
    teams: [{ key: "juva", name: "Juvenil A", category: "Juvenil", gender: "M", rank: 1 }, { key: "cada", name: "Cadete A", category: "Cadete", gender: "M", rank: 2 }, { key: "ama", name: "Amateur A", category: "Amateur", gender: "M", rank: 2, first: true }] },
  { id: "club_pins", name: "UE Els Pins", short: "Els Pins", initials: "EP", c1: "#264653", c2: "#E9C46A", city: "Castelldefels", founded: 1986, tier: 2, verified: true,
    teams: [{ key: "juva", name: "Juvenil A", category: "Juvenil", gender: "M", rank: 2 }, { key: "cada", name: "Cadete A", category: "Cadete", gender: "M", rank: 3 }] },
  { id: "club_horitzo", name: "CF Horitzó", short: "Horitzó", initials: "CH", c1: "#E76F51", c2: "#264653", city: "Cerdanyola del Vallès", founded: 1994, tier: 2, verified: true,
    teams: [{ key: "juva", name: "Juvenil A", category: "Juvenil", gender: "M", rank: 3 }, { key: "cada", name: "Cadete A", category: "Cadete", gender: "M", rank: 3 }, { key: "juvf", name: "Juvenil Femenino", category: "Juvenil", gender: "F", rank: 3 }] },
  { id: "club_masia", name: "CE Masia Nova", short: "Masia Nova", initials: "MN", c1: "#283618", c2: "#DDA15E", city: "Manresa", founded: 1962, tier: 2, verified: true,
    teams: [{ key: "juva", name: "Juvenil A", category: "Juvenil", gender: "M", rank: 3 }, { key: "ama", name: "Amateur A", category: "Amateur", gender: "M", rank: 4, first: true }] },
  { id: "club_llevant", name: "FC Llevant Metropolità", short: "Llevant Metropolità", initials: "LM", c1: "#003049", c2: "#FCBF49", city: "L'Hospitalet de Llobregat", founded: 1977, tier: 1, verified: true,
    teams: [{ key: "juva", name: "Juvenil A", category: "Juvenil", gender: "M", rank: 1 }, { key: "cada", name: "Cadete A", category: "Cadete", gender: "M", rank: 2 }, { key: "juvf", name: "Juvenil Femenino", category: "Juvenil", gender: "F", rank: 1 }] },
  { id: "club_vilamar", name: "UE Vilamar", short: "Vilamar", initials: "UV", c1: "#0096C7", c2: "#FFFFFF", city: "Premià de Mar", founded: 1999, tier: 3, verified: false,
    teams: [{ key: "juva", name: "Juvenil A", category: "Juvenil", gender: "M", rank: 5 }, { key: "ama", name: "Amateur A", category: "Amateur", gender: "M", rank: 5, first: true }] },
  { id: "club_mirador", name: "CF Mirador", short: "Mirador", initials: "CM", c1: "#4A5568", c2: "#E2E8F0", city: "Reus", founded: 2003, tier: 3, verified: false,
    teams: [{ key: "juva", name: "Juvenil A", category: "Juvenil", gender: "M", rank: 4 }, { key: "cada", name: "Cadete A", category: "Cadete", gender: "M", rank: 5 }] },
];

export const CLUB_TEXTS: Record<number, { description: string; philosophy: string; values: string; objectives: string; model: string }> = {
  1: {
    description: "Entidad de referencia en la comarca, con una estructura de fútbol base completa y una línea clara de formación hacia el primer equipo.",
    philosophy: "Juego de posición, protagonismo con balón y formación integral: el jugador crece como futbolista y como persona.",
    values: "Esfuerzo · Respeto · Compromiso · Trabajo en equipo",
    objectives: "Consolidar los equipos A en las máximas categorías territoriales y hacer debutar cada temporada a jugadores formados en el club.",
    model: "Metodología propia de la base al primer equipo, con coordinación técnica por etapas y seguimiento individual.",
  },
  2: {
    description: "Club de barrio con mucha historia y una base muy arraigada en el municipio. Apuesta por dar minutos a los jugadores de la casa.",
    philosophy: "Fútbol competitivo y ordenado, con énfasis en la intensidad y el esfuerzo colectivo.",
    values: "Humildad · Esfuerzo · Sentimiento de pertenencia",
    objectives: "Mantener los equipos A en su categoría y crecer en fútbol femenino.",
    model: "Entrenadores titulados en todas las categorías y planificación por ciclos.",
  },
  3: {
    description: "Entidad joven y en crecimiento, centrada en el fútbol formativo y en la vertiente social del deporte.",
    philosophy: "Que todos jueguen, que todos aprendan y que todos disfruten.",
    values: "Inclusión · Diversión · Respeto",
    objectives: "Estabilizar la estructura de la base y subir de categoría al Juvenil A.",
    model: "Formación en valores y progresión individual por encima del resultado.",
  },
};
