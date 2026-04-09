import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { vehicles, documents } from "@/lib/db/schema";
import { apiSuccess, apiError } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";
import { extractDocument } from "@/lib/extraction/extract-document";
import { crossValidateExtractions } from "@/lib/extraction/cross-validate";
import { validateVin } from "@/lib/validation/vin";
import { FIELD_NAME_MAP, type ExtractionResult } from "@/types/extraction";

/**
 * POST /api/vehicles/[id]/upload — Upload a PDF and trigger async extraction.
 *
 * Per D-20: Upload stores PDF, starts extraction in background, returns immediately.
 * Per D-16: Store PDF as bytea in documents.fileData.
 * Per D-22: After extraction, parse results into vehicles table columns immediately.
 * Per D-24: On failure, vehicle stays in "extracting" with error in extraction_raw.
 * Per D-25: VIN validation runs immediately after extraction.
 * Per D-27/D-28: Cross-validation runs when both AP+AR exist.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // T-02-08: Validate session
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return apiError("Unauthorized", 401);

  // Verify vehicle exists
  const existing = await db
    .select({ id: vehicles.id })
    .from(vehicles)
    .where(eq(vehicles.id, id))
    .limit(1);
  if (!existing.length) return apiError("Vehicle not found", 404);

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const docType = formData.get("type") as string | null;

  // T-02-09: Validate file type and size server-side
  if (!file || file.type !== "application/pdf") {
    return apiError("Only PDF files are accepted", 400);
  }
  if (file.size > 10 * 1024 * 1024) {
    return apiError("File too large (max 10MB)", 400);
  }
  if (!docType || !["ap", "ar"].includes(docType)) {
    return apiError("Document type must be 'ap' or 'ar'", 400);
  }

  // Store PDF as bytea (D-16)
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const [doc] = await db
    .insert(documents)
    .values({
      vehicleId: id,
      type: docType as "ap" | "ar",
      filename: file.name,
      fileData: buffer,
      fileSize: file.size,
      mimeType: file.type,
    })
    .returning({ id: documents.id });

  // Update vehicle status to extracting
  await db
    .update(vehicles)
    .set({ status: "extracting", updatedAt: new Date() })
    .where(eq(vehicles.id, id));

  await logAudit({
    entityType: "document",
    entityId: doc.id,
    action: "created",
    userId: session.user.id,
    fieldName: "type",
    newValue: docType,
  });

  // Fire and forget extraction (D-20: async, returns immediately)
  runExtraction(
    id,
    doc.id,
    buffer,
    docType as "ap" | "ar",
    session.user.id,
  ).catch((err) => {
    console.error(
      `[extraction] Failed for vehicle ${id}, document ${doc.id}:`,
      err,
    );
  });

  return apiSuccess({ documentId: doc.id });
}

/**
 * Run extraction in the background after upload.
 *
 * 1. Call extractDocument() from Plan 02
 * 2. On success: store raw, map to vehicles, validate VIN, cross-validate if both docs exist
 * 3. On failure (D-24): store error, keep "extracting" status
 */
async function runExtraction(
  vehicleId: string,
  documentId: string,
  pdfBuffer: Buffer,
  docType: "ap" | "ar",
  userId: string,
): Promise<void> {
  try {
    const result = await extractDocument(pdfBuffer, docType);

    // Store raw extraction in documents.extractionRaw
    await db
      .update(documents)
      .set({ extractionRaw: result })
      .where(eq(documents.id, documentId));

    // D-22: Map extracted fields to vehicles table columns using FIELD_NAME_MAP
    const vehicleUpdate: Record<string, unknown> = {};
    const confidenceMap: Record<string, string> = {};

    for (const [snakeKey, camelKey] of Object.entries(FIELD_NAME_MAP)) {
      const value = result[snakeKey as keyof ExtractionResult];
      if (value !== undefined && snakeKey !== "confidence") {
        // Map to vehicle column
        vehicleUpdate[camelKey] = value;
      }
      // Map confidence
      const conf = result.confidence[snakeKey];
      if (conf) {
        confidenceMap[camelKey] = conf;
      }
    }

    // D-25: VIN validation runs immediately after extraction
    const vinResult = validateVin(result.vin);
    if (!vinResult.valid && result.vin) {
      // D-26: Invalid VIN flagged as "low" confidence with specific error
      confidenceMap["vin"] = "low";
      confidenceMap["vinValidation"] = vinResult.error || "VIN invalid";
    } else if (vinResult.valid) {
      confidenceMap["vinValidation"] = "valid";
    }

    // D-27/D-28: Check if both AP and AR documents exist for cross-validation
    // Pitfall 3: Exclude fileData from document queries
    const allDocs = await db
      .select({
        id: documents.id,
        type: documents.type,
        extractionRaw: documents.extractionRaw,
      })
      .from(documents)
      .where(eq(documents.vehicleId, vehicleId));

    const apDoc = allDocs.find((d) => d.type === "ap" && d.extractionRaw);
    const arDoc = allDocs.find((d) => d.type === "ar" && d.extractionRaw);

    let conflicts = null;
    if (apDoc && arDoc) {
      const crossResult = crossValidateExtractions(
        apDoc.extractionRaw as ExtractionResult,
        arDoc.extractionRaw as ExtractionResult,
      );
      if (crossResult.hasConflicts) {
        conflicts = crossResult.conflicts;
      }
    }

    // Store confidence map + conflicts in vehicles.extractionConfidence
    const extractionConfidence: Record<string, unknown> = {
      ...confidenceMap,
    };
    if (conflicts) {
      extractionConfidence["conflicts"] = conflicts;
    }

    // Update vehicle with extracted data + confidence + set to pending_review
    await db
      .update(vehicles)
      .set({
        ...vehicleUpdate,
        extractionConfidence,
        status: "pending_review",
        updatedAt: new Date(),
      })
      .where(eq(vehicles.id, vehicleId));

    await logAudit({
      entityType: "vehicle",
      entityId: vehicleId,
      action: "updated",
      userId,
      fieldName: "extraction",
      newValue: `Extracted from ${docType} document`,
    });

    console.log(
      `[extraction] Completed for vehicle ${vehicleId}, document ${documentId}`,
    );
  } catch (error) {
    // D-24: On failure, store error and keep "extracting" status
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    await db
      .update(documents)
      .set({
        extractionRaw: { error: errorMessage },
      })
      .where(eq(documents.id, documentId));

    // Update status to indicate failure (keep extracting for polling to detect)
    await db
      .update(vehicles)
      .set({
        extractionConfidence: { error: errorMessage },
        updatedAt: new Date(),
      })
      .where(eq(vehicles.id, vehicleId));

    await logAudit({
      entityType: "vehicle",
      entityId: vehicleId,
      action: "updated",
      userId,
      fieldName: "extraction_error",
      newValue: errorMessage,
    });

    console.error(
      `[extraction] Error for vehicle ${vehicleId}, document ${documentId}:`,
      errorMessage,
    );
  }
}
