import { NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { apiError } from "@/lib/api-response";

/**
 * GET /api/vehicles/[id]/documents/[docId]/content -- Serve raw PDF binary.
 *
 * Returns binary PDF data for react-pdf preview in the review UI.
 * T-03-03: AND condition (vehicleId + docId) prevents IDOR.
 * T-03-04: Session auth required.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const { id, docId } = await params;

  // T-03-04: Session auth guard
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return apiError("Unauthorized", 401);

  // T-03-03: AND condition ensures document belongs to the specified vehicle (IDOR mitigation)
  const [doc] = await db
    .select({
      fileData: documents.fileData,
      filename: documents.filename,
      mimeType: documents.mimeType,
    })
    .from(documents)
    .where(and(eq(documents.id, docId), eq(documents.vehicleId, id)))
    .limit(1);

  if (!doc) return apiError("Document not found", 404);

  // Return raw binary -- NOT apiSuccess since we're serving binary data, not JSON
  return new Response(doc.fileData as unknown as BodyInit, {
    headers: {
      "Content-Type": doc.mimeType || "application/pdf",
      "Content-Disposition": `inline; filename="${doc.filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
