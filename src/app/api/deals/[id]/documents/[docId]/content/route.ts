import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dealDocuments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/deals/[id]/documents/[docId]/content — stream file binary
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { docId } = await params;

  const [doc] = await db
    .select()
    .from(dealDocuments)
    .where(eq(dealDocuments.id, docId));

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(doc.fileData), {
    headers: {
      "Content-Type": doc.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${doc.filename}"`,
      "Content-Length": String(doc.fileSize),
    },
  });
}
