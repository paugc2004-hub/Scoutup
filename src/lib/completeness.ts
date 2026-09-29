/** Càlcul de la completesa del perfil del jugador (sense àlies: també el fa servir el seed). */

export type CompletenessInput = {
  first_name?: string | null;
  last_name?: string | null;
  birth_date?: string | null;
  city?: string | null;
  primary_position?: string | null;
  foot?: string | null;
  secondary_positions: string[];
  height_cm?: number | null;
  description?: string | null;
  style?: string | null;
  languages?: string | null;
  availability?: string | null;
  careerCount: number;
  prevStats: boolean;
  currentStats: boolean;
  videoCount: number;
  achievementCount: number;
  preferencesSet: boolean;
  privacyReviewed: boolean;
};

export type CompletenessItem = { key: string; label: string; weight: number; done: boolean; step: number };

export function completenessItems(p: CompletenessInput): CompletenessItem[] {
  return [
    { key: "personal", label: "Dades personals", weight: 10, done: !!(p.first_name && p.last_name && p.birth_date && p.city), step: 1 },
    { key: "posicio", label: "Posició i peu", weight: 10, done: !!(p.primary_position && p.foot), step: 2 },
    { key: "secundaries", label: "Posicions secundàries", weight: 5, done: p.secondary_positions.length > 0, step: 2 },
    { key: "alcada", label: "Alçada", weight: 4, done: !!p.height_cm, step: 2 },
    { key: "descripcio", label: "Descripció del jugador", weight: 10, done: (p.description ?? "").trim().length >= 60, step: 2 },
    { key: "estil", label: "Estil de joc", weight: 5, done: (p.style ?? "").trim().length > 0, step: 2 },
    { key: "trajectoria", label: "Trajectòria (2+ temporades)", weight: 10, done: p.careerCount >= 2, step: 3 },
    { key: "stats_prev", label: "Estadístiques de la temporada passada", weight: 10, done: p.prevStats, step: 4 },
    { key: "stats_curr", label: "Estadístiques de la temporada actual", weight: 3, done: p.currentStats, step: 4 },
    { key: "videos", label: "Almenys un vídeo", weight: 12, done: p.videoCount > 0, step: 5 },
    { key: "disponibilitat", label: "Disponibilitat", weight: 6, done: !!p.availability, step: 6 },
    { key: "preferencies", label: "Preferències", weight: 5, done: p.preferencesSet, step: 7 },
    { key: "privacitat", label: "Privacitat revisada", weight: 5, done: p.privacyReviewed, step: 8 },
    { key: "idiomes", label: "Idiomes", weight: 2, done: (p.languages ?? "").trim().length > 0, step: 1 },
    { key: "assoliments", label: "Assoliments", weight: 3, done: p.achievementCount > 0, step: 3 },
  ];
}

export function completenessScore(p: CompletenessInput): number {
  return completenessItems(p).reduce((a, i) => a + (i.done ? i.weight : 0), 0);
}
