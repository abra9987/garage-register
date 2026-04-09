import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { vehicles } from "@/lib/db/schema";
import { apiSuccess, apiError } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";
import { vehicleApprovalSchema } from "@/lib/validation/vehicle-schema";

/**
 * POST /api/vehicles/[id]/approve -- Approve a vehicle record.
 *
 * T-03-02: Server-side validation of required fields with vehicleApprovalSchema.
 * T-03-05: Status must be pending_review to approve.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // T-03-04: Session auth guard
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return apiError("Unauthorized", 401);

  // Fetch current vehicle
  const [current] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.id, id))
    .limit(1);
  if (!current) return apiError("Vehicle not found", 404);

  // T-03-02: Status must be pending_review to approve
  if (current.status !== "pending_review") {
    return apiError(
      "Vehicle must be in pending_review status to approve",
      400,
    );
  }

  // T-03-02: Validate required fields using vehicleApprovalSchema
  try {
    vehicleApprovalSchema.parse({
      vin: current.vin,
      year: current.year,
      make: current.make,
      model: current.model,
      sellerName: current.sellerName,
      buyerName: current.buyerName,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return apiError(
        "Cannot approve: " + err.issues.map((i) => i.message).join(", "),
        400,
      );
    }
    return apiError("Validation failed", 400);
  }

  // Update status to approved
  await db
    .update(vehicles)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(vehicles.id, id));

  // T-03-06: Audit log for status change
  await logAudit({
    entityType: "vehicle",
    entityId: id,
    action: "updated",
    userId: session.user.id,
    fieldName: "status",
    oldValue: "pending_review",
    newValue: "approved",
  });

  return apiSuccess({ status: "approved" });
}

/**
 * DELETE /api/vehicles/[id]/approve -- Unapprove a vehicle record.
 *
 * T-03-05: Only approved records can be returned to review (not exported).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // T-03-04: Session auth guard
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return apiError("Unauthorized", 401);

  // Fetch current vehicle
  const [current] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.id, id))
    .limit(1);
  if (!current) return apiError("Vehicle not found", 404);

  // T-03-05: Only approved -> pending_review allowed (not exported)
  if (current.status !== "approved") {
    return apiError(
      "Only approved records can be returned to review",
      400,
    );
  }

  // Update status back to pending_review
  await db
    .update(vehicles)
    .set({ status: "pending_review", updatedAt: new Date() })
    .where(eq(vehicles.id, id));

  // T-03-06: Audit log for status change
  await logAudit({
    entityType: "vehicle",
    entityId: id,
    action: "updated",
    userId: session.user.id,
    fieldName: "status",
    oldValue: "approved",
    newValue: "pending_review",
  });

  return apiSuccess({ status: "pending_review" });
}
