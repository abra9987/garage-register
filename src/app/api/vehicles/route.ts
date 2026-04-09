import { NextRequest } from "next/server";
import { desc, asc, ilike, or, and, eq, gte, lte, count, type SQL } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { vehicles } from "@/lib/db/schema";
import { apiSuccess, apiError } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";

/**
 * Allowed sort columns — whitelist to prevent T-04-09 tampering.
 */
const SORT_COLUMNS = {
  jobNumber: vehicles.jobNumber,
  vin: vehicles.vin,
  year: vehicles.year,
  make: vehicles.make,
  model: vehicles.model,
  status: vehicles.status,
  purchaseDate: vehicles.purchaseDate,
  saleDate: vehicles.saleDate,
  createdAt: vehicles.createdAt,
} as const;

type SortKey = keyof typeof SORT_COLUMNS;

const VALID_STATUSES = ["pending_review", "approved", "exported"] as const;
type FilterStatus = (typeof VALID_STATUSES)[number];

/**
 * GET /api/vehicles -- List vehicles with search, filter, sort, pagination.
 * T-04-07: Auth guard. T-04-08: Drizzle parameterized queries. T-04-09: Sort whitelist.
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return apiError("Unauthorized", 401);

  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";
  const statusParam = url.searchParams.get("status") || "";
  const sort = url.searchParams.get("sort") || "createdAt";
  const dir = url.searchParams.get("dir") || "desc";
  const pageParam = url.searchParams.get("page") || "1";
  const dateFrom = url.searchParams.get("dateFrom") || "";
  const dateTo = url.searchParams.get("dateTo") || "";

  // Build where conditions (AND logic)
  const conditions: SQL[] = [];

  // T-04-08: Search via parameterized ilike — no raw SQL concatenation
  if (q) {
    conditions.push(
      or(
        ilike(vehicles.vin, `%${q}%`),
        ilike(vehicles.jobNumber, `%${q}%`),
        ilike(vehicles.make, `%${q}%`),
        ilike(vehicles.model, `%${q}%`),
        ilike(vehicles.sellerName, `%${q}%`),
        ilike(vehicles.buyerName, `%${q}%`),
      )!
    );
  }

  // Status filter — validate against whitelist
  if (statusParam && VALID_STATUSES.includes(statusParam as FilterStatus)) {
    conditions.push(eq(vehicles.status, statusParam as FilterStatus));
  }

  // Date range filter
  if (dateFrom) {
    conditions.push(gte(vehicles.createdAt, new Date(dateFrom + "T00:00:00")));
  }
  if (dateTo) {
    conditions.push(lte(vehicles.createdAt, new Date(dateTo + "T23:59:59")));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // T-04-09: Sort column validated against whitelist, fallback to createdAt
  const sortCol = SORT_COLUMNS[sort as SortKey] ?? SORT_COLUMNS.createdAt;
  const orderByClause = dir === "asc" ? asc(sortCol) : desc(sortCol);

  // Pagination — parse page as integer with fallback
  const page = Math.max(1, parseInt(pageParam, 10) || 1);
  const pageSize = 25;
  const offset = (page - 1) * pageSize;

  const [results, [{ total }]] = await Promise.all([
    db
      .select({
        id: vehicles.id,
        jobNumber: vehicles.jobNumber,
        status: vehicles.status,
        vin: vehicles.vin,
        year: vehicles.year,
        make: vehicles.make,
        model: vehicles.model,
        purchaseDate: vehicles.purchaseDate,
        saleDate: vehicles.saleDate,
        createdAt: vehicles.createdAt,
        updatedAt: vehicles.updatedAt,
      })
      .from(vehicles)
      .where(where)
      .orderBy(orderByClause)
      .limit(pageSize)
      .offset(offset),
    db.select({ total: count() }).from(vehicles).where(where),
  ]);

  return apiSuccess({ vehicles: results, total: Number(total), page, pageSize });
}

/**
 * POST /api/vehicles -- Create a new vehicle record.
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
