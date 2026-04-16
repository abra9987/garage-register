import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deals, dealDocuments } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/deals — list all deals
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: deals.id,
      jobNumber: deals.jobNumber,
      vehicleYear: deals.vehicleYear,
      vehicleMake: deals.vehicleMake,
      vehicleModel: deals.vehicleModel,
      vehicleTrim: deals.vehicleTrim,
      bodyStyle: deals.bodyStyle,
      exteriorColor: deals.exteriorColor,
      interiorColor: deals.interiorColor,
      vin: deals.vin,
      msrp: deals.msrp,
      buyingPrice: deals.buyingPrice,
      sellingPrice: deals.sellingPrice,
      currency: deals.currency,
      clientName: deals.clientName,
      status: deals.status,
      createdAt: deals.createdAt,
    })
    .from(deals)
    .orderBy(desc(deals.createdAt));

  return NextResponse.json({ data: rows });
}

// POST /api/deals — create a new deal with files
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();

  // Create deal record
  const [deal] = await db
    .insert(deals)
    .values({
      userId: session.user.id,
      status: "draft",
    })
    .returning({ id: deals.id });

  // Save uploaded files
  const stickerFiles = formData.getAll("windowSticker") as File[];
  const invoiceFile = formData.get("invoice") as File | null;

  for (const file of stickerFiles) {
    if (!file.size) continue;
    const buffer = Buffer.from(await file.arrayBuffer());
    await db.insert(dealDocuments).values({
      dealId: deal.id,
      docType: "window_sticker",
      filename: file.name,
      fileData: buffer,
      mimeType: file.type,
      fileSize: file.size,
    });
  }

  if (invoiceFile && invoiceFile.size) {
    const buffer = Buffer.from(await invoiceFile.arrayBuffer());
    await db.insert(dealDocuments).values({
      dealId: deal.id,
      docType: "invoice",
      filename: invoiceFile.name,
      fileData: buffer,
      mimeType: invoiceFile.type,
      fileSize: invoiceFile.size,
    });
  }

  return NextResponse.json({ data: { id: deal.id } });
}
