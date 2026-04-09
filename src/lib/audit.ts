import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";

type AuditAction = "created" | "updated" | "deleted" | "exported";

interface AuditEntry {
  entityType: string;
  entityId: string;
  action: AuditAction;
  userId: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
}

/**
 * Log an audit entry. Append-only -- this function only inserts, never updates or deletes.
 * AUDT-03: Immutability enforced at application layer.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  await db.insert(auditLog).values({
    entityType: entry.entityType,
    entityId: entry.entityId,
    action: entry.action,
    userId: entry.userId,
    fieldName: entry.fieldName ?? null,
    oldValue: entry.oldValue ?? null,
    newValue: entry.newValue ?? null,
  });
}

/**
 * Log multiple field changes for the same entity in a single batch.
 * Used when multiple fields are edited at once during review.
 */
export async function logAuditBatch(entries: AuditEntry[]): Promise<void> {
  if (entries.length === 0) return;
  await db.insert(auditLog).values(
    entries.map((entry) => ({
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      userId: entry.userId,
      fieldName: entry.fieldName ?? null,
      oldValue: entry.oldValue ?? null,
      newValue: entry.newValue ?? null,
    }))
  );
}
