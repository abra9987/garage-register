import { getAnthropicClient } from "./claude-client";
import {
  DEAL_EXTRACTION_SYSTEM_PROMPT,
  DEAL_EXTRACTION_JSON_SCHEMA,
  getDealExtractionUserPrompt,
} from "./deal-prompt";
import type Anthropic from "@anthropic-ai/sdk";

const EXTRACTION_MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 4096;

export interface DealExtractionResult {
  vehicle_year: number | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_trim: string | null;
  body_style: string | null;
  exterior_color: string | null;
  interior_color: string | null;
  vin: string | null;
  msrp: number | null;
  buying_price: number | null;
  hst: number | null;
  currency: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  client_name: string | null;
  client_address: string | null;
  client_phone: string | null;
  client_email: string | null;
}

export interface FileInput {
  buffer: Buffer;
  mimeType: string;
}

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

function isImageType(mime: string): mime is ImageMediaType {
  return ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mime);
}

/**
 * Extract deal data from window sticker files + invoice.
 * Supports multiple window sticker files (PDF or images).
 */
export async function extractDeal(
  stickerFiles: FileInput[],
  invoiceFile: FileInput,
): Promise<DealExtractionResult> {
  const contentBlocks: Anthropic.MessageCreateParams["messages"][0]["content"] =
    [];

  // Add window sticker files (PDF or images)
  for (const file of stickerFiles) {
    const base64 = file.buffer.toString("base64");

    if (file.mimeType === "application/pdf") {
      contentBlocks.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: base64,
        },
      });
    } else if (isImageType(file.mimeType)) {
      contentBlocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: file.mimeType,
          data: base64,
        },
      });
    }
  }

  // Add invoice (always PDF)
  const invoiceBase64 = invoiceFile.buffer.toString("base64");
  contentBlocks.push({
    type: "document",
    source: {
      type: "base64",
      media_type: "application/pdf",
      data: invoiceBase64,
    },
  });

  // Add extraction prompt
  contentBlocks.push({
    type: "text",
    text: getDealExtractionUserPrompt(),
  });

  const response = await getAnthropicClient().messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: MAX_TOKENS,
    system: DEAL_EXTRACTION_SYSTEM_PROMPT,
    messages: [{ role: "user", content: contentBlocks }],
    output_config: {
      format: DEAL_EXTRACTION_JSON_SCHEMA,
    },
  });

  console.log(
    `[deal-extraction] Token usage -- input: ${response.usage.input_tokens}, output: ${response.usage.output_tokens}`,
  );

  const jsonBlock = response.content.find((block) => block.type === "text");
  if (!jsonBlock || jsonBlock.type !== "text") {
    throw new Error("Claude API response contained no text content block");
  }

  return JSON.parse(jsonBlock.text) as DealExtractionResult;
}
