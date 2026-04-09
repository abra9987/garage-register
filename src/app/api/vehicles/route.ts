import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { vehicles } from "@/lib/db/schema";
import { apiSuccess, apiError } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/vehicles — Create a new vehicle record.
 * Called when user clicks "Start Extraction" on the upload page.
 * Sets initial status to "extracting".
 */
export async function POST(request: NextRequest) {
  // T-02-08: Validate session — unauthorized access mitigation
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return apiError("Unauthorized", 401);

  const body = await request.json();
  const jobNumber = body.jobNumber || null;

  const [vehicle] = await db
    .insert(vehicles)
    .values({
      jobNumber,
      status: "extracting",
    })
    .returning();

  await logAudit({
    entityType: "vehicle",
    entityId: vehicle.id,
    action: "created",
    userId: session.user.id,
  });

  return apiSuccess({ id: vehicle.id, jobNumber: vehicle.jobNumber }, 201);
}
