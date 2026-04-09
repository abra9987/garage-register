import { NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { vehicles } from "@/lib/db/schema";
import { apiError } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";
import {
  generateNewGarageRegister,
  type VehicleExportData,
} from "@/lib/export/garage-register";

/** Maximum number of vehicle IDs per export request (T-04-05: DoS mitigation) */
const MAX_VEHICLE_IDS = 500;

/**
 * POST /api/export -- Export selected approved vehicles as a new Garage Register XLSX.
 *
 * T-04-01: Auth guard via session check.
 * T-04-02: Only vehicles with status="approved" can be exported.
 * T-04-05: vehicleIds array limited to 500 entries.
 * XPRT-01, XPRT-04, XPRT-05: New export + audit trail.
 */
export async function POST(request: NextRequest) {
  try {
    // T-04-01: Auth guard
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return apiError("Unauthorized", 401);

    // Parse and validate body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("Invalid request body", 400);
    }

    const { vehicleIds } = body as { vehicleIds?: unknown };

    // Validate vehicleIds is a non-empty string array
    if (
      !Array.isArray(vehicleIds) ||
      vehicleIds.length === 0 ||
      !vehicleIds.every((id): id is string => typeof id === "string")
    ) {
      return apiError(
        "vehicleIds must be a non-empty array of string UUIDs",
        400,
      );
    }

    // T-04-05: Limit array size to prevent DoS
    if (vehicleIds.length > MAX_VEHICLE_IDS) {
      return apiError(
        `Cannot export more than ${MAX_VEHICLE_IDS} records at once`,
        400,
      );
    }

    // Fetch only approved records matching the given IDs
    const records = await db
      .select({
        id: vehicles.id,
        jobNumber: vehicles.jobNumber,
        vin: vehicles.vin,
        year: vehicles.year,
        make: vehicles.make,
        model: vehicles.model,
        color: vehicles.color,
        odometer: vehicles.odometer,
        sellerName: vehicles.sellerName,
        sellerAddress: vehicles.sellerAddress,
        buyerName: vehicles.buyerName,
        buyerAddress: vehicles.buyerAddress,
        purchaseDate: vehicles.purchaseDate,
        saleDate: vehicles.saleDate,
      })
      .from(vehicles)
      .where(
        and(inArray(vehicles.id, vehicleIds), eq(vehicles.status, "approved")),
      );

    if (records.length === 0) {
      return apiError("No approved records found for the given IDs", 400);
    }

    // Generate XLSX
    const exportData: VehicleExportData[] = records.map((r) => ({
      jobNumber: r.jobNumber,
      vin: r.vin,
      year: r.year,
      make: r.make,
      model: r.model,
      color: r.color,
      odometer: r.odometer,
      sellerName: r.sellerName,
      sellerAddress: r.sellerAddress,
      buyerName: r.buyerName,
      buyerAddress: r.buyerAddress,
      purchaseDate: r.purchaseDate,
      saleDate: r.saleDate,
    }));

    const buffer = await generateNewGarageRegister(exportData);

    // Mark records as exported with timestamp
    const recordIds = records.map((r) => r.id);
    await db
      .update(vehicles)
      .set({
        status: "exported",
        exportedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(inArray(vehicles.id, recordIds));

    // XPRT-05: Audit log each exported record
    for (const record of records) {
      await logAudit({
        entityType: "vehicle",
        entityId: record.id,
        action: "exported",
        userId: session.user.id,
      });
    }

    // D-44: Filename with date
    const filename = `Garage_Register_${format(new Date(), "yyyy-MM-dd")}.xlsx`;

    // Cast Buffer for TS 5.9+ compatibility (Buffer<ArrayBufferLike> vs BodyInit)
    return new Response(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export failed:", error);
    return apiError("Export failed. Please try again.", 500);
  }
}
