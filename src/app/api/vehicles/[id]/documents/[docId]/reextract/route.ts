import { NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
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
 * POST /api/vehicles/[id]/documents/[docId]/reextract
 *
 * Re-processes an existing document through the Claude API extraction pipeline
 * without requiring a new upload. D-32: Re-extract capability.
 * T-03-12: Auth guard + AND condition prevents IDOR.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const { id, docId } = await params;

  // T-03-12: Session auth guard
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return apiError("Unauthorized", 401);

  // T-03-12: AND condition ensures document belongs to vehicle
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, docId), eq(documents.vehicleId, id)))
    .limit(1);

  if (!doc) return apiError("Document not found", 404);

  // Set vehicle status to extracting
  await db
    .update(vehicles)
    .set({ status: "extracting", updatedAt: new Date() })
    .where(eq(vehicles.id, id));

  // Audit: log re-extraction trigger
  await logAudit({
    entityType: "vehicle",
    entityId: id,
    action: "updated",
    userId: session.user.id,
    fieldName: "reextraction",
    newValue: "triggered",
  });

  // Fire-and-forget background re-extraction
  runReExtraction(id, docId, doc.fileData, doc.type, session.user.id).catch(
    (err) => {
      console.error(
        `[reextract] Failed for vehicle ${id}, document ${docId}:`,
        err,
      );
    },
  );

  return apiSuccess({ status: "reextracting" });
}

/**
 * Run re-extraction in the background.
 * Replicates runExtraction logic from the upload route.
 */
async function runReExtraction(
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

    // Map extracted fields to vehicles table columns using FIELD_NAME_MAP
    const vehicleUpdate: Record<string, unknown> = {};
    const confidenceMap: Record<string, string> = {};

    for (const [snakeKey, camelKey] of Object.entries(FIELD_NAME_MAP)) {
      const value = result[snakeKey as keyof ExtractionResult];
      if (value !== undefined && snakeKey !== "confidence") {
        vehicleUpdate[camelKey] = value;
      }
      const conf = result.confidence[snakeKey];
      if (conf) {
        confidenceMap[camelKey] = conf;
      }
    }

    // VIN validation
    const vinResult = validateVin(result.vin);
    if (!vinResult.valid && result.vin) {
      confidenceMap["vin"] = "low";
      confidenceMap["vinValidation"] = vinResult.error || "VIN invalid";
    } else if (vinResult.valid) {
      confidenceMap["vinValidation"] = "valid";
    }

    // Cross-validation if both AP and AR exist
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

    // Store confidence map + conflicts
    const extractionConfidence: Record<string, unknown> = {
      ...confidenceMap,
    };
    if (conflicts) {
      extractionConfidence["conflicts"] = conflicts;
    }

    // Update vehicle with new data + set to pending_review
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
      fieldName: "reextraction",
      newValue: `Re-extracted from ${docType} document`,
    });

    console.log(
      `[reextract] Completed for vehicle ${vehicleId}, document ${documentId}`,
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    await db
      .update(documents)
      .set({ extractionRaw: { error: errorMessage } })
      .where(eq(documents.id, documentId));

    await db
      .update(vehicles)
      .set({
        extractionConfidence: { error: errorMessage },
        status: "pending_review",
        updatedAt: new Date(),
      })
      .where(eq(vehicles.id, vehicleId));

    await logAudit({
      entityType: "vehicle",
      entityId: vehicleId,
      action: "updated",
      userId,
      fieldName: "reextraction_error",
      newValue: errorMessage,
    });

    console.error(
      `[reextract] Error for vehicle ${vehicleId}, document ${documentId}:`,
      errorMessage,
    );
  }
}
