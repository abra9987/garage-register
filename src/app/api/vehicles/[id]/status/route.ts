import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { vehicles, documents } from "@/lib/db/schema";
import { apiSuccess, apiError } from "@/lib/api-response";

/**
 * GET /api/vehicles/[id]/status — Poll extraction status and results.
 *
 * Per D-20: Client polls this endpoint every 2 seconds during extraction.
 * Per Pitfall 3: Exclude fileData bytea from document queries to avoid
 * loading large binary data on every poll.
 *
 * T-02-11: Information disclosure mitigation — only return metadata + extraction results.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // T-02-08: Validate session
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return apiError("Unauthorized", 401);

  // Select vehicle data (all columns are safe to return)
  const vehicleResult = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.id, id))
    .limit(1);
  if (!vehicleResult.length) return apiError("Vehicle not found", 404);

  // Select documents WITHOUT fileData (Pitfall 3 / T-02-11)
  const docs = await db
    .select({
      id: documents.id,
      type: documents.type,
      filename: documents.filename,
      fileSize: documents.fileSize,
      mimeType: documents.mimeType,
      uploadedAt: documents.uploadedAt,
      extractionRaw: documents.extractionRaw,
    })
    .from(documents)
    .where(eq(documents.vehicleId, id));

  return apiSuccess({
    vehicle: vehicleResult[0],
    documents: docs,
  });
}
