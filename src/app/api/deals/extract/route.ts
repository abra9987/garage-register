import { NextRequest, NextResponse } from "next/server";
import { extractDeal, type FileInput } from "@/lib/extraction/extract-deal";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const stickerFiles = formData.getAll("windowSticker") as File[];
    const invoice = formData.get("invoice") as File | null;

    if (stickerFiles.length === 0 || !invoice) {
      return NextResponse.json(
        { error: "At least one Window Sticker and Invoice are required" },
        { status: 400 },
      );
    }

    // Convert sticker files to FileInput[]
    const stickerInputs: FileInput[] = [];
    for (const file of stickerFiles) {
      if (!file.size) continue;
      stickerInputs.push({
        buffer: Buffer.from(await file.arrayBuffer()),
        mimeType: file.type,
      });
    }

    const invoiceInput: FileInput = {
      buffer: Buffer.from(await invoice.arrayBuffer()),
      mimeType: invoice.type,
    };

    const result = await extractDeal(stickerInputs, invoiceInput);

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[api/deals/extract] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Extraction failed",
      },
      { status: 500 },
    );
  }
}
