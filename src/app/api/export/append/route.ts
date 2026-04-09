import { NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { vehicles } from "@/lib/db/schema";
import { apiError } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";
import {
  appendToExistingRegister,
  type VehicleExportData,
} from "@/lib/export/garage-register";

/** Maximum number of vehicle IDs per export request (T-04-05: DoS mitigation) */
const MAX_VEHICLE_IDS = 500;

/** Maximum uploaded XLSX file size: 10 MB (T-04-03: file size limit) */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Allowed MIME types for XLSX upload (T-04-03: file type validation) */
const ALLOWED_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // Some browsers report generic binary type for .xlsx files
  "application/octet-stream",
];

/**
 * POST /api/export/append -- Append selected approved vehicles to an existing Garage Register XLSX.
 *
 * Accepts multipart FormData with:
 * - file: The existing XLSX file to append to
 * - vehicleIds: JSON string array of vehicle UUIDs
 *
 * T-04-01: Auth guard via session check.
 * T-04-02: Only vehicles with status="approved" can be exported.
 * T-04-03: File type and size validation.
 * T-04-05: vehicleIds array limited to 500 entries.
 * XPRT-02, XPRT-03, XPRT-05: Append to existing + audit trail.
 */
export async function POST(request: NextRequest) {
  try {
    // T-04-01: Auth guard
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return apiError("Unauthorized", 401);

    // Parse multipart FormData
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return apiError("Invalid form data", 400);
    }

    // Validate file
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return apiError("XLSX file is required", 400);
    }

    // T-04-03: Validate file extension
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".xlsx")) {
      return apiError("Only .xlsx files are accepted", 400);
    }

    // T-04-03: Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return apiError(
        "Invalid file type. Please upload a valid .xlsx file",
        400,
      );
    }

    // T-04-03: Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return apiError("File size exceeds 10 MB limit", 400);
    }

    // Parse vehicleIds from FormData
    const vehicleIdsRaw = formData.get("vehicleIds");
    if (!vehicleIdsRaw || typeof vehicleIdsRaw !== "string") {
      return apiError("vehicleIds is required as a JSON string array", 400);
    }

    let vehicleIds: unknown;
    try {
      vehicleIds = JSON.parse(vehicleIdsRaw);
    } catch {
      return apiError("vehicleIds must be valid JSON", 400);
    }

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

    // Read uploaded file to Buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

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

    // Append records to existing XLSX
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

    const buffer = await appendToExistingRegister(fileBuffer, exportData);

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

    // Preserve original filename from upload
    const responseFilename = file.name;

    // Cast Buffer for TS 5.9+ compatibility (Buffer<ArrayBufferLike> vs BodyInit)
    return new Response(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${responseFilename}"`,
      },
    });
  } catch (error) {
    console.error("Append export failed:", error);
    return apiError(
      "Append failed. Please check the uploaded file and try again.",
      500,
    );
  }
}
