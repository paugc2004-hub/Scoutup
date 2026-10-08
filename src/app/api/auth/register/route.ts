import { z } from "zod";
import { api, ApiError, body, clientIp, rateLimit } from "@/server/api";
import { zEmail, zNewPassword, zText } from "@/server/validation";
import { audit } from "@/server/security/audit";
import { get, insert, nowIso, tx, uid } from "@/server/db/client";
import { hashPassword } from "@/server/auth/password";
import { createSession } from "@/server/auth/session";
import { placeByCity } from "@/lib/geo";
import { DEFAULT_PREFERENCES, DEFAULT_PRIVACY, POSITIONS, categoryForBirthYear, currentSeasonStartYear, isMinor } from "@/lib/domain";
import { completenessScore } from "@/lib/completeness";
import { notify } from "@/server/services/notify";

const Player = z.object({
  type: z.literal("player"),
  first_name: zText(40, 2),
  last_name: zText(60, 2),
  email: zEmail,
  password: zNewPassword,
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "fecha no válida"),
  gender: z.enum(["M", "F"]),
  city: zText(60, 2),
  position: z.enum(POSITIONS),
  guardian_email: zEmail.optional().or(z.literal("")),
  accept: z.literal(true, { message: "debes aceptar las condiciones de la demo" }),
});
const Club = z.object({
  type: z.literal("club"),
  club_name: zText(80, 3),
  city: zText(60, 2),
  name: zText(80, 3),
  email: zEmail,
  password: zNewPassword,
  accept: z.literal(true, { message: "debes aceptar las condiciones de la demo" }),
});

export const POST = api(async (req) => {
  rateLimit("register", await clientIp());
  const raw = await body<{ type?: string }>(req);
  const now = nowIso();
  if (raw.type === "player") {
    const d = Player.parse(raw);
    if (get("SELECT id FROM users WHERE lower(email) = lower(?)", d.email)) throw new ApiError(409, "Ya existe una cuenta con este correo.");
    const place = placeByCity(d.city);
    if (!place) throw new ApiError(400, "Municipio no disponible en la demo.");
    const minor = isMinor(d.birth_date);
    if (minor && !d.guardian_email) throw new ApiError(400, "Los menores de edad necesitan el correo del padre, madre o tutor legal.");
    const userId = uid("u_");
    const playerId = uid("p_");
    const by = Number(d.birth_date.slice(0, 4));
    const category = categoryForBirthYear(by, currentSeasonStartYear());
    const completeness = completenessScore({ first_name: d.first_name, last_name: d.last_name, birth_date: d.birth_date, city: place.city, primary_position: d.position, foot: "dret", secondary_positions: [], careerCount: 0, prevStats: false, currentStats: false, videoCount: 0, achievementCount: 0, preferencesSet: false, privacyReviewed: false });
    tx(() => {
      insert("users", { id: userId, email: d.email, password_hash: hashPassword(d.password), name: `${d.first_name} ${d.last_name}`, role: "player", title: "Jugador", player_id: playerId, avatar_hue: Math.floor(Math.random() * 360), is_demo_login: 0, created_at: now });
      insert("players", {
        id: playerId, user_id: userId, first_name: d.first_name, last_name: d.last_name, gender: d.gender, birth_date: d.birth_date, nationality: "Espanyola",
        languages: null, city: place.city, comarca: place.comarca, province: place.province, region: "Catalunya", country: "Espanya", lat: place.lat, lng: place.lng,
        primary_position: d.position, secondary_positions: "[]", foot: "dret", height_cm: null, club_id: null, team_id: null, club_name_free: null,
        category: category === "Infantil" ? "Cadete" : category, division_rank: 4, style: null, description: null, availability: "obert", available_from: null,
        contract_status: "lliure", attrs: JSON.stringify({ velocitat: 5, resistencia: 5, forca: 5, tecnica: 5, passada: 5, xut: 5, regat: 5, joc_aeri: 5, defensa: 5, visio: 5, posicionament: 5, lideratge: 5 }),
        avatar_hue: Math.floor(Math.random() * 360), verification: "self", guardian_user_id: null, guardian_email: minor ? d.guardian_email : null, guardian_consent: 0,
        preferences: JSON.stringify(DEFAULT_PREFERENCES), privacy: JSON.stringify(DEFAULT_PRIVACY), completeness, onboarding_done: 0, updated_at: now, created_at: now,
      });
    });
    notify(userId, "profile", "¡Bienvenido a ScoutUp!", minor ? "Completa el perfil. Los clubes no lo verán hasta que tu tutor legal dé su consentimiento." : "Completa el perfil para empezar a recibir oportunidades compatibles.", "/jugador/perfil/editar");
    await createSession(userId);
    return { ok: true, redirect: "/jugador/perfil/editar" };
  }
  if (raw.type === "club") {
    const d = Club.parse(raw);
    if (get("SELECT id FROM users WHERE lower(email) = lower(?)", d.email)) throw new ApiError(409, "Ya existe una cuenta con este correo.");
    const place = placeByCity(d.city);
    if (!place) throw new ApiError(400, "Municipio no disponible en la demo.");
    const clubId = uid("club_");
    const userId = uid("u_");
    const initials = d.club_name.replace(/^(CF|FC|CE|UE|CD|AE|UD|AD)\s+/i, "").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "CL";
    tx(() => {
      insert("clubs", { id: clubId, name: d.club_name, short_name: d.club_name.replace(/^(CF|FC|CE|UE|CD|AE|UD|AD)\s+/i, ""), initials, color_primary: "#334155", color_secondary: "#e2e8f0", founded: null, city: place.city, comarca: place.comarca, province: place.province, region: "Catalunya", country: "Espanya", lat: place.lat, lng: place.lng, website: null, instagram: null, email: d.email, phone: null, office_hours: null, languages: "Catalán, castellano", description: "Club nuevo en ScoutUp. Completa el perfil para que los jugadores te conozcan.", history: null, philosophy: null, values_text: null, objectives: null, sporting_model: null, facilities: "[]", tier: 3, verified: 0, created_at: now });
      insert("users", { id: userId, email: d.email, password_hash: hashPassword(d.password), name: d.name, role: "director", title: "Dirección deportiva", club_id: clubId, avatar_hue: Math.floor(Math.random() * 360), is_demo_login: 0, created_at: now });
    });
    notify(userId, "system", "Club creado · pendiente de verificación", "Mientras el club no esté verificado, puedes explorar y publicar oportunidades, pero no contactar jugadores.", "/club/perfil");
    audit({ actor: { id: userId, club_id: clubId }, action: "club.register", entity: { type: "club", id: clubId } });
    await createSession(userId);
    return { ok: true, redirect: "/club/bienvenida" };
  }
  throw new ApiError(400, "Tipo de cuenta no válido.");
});
