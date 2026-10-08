/**
 * Registre d'auditoria per a accions sensibles: qui, què, sobre quin recurs, quan i amb quin resultat.
 * No hi desem mai contrasenyes, tokens ni contingut privat (notes, missatges).
 */
import { insert, nowIso, uid } from "@/server/db/client";
import { log } from "@/server/log";

export type AuditInput = {
  actor: { id: string; club_id?: string | null } | null;
  action: string;
  entity?: { type: string; id: string } | null;
  result?: "ok" | "denied" | "error";
  detail?: string | null;
  clubId?: string | null;
};

export function audit(a: AuditInput): void {
  const row = {
    id: uid("au_"),
    club_id: a.clubId ?? a.actor?.club_id ?? null,
    actor_user_id: a.actor?.id ?? null,
    action: a.action,
    entity_type: a.entity?.type ?? null,
    entity_id: a.entity?.id ?? null,
    result: a.result ?? "ok",
    detail: a.detail ? a.detail.slice(0, 300) : null,
    created_at: nowIso(),
  };
  try {
    insert("audit_log", row);
  } catch (e) {
    log.error("audit.write_failed", { action: a.action, error: e });
  }
  if (row.result !== "ok") log.warn("audit." + row.result, { action: row.action, actor: row.actor_user_id, entity: row.entity_type, entityId: row.entity_id, detail: row.detail });
}
