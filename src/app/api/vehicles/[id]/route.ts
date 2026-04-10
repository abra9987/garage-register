import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { vehicles, documents } from "@/lib/db/schema";
import { apiSuccess, apiError } from "@/lib/api-response";
import { logAudit, logAuditBatch } from "@/lib/audit";
import { vehicleSaveSchema } from "@/lib/validation/vehicle-schema";

/**
 * GET /api/vehicles/[id] -- Returns vehicle data + document metadata for the review page.
 *
 * T-03-07: Documents query excludes fileData bytea column; only metadata returned.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // T-03-04: Session auth guard
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return apiError("Unauthorized", 401);

  // Query vehicle
  const vehicleResult = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.id, id))
    .limit(1);
  if (!vehicleResult.length) return apiError("Vehicle not found", 404);

  // Query documents WITHOUT fileData (T-03-07: no bytea in JSON response)
  const docs = await db
    .select({
      id: documents.id,
      vehicleId: documents.vehicleId,
      type: documents.type,
      filename: documents.filename,
      fileSize: documents.fileSize,
      mimeType: documents.mimeType,
      uploadedAt: documents.uploadedAt,
      extractionRaw: documents.extractionRaw,
    })
    .from(documents)
    .where(eq(documents.vehicleId, id));

  return apiSuccess({ vehicle: vehicleResult[0], documents: docs });
}

/**
 * PUT /api/vehicles/[id] -- Update vehicle fields during review.
 *
 * T-03-01: All input validated with vehicleSaveSchema (Zod) before DB write.
 * T-03-06: logAuditBatch creates append-only audit entries for every field change.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // T-03-04: Session auth guard
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return apiError("Unauthorized", 401);

  // Parse and validate request body
  let parsed;
  try {
    const body = await request.json();
    parsed = vehicleSaveSchema.parse(body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return apiError(
        "Validation failed: " + err.issues.map((i) => i.message).join(", "),
        400,
      );
    }
    return apiError("Invalid request body", 400);
  }

  // Fetch current vehicle to compute field diffs for audit
  const [current] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.id, id))
    .limit(1);
  if (!current) return apiError("Vehicle not found", 404);

  // Build update object from parsed fields, excluding undefined values
  // Only update fields that were actually sent in the request body
  const updateObj: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (value !== undefined) {
      // Drizzle numeric(10,2) columns expect strings -- convert numbers for price fields
      if ((key === "purchasePrice" || key === "salePrice") && value !== null) {
        updateObj[key] = String(value);
      } else {
        updateObj[key] = value;
      }
    }
  }
  updateObj.updatedAt = new Date();

  // T-03-06: Compute audit entries for changed fields
  type AuditEntry = {
    entityType: string;
    entityId: string;
    action: "updated";
    userId: string;
    fieldName: string;
    oldValue: string;
    newValue: string;
  };
  const auditEntries: AuditEntry[] = [];

  for (const [key, newValue] of Object.entries(updateObj)) {
    if (key === "updatedAt") continue;
    const oldValue = current[key as keyof typeof current];
    // Compare as strings to detect actual changes
    const oldStr = String(oldValue ?? "");
    const newStr = String(newValue ?? "");
    if (oldStr !== newStr) {
      auditEntries.push({
        entityType: "vehicle",
        entityId: id,
        action: "updated",
        userId: session.user.id,
        fieldName: key,
        oldValue: oldStr,
        newValue: newStr,
      });
    }
  }

  if (auditEntries.length > 0) {
    await logAuditBatch(auditEntries);
  }

  // Execute update
  const [updated] = await db
    .update(vehicles)
    .set(updateObj)
    .where(eq(vehicles.id, id))
    .returning();

  return apiSuccess({ vehicle: updated });
}

/**
 * DELETE /api/vehicles/[id] -- Delete vehicle and its documents.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return apiError("Unauthorized", 401);

  const [vehicle] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.id, id))
    .limit(1);
  if (!vehicle) return apiError("Vehicle not found", 404);

  // Log audit before delete (vehicle data still available)
  await logAudit({
    entityType: "vehicle",
    entityId: id,
    action: "deleted",
    userId: session.user.id,
    oldValue: [vehicle.jobNumber, vehicle.year, vehicle.make, vehicle.model]
      .filter(Boolean)
      .join(" ") || undefined,
  });

  // Delete documents first (foreign key constraint)
  await db.delete(documents).where(eq(documents.vehicleId, id));
  await db.delete(vehicles).where(eq(vehicles.id, id));

  return apiSuccess({ deleted: true });
}
