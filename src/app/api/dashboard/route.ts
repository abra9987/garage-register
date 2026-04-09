import { NextRequest } from "next/server";
import { desc, eq, and, gte, count } from "drizzle-orm";
import { startOfMonth } from "date-fns";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { vehicles, auditLog } from "@/lib/db/schema";
import { apiSuccess, apiError } from "@/lib/api-response";

/**
 * GET /api/dashboard -- Dashboard stats + recent activity.
 * T-04-07: Auth guard. DASH-01, DASH-02, DASH-03.
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return apiError("Unauthorized", 401);

  const [
    [{ pendingCount }],
    [{ exportedThisMonthCount }],
    [{ totalCount }],
    recentActivity,
  ] = await Promise.all([
    db
      .select({ pendingCount: count() })
      .from(vehicles)
      .where(eq(vehicles.status, "pending_review")),
    db
      .select({ exportedThisMonthCount: count() })
      .from(vehicles)
      .where(
        and(
          eq(vehicles.status, "exported"),
          gte(vehicles.exportedAt, startOfMonth(new Date()))
        )
      ),
    db.select({ totalCount: count() }).from(vehicles),
    db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        fieldName: auditLog.fieldName,
        timestamp: auditLog.timestamp,
        jobNumber: vehicles.jobNumber,
        year: vehicles.year,
        make: vehicles.make,
        model: vehicles.model,
      })
      .from(auditLog)
      .leftJoin(vehicles, eq(auditLog.entityId, vehicles.id))
      .where(eq(auditLog.entityType, "vehicle"))
      .orderBy(desc(auditLog.timestamp))
      .limit(20),
  ]);

  return apiSuccess({
    stats: {
      pendingReview: Number(pendingCount),
      exportedThisMonth: Number(exportedThisMonthCount),
      totalVehicles: Number(totalCount),
    },
    recentActivity,
  });
}
