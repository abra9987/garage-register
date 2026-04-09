import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";
import { apiSuccess, apiError } from "@/lib/api-response";

/**
 * DELETE /api/admin/cleanup -- Clear all audit log entries.
 * Admin-only endpoint for resetting test data.
 */
export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return apiError("Unauthorized", 401);
  if (session.user.role !== "admin") return apiError("Forbidden", 403);

  const result = await db.delete(auditLog).returning({ id: auditLog.id });

  return apiSuccess({ deletedCount: result.length });
}
