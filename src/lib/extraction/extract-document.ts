import { getAnthropicClient } from "./claude-client";
import {
  EXTRACTION_SYSTEM_PROMPT,
  EXTRACTION_JSON_SCHEMA,
  getExtractionUserPrompt,
} from "./extraction-prompt";
import { ExtractionSchema, type ExtractionResult } from "@/types/extraction";

/** Model to use for extraction -- Claude Sonnet 4.6 per D-18 */
const EXTRACTION_MODEL = "claude-sonnet-4-6";

/** Max tokens for extraction response -- bounded per T-02-07 */
const MAX_TOKENS = 4096;

/** Max retry attempts on rate limit (429) or overload (529) errors */
const MAX_RETRIES = 1;

/** Base delay in ms before retry (exponential backoff) */
const RETRY_BASE_DELAY_MS = 1000;

/**
 * Error class for extraction-specific failures.
 */
export class ExtractionError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "api_error"
      | "parse_error"
      | "validation_error"
      | "rate_limited"
      | "overloaded",
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ExtractionError";
  }
}

/**
 * Check if an error is retryable (429 rate limit or 529 overloaded).
 */
function isRetryableError(error: unknown): boolean {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status: number }).status;
    return status === 429 || status === 529;
  }
  return false;
}

/**
 * Sleep for the given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract vehicle transaction data from a PDF document using Claude API.
 *
 * Sends the PDF as a base64 document content block to Claude Sonnet 4.6
 * with structured JSON output. The response is validated through the
 * ExtractionSchema Zod schema before being returned.
 *
 * @param pdfBuffer - Raw PDF file data
 * @param docType - "ap" for purchase invoice, "ar" for sale invoice
 * @returns Validated ExtractionResult with all fields and confidence map
 * @throws ExtractionError on API, parsing, or validation failures
 */
export async function extractDocument(
  pdfBuffer: Buffer,
  docType: "ap" | "ar",
): Promise<ExtractionResult> {
  const pdfBase64 = pdfBuffer.toString("base64");
  const userPrompt = getExtractionUserPrompt(docType);

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Wait before retry (skip on first attempt)
      if (attempt > 0) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(
          `[extraction] Retry attempt ${attempt} after ${delay}ms delay`,
        );
        await sleep(delay);
      }

      const response = await getAnthropicClient().messages.create({
        model: EXTRACTION_MODEL,
        max_tokens: MAX_TOKENS,
        system: EXTRACTION_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: pdfBase64,
                },
              },
              {
                type: "text",
                text: userPrompt,
              },
            ],
          },
        ],
        output_config: {
          format: EXTRACTION_JSON_SCHEMA,
        },
      });

      // Log token usage for cost tracking (per RESEARCH.md Open Question 3)
      console.log(
        `[extraction] Token usage -- input_tokens: ${response.usage.input_tokens}, output_tokens: ${response.usage.output_tokens}`,
      );

      // Extract JSON text from response content blocks
      const jsonBlock = response.content.find(
        (block) => block.type === "text",
      );
      if (!jsonBlock || jsonBlock.type !== "text") {
        throw new ExtractionError(
          "Claude API response contained no text content block",
          "parse_error",
        );
      }

      // Parse JSON response
      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonBlock.text);
      } catch (parseErr) {
        throw new ExtractionError(
          `Failed to parse extraction JSON: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
          "parse_error",
          parseErr,
        );
      }

      // Validate through Zod schema (T-02-05 mitigation)
      const result = ExtractionSchema.parse(parsed);
      return result;
    } catch (error) {
      lastError = error;

      // If it's already an ExtractionError (parse/validation), don't retry
      if (error instanceof ExtractionError) {
        throw error;
      }

      // Retry on 429/529 if attempts remain
      if (isRetryableError(error) && attempt < MAX_RETRIES) {
        console.warn(
          `[extraction] Retryable error (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`,
          error instanceof Error ? error.message : String(error),
        );
        continue;
      }

      // Non-retryable or exhausted retries
      if (isRetryableError(error)) {
        const status = (error as { status: number }).status;
        throw new ExtractionError(
          `Claude API ${status === 429 ? "rate limited" : "overloaded"} after ${MAX_RETRIES + 1} attempts`,
          status === 429 ? "rate_limited" : "overloaded",
          error,
        );
      }

      throw new ExtractionError(
        `Claude API error: ${error instanceof Error ? error.message : String(error)}`,
        "api_error",
        error,
      );
    }
  }

  // Should not reach here, but TypeScript needs it
  throw new ExtractionError(
    `Extraction failed after ${MAX_RETRIES + 1} attempts`,
    "api_error",
    lastError,
  );
}
