/**
 * Esquemes de validació reutilitzables (zod). Tota entrada es valida al servidor:
 * la validació del formulari és només una ajuda per a l'usuari.
 */
import { z } from "zod";

/** Identificadors interns: només lletres, xifres, «_» i «-», longitud acotada. */
export const zId = z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/, "identificador no vàlid");

/** Text lliure amb longitud màxima; elimina caràcters de control (excepte salts de línia i tabuladors). */
export const zText = (max: number, min = 0) =>
  z
    .string()
    .transform((s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim())
    .pipe(z.string().min(min, min > 1 ? `mínim ${min} caràcters` : "obligatori").max(max, `màxim ${max} caràcters`));

/** Data ISO 8601 vàlida (AAAA-MM-DD o data-hora), dins d'un rang raonable. */
export const zIsoDate = z
  .string()
  .trim()
  .max(40)
  .refine((v) => /^\d{4}-\d{2}-\d{2}([T ][\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/.test(v) && !isNaN(new Date(v).getTime()), "data no vàlida")
  .refine((v) => {
    const y = new Date(v).getUTCFullYear();
    return y >= 2000 && y <= 2100;
  }, "data fora de rang");

export const zEmail = z.string().trim().toLowerCase().max(254).email("correu no vàlid");

/** Contrasenya: mínim 8 caràcters (els comptes de demo fan servir «demo», creats pel seed). */
export const zNewPassword = z.string().min(8, "mínim 8 caràcters").max(200, "massa llarga");
