import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deals, dealDocuments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/deals/[id] — get deal with document metadata
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [deal] = await db.select().from(deals).where(eq(deals.id, id));
  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  // Get docs without file_data (too large for JSON)
  const docs = await db
    .select({
      id: dealDocuments.id,
      docType: dealDocuments.docType,
      filename: dealDocuments.filename,
      mimeType: dealDocuments.mimeType,
      fileSize: dealDocuments.fileSize,
      uploadedAt: dealDocuments.uploadedAt,
    })
    .from(dealDocuments)
    .where(eq(dealDocuments.dealId, id));

  return NextResponse.json({ data: { ...deal, documents: docs } });
}

// PUT /api/deals/[id] — update deal fields
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const [updated] = await db
    .update(deals)
    .set({
      ...body,
      updatedAt: new Date(),
    })
    .where(eq(deals.id, id))
    .returning({ id: deals.id });

  if (!updated) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  return NextResponse.json({ data: updated });
}

// DELETE /api/deals/[id] — delete deal and its documents
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Delete documents first (FK constraint)
  await db.delete(dealDocuments).where(eq(dealDocuments.dealId, id));
  const [deleted] = await db
    .delete(deals)
    .where(eq(deals.id, id))
    .returning({ id: deals.id });

  if (!deleted) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  return NextResponse.json({ data: { id: deleted.id } });
}
