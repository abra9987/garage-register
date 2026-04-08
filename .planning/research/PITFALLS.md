# Pitfalls Research

**Domain:** LLM vision document extraction for regulatory vehicle data (Ontario Garage Register)
**Researched:** 2026-04-08
**Confidence:** HIGH (verified against Anthropic official docs, production post-mortems, and domain-specific research)

## Critical Pitfalls

### Pitfall 1: VIN Character Confusion From Vision Extraction

**What goes wrong:**
Claude vision misreads visually ambiguous characters in VINs: `0` vs `O`, `1` vs `I` vs `l`, `8` vs `B`, `5` vs `S`. The POC already shows 80% VIN accuracy -- meaning 1 in 5 VINs has errors. A single wrong character in a VIN submitted to the Ministry of Transportation Ontario creates a regulatory compliance problem. The VIN check digit (position 9) only catches errors with ~91% probability (1/11 chance of false pass), so check digit validation alone is insufficient.

**Why it happens:**
LLMs are generative systems, not faithful character reproducers. When the model is uncertain whether a character is `0` or `O`, it outputs whatever seems most plausible based on context -- with no indication it was guessing. Scanned documents (~15% of Andrey's volume) make this worse. VINs are 17-character alphanumeric strings with no natural language context to help the model self-correct. Additionally, VINs never contain I, O, or Q, but Claude does not inherently know this constraint.

**How to avoid:**
1. Implement three-layer VIN validation: (a) format check -- exactly 17 chars, no I/O/Q, (b) check digit algorithm verification, (c) character substitution fuzzy matching (try swapping confusable chars like 0/O, 1/I, 8/B when check digit fails).
2. Include VIN format rules in the extraction prompt: "VINs never contain the letters I, O, or Q. They are exactly 17 characters."
3. For failed VIN validation, show Andrey the original PDF page alongside the extracted VIN so he can visually compare.
4. Consider NHTSA VIN Decoder API as a secondary validation -- if the decoded make/model matches the document, the VIN is almost certainly correct.

**Warning signs:**
- VIN check digit failures exceeding 5% of documents
- Andrey frequently correcting VIN characters during review
- Pattern of specific character substitutions (always the same confusions)

**Phase to address:**
Phase 1 (core extraction) -- VIN validation must ship with the extraction pipeline, never after. This is the single most important accuracy feature in the entire system.

---

### Pitfall 2: Treating LLM Extraction as Deterministic

**What goes wrong:**
The same PDF sent to Claude twice can produce slightly different JSON output -- different field formatting, different interpretations of ambiguous values, occasional hallucinated fields. Developers build their system assuming extraction is deterministic (like regex or OCR), then discover in production that results are inconsistent. This leads to subtle data quality degradation that is hard to detect because each individual extraction "looks right."

**Why it happens:**
LLMs are probabilistic. Even at temperature 0, there can be minor variations. More importantly, the model may interpret the same ambiguous text differently based on surrounding context in the prompt or minor API behavior changes across model versions. Anthropic periodically updates models, which can shift extraction behavior without notice.

**How to avoid:**
1. Set `temperature: 0` for all extraction calls -- reduces but does not eliminate variation.
2. Design the system so that every extraction goes through human review before export. Never auto-export to XLSX without Andrey seeing the data.
3. Store the raw Claude API response alongside the parsed data so you can re-extract later if the model improves.
4. Use structured output schemas (JSON mode or tool_use) to constrain output format -- do not rely on free-text extraction parsed with regex.
5. Pin to a specific model version (e.g., `claude-sonnet-4-6-20260514`) rather than using `claude-sonnet-4-6` which auto-updates.

**Warning signs:**
- Same document produces different values on re-extraction
- Field formatting varies (e.g., dates sometimes "2024-01-15", sometimes "Jan 15, 2024")
- New extraction errors appearing after Anthropic model updates

**Phase to address:**
Phase 1 (extraction pipeline design) -- the schema and validation layer must be designed from day one assuming non-determinism.

---

### Pitfall 3: Numerical Value Hallucination

**What goes wrong:**
Claude vision misreads numbers on invoices -- dollar amounts, odometer readings, year values. Research shows "text was usually extracted correctly; numbers were not" in controlled LLM extraction experiments. A misread price (e.g., $38,000 read as $88,000) or wrong model year in the Garage Register is a regulatory data integrity issue. The POC showed 90% model accuracy, meaning 1 in 10 model names was wrong -- likely tied to number/character confusion in model codes.

**Why it happens:**
LLMs approximate numerical values rather than faithfully reproducing them character by character. Unlike text (where the model can use language context for self-correction), numbers have no semantic redundancy. A price of "$38,450" and "$88,450" are equally plausible to the model. Scanned documents with compression artifacts make this worse.

**How to avoid:**
1. For critical numerical fields (price, year, odometer), implement range validation: year must be 1980-2027, price must be $1-$500,000, odometer must be 0-999,999.
2. Cross-validate between AP and AR documents: the vehicle year, make, and model should match across the purchase and sale PDFs for the same job number.
3. Use Claude's native PDF support (not image conversion) for text-based PDFs -- the extracted text layer is more reliable than vision for numbers.
4. In the prompt, explicitly instruct: "Extract numerical values character by character. Do not round or approximate."
5. Add per-field confidence signals: ask Claude to flag any values it is uncertain about.

**Warning signs:**
- Prices that seem unusually high or low for the vehicle type
- Year values that do not match the VIN (positions 10 encodes model year)
- Odometer readings that seem implausible

**Phase to address:**
Phase 1 (extraction) for range validation, Phase 2 (review UI) for cross-document comparison.

---

### Pitfall 4: XLSX Template Format Drift

**What goes wrong:**
The generated XLSX does not exactly match the Ministry of Transportation Ontario Garage Register template. Column widths are off, cell styles are lost, merged cells break, date formats render differently, or the print layout is wrong. Andrey submits the register and it gets rejected or questioned. When using ExcelJS to read an existing template and populate it, the library silently drops certain style information (specifically cellStyleXfs styles) and may not preserve complex formatting like conditional formatting, data validation rules, or print areas.

**Why it happens:**
XLSX is a complex XML-based format with dozens of style properties. ExcelJS preserves themes but has known issues with cellStyleXfs styles. Developers test with simple cases (a few rows, basic formatting) and miss that the actual ministry template has specific column widths, header formatting, print areas, and possibly data validation. The "append to existing file" mode is especially treacherous because modifying a real XLSX while preserving all formatting is much harder than generating from scratch.

**How to avoid:**
1. Get the exact ministry XLSX template and byte-compare your output against a known-good submission from Andrey.
2. Use xlsx-populate or xlsx-template for the "append to existing" mode rather than ExcelJS -- these libraries are better at preserving existing formatting while injecting data.
3. Build automated visual regression tests: generate XLSX, open it, screenshot, compare against reference.
4. Test with LibreOffice (Coolify/Docker) AND Microsoft Excel -- they render XLSX differently.
5. Store a reference XLSX template in the repo and load it every time rather than building from scratch.
6. For "generate new" mode, use ExcelJS to build from scratch with explicit style definitions matching the template exactly.

**Warning signs:**
- Column widths change after read/write cycle
- Cell borders or header formatting disappear
- Date fields showing serial numbers instead of formatted dates
- Print preview does not match the original template

**Phase to address:**
Phase 2 (XLSX export) -- must be validated against actual ministry submissions before going to production.

---

### Pitfall 5: API Cost Blow-Up From Naive PDF Processing

**What goes wrong:**
At 50 docs/month on a $2-5/month budget, the margin for error is thin. Developers send full multi-page PDFs when only page 1 matters. They use Sonnet when Haiku would suffice for 90% of documents. They re-extract on every edit rather than caching results. Costs quietly climb to $15-20/month, or a single re-processing batch burns through the monthly budget.

**Why it happens:**
Claude's PDF processing converts each page to an image (~1,600 tokens per page) PLUS extracts text (1,500-3,000 tokens per page). A 3-page invoice costs ~10,000-14,000 tokens. At Sonnet 4.6 pricing ($3/M input + $15/M output), that is roughly $0.03-0.05 per document for extraction. At 50 docs/month = $1.50-2.50 just for extraction, which fits the budget -- but only if you do not re-process, send extra pages, or use a more expensive model.

**How to avoid:**
1. Use Claude Haiku 4.5 ($1/$5 per M tokens) as the default extraction model -- research shows equivalent accuracy for structured data extraction from standardized documents. Reserve Sonnet for the ~10% of documents Haiku struggles with (OMVIC forms, French BOS).
2. Send only the relevant page(s) of multi-page PDFs, not the entire document. Most invoices have critical data on page 1.
3. Cache extraction results aggressively -- store the full API response in PostgreSQL. Never re-extract unless the user explicitly requests it.
4. Use native PDF document support (not image conversion) for text-based PDFs -- cheaper token usage since it leverages the text layer.
5. Track and display API costs per extraction in the admin dashboard so Andrey can see spend.
6. Consider the Batch API (50% discount) for non-urgent re-processing tasks.

**Warning signs:**
- Monthly API cost exceeding $5
- Average tokens per document exceeding 15,000
- Re-extraction happening on every page load instead of using cached results
- All documents being sent to the same (expensive) model

**Phase to address:**
Phase 1 (extraction pipeline) -- model selection and caching must be part of the initial architecture.

---

### Pitfall 6: Prompt Fragility Across Document Types

**What goes wrong:**
A prompt optimized for simple dealer invoices fails on OMVIC forms (scattered fields) or Quebec BOS (French). Developers build one prompt, test it on 2-3 document types, ship it, and then discover it produces garbage or hallucinated data on the other formats. The POC already identified 6 distinct document types with varying complexity -- a single extraction prompt will not handle all of them well.

**Why it happens:**
Different document formats have radically different layouts. A simple invoice has fields in predictable positions. An OMVIC form scatters vehicle data across multiple sections with checkboxes, regulatory text, and form numbers. The Quebec BOS is in French. A single generic prompt ("extract vehicle data from this invoice") provides insufficient guidance for the model to locate the right fields in complex layouts.

**How to avoid:**
1. Build a document type classifier (can be a simple Haiku call) that runs before extraction, then route to a format-specific extraction prompt.
2. Create per-format prompt templates with explicit field location hints: "On OMVIC forms, the VIN is typically in Section 3, upper right area."
3. Include 1-2 few-shot examples per document type in the system prompt (use prompt caching to amortize the cost).
4. Test every prompt change against all 6 document types before deploying -- regression testing with the 18 POC PDFs.
5. Store prompt versions in the database so you can roll back if a prompt change degrades quality.

**Warning signs:**
- Accuracy drops significantly for specific document types after a prompt change
- New document format submitted by Andrey that does not match any known type
- Extraction returning null/empty for fields that clearly exist in the PDF

**Phase to address:**
Phase 1 (extraction) -- document classification and per-type prompts should be the initial architecture, not a later optimization.

---

### Pitfall 7: Silent Extraction Failures That Look Correct

**What goes wrong:**
Claude returns a well-formed JSON response with plausible-looking data that is actually wrong. The Make is "Toyota" when the document says "Honda." The seller name is pulled from the wrong section of the document. The price includes tax when it should be pre-tax. Because the output is syntactically valid and the values are plausible, no validation catches it. Andrey approves it because he is processing quickly and the data "looks right."

**Why it happens:**
LLMs hallucinate confidently. Unlike OCR which produces garbled text on failures (easy to spot), LLMs produce clean, plausible wrong answers. A model that reads "Honda" as "Toyota" does so because it is generating text, not copying it. The human reviewer is also at risk of confirmation bias -- they see a reasonable-looking value and approve without checking the original PDF.

**How to avoid:**
1. Display the original PDF page side-by-side with extracted data during review -- force Andrey to see the source.
2. Implement cross-field consistency checks: VIN decode should match extracted make/model/year.
3. Add confidence signals per field: ask Claude "For each field, indicate if you are certain, uncertain, or guessing." Highlight uncertain fields in yellow/red in the review UI.
4. For the AP/AR pair, cross-validate: the vehicle should have the same VIN, make, model, and year on both documents.
5. Never auto-approve. Every extraction must get explicit human confirmation before export.

**Warning signs:**
- VIN-decoded make/model does not match extracted make/model
- AP and AR documents for the same job show different vehicle details
- Andrey reports finding errors after submission to the ministry

**Phase to address:**
Phase 1 (extraction) for confidence signals, Phase 2 (review UI) for side-by-side comparison and cross-validation.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Single generic extraction prompt for all doc types | Faster initial development | Accuracy drops on complex formats (OMVIC, Quebec BOS), requires constant prompt tweaking | Never -- the 6 doc types are known upfront, build per-type from the start |
| Storing only extracted data, not raw API responses | Simpler database schema | Cannot re-process or audit extraction quality when model improves, cannot debug wrong extractions | Never -- storage is cheap, auditability is critical for regulatory data |
| Using `claude-sonnet-4-6` without version pinning | Always gets latest model | Extraction behavior changes unexpectedly after Anthropic updates, causing silent regressions | Never -- always pin to a specific version string |
| Building XLSX from scratch instead of template-based | Easier initial implementation | Formatting does not exactly match ministry template, discovered only when Andrey submits | Only for initial prototype -- switch to template-based before production |
| Skipping image preprocessing (rotation, contrast) | Fewer dependencies to manage | 15% of documents are scans -- poor quality scans produce worse extraction results | Acceptable in MVP, but add preprocessing in Phase 2 |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Anthropic Claude API | Sending full multi-page PDFs when only page 1 has relevant data | Extract/send only relevant pages; use page parameter to limit processing |
| Anthropic Claude API | Not handling rate limits (Tier 1: 20K input TPM) | Implement exponential backoff with jitter; queue extractions; show "processing" state to user |
| Anthropic Claude API | Using vision (image) mode for text-based PDFs | Use native PDF document support -- cheaper and more accurate for PDFs with text layers |
| ExcelJS | Reading existing XLSX, modifying, writing back -- assuming formatting is preserved | Test read/write cycle against ministry template; consider xlsx-populate for append mode |
| PostgreSQL (shared) | No connection pooling on shared Coolify instance -- other apps (Invoice Ledger, CRM, DealManager) compete for connections | Use connection pooling (PgBouncer or Prisma connection pool); set connection limits per app |
| NHTSA VIN Decoder API | Assuming it is always available and fast | Cache VIN decode results; implement graceful degradation if API is down; do not block extraction on VIN decode |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Synchronous PDF extraction blocking the UI | User uploads PDF, UI freezes for 5-15 seconds while waiting for Claude API response | Async extraction with status polling; show "Extracting..." state; process in background | Immediately -- Claude API latency is 3-15 seconds per call |
| No extraction result caching | Same PDF re-processed on every page load or navigation | Cache extraction results in PostgreSQL; only re-extract on explicit user action | At 50 docs/month, each re-view doubles API cost |
| Large base64 PDF payloads in API requests | Slow uploads, 32MB request limit hit on larger documents | Use Files API for repeated processing; compress images in PDFs before sending | When PDFs exceed 5-10MB (common with high-res scans) |
| Loading all vehicle records in dashboard | Dashboard becomes slow as record count grows over months | Paginate with cursor-based pagination; index on created_at and job_number | At ~200-300 records (4-6 months of operation) |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing Anthropic API key in frontend code or .env committed to repo | API key exposure, unauthorized usage, cost blow-up | Store API key in environment variable on Coolify; never expose to browser; all API calls go through server-side API routes |
| No authentication on API routes | Anyone with the URL can upload PDFs and consume API credits | Implement auth from day one; even single-user app needs login to prevent unauthorized access |
| Uploaded PDFs stored without access control | Sensitive financial documents (invoices, bills of sale) accessible to anyone | Store PDFs in a non-public directory; serve through authenticated API route; never put in /public |
| No input validation on uploaded files | Malicious files uploaded disguised as PDFs | Validate MIME type AND file magic bytes; limit file size; sanitize filenames |
| Logging full API responses containing PII | Vehicle owner names, addresses, financial data in server logs | Redact PII from logs; only log extraction metadata (doc type, confidence, field count) |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing raw extraction results without confidence indicators | Andrey cannot tell which fields need careful review vs which are reliable | Color-code fields: green (high confidence), yellow (uncertain), red (failed validation) |
| Requiring Andrey to manually match AP and AR PDFs to a vehicle | Error-prone, tedious -- wrong PDFs get paired | Auto-detect job number from documents; suggest pairing; show visual confirmation |
| Forcing sequential upload (one PDF at a time) | Slow workflow -- Andrey has stacks of paired documents | Allow drag-and-drop of both AP + AR PDFs simultaneously |
| Technical error messages from Claude API | "Error 429: Rate limit exceeded" means nothing to Andrey | Translate to user-friendly: "The system is busy. Your document will be processed in a few moments." with automatic retry |
| No way to see the original PDF during review | Andrey has to open the PDF separately to compare | Side-by-side view: extracted data on left, original PDF on right |
| Export workflow that does not show preview | Andrey exports to XLSX without seeing what the output looks like | Show XLSX preview (table view) before export; allow corrections |

## "Looks Done But Isn't" Checklist

- [ ] **VIN extraction:** Often missing check digit validation and character substitution logic -- verify that VINs with swapped 0/O or 1/I are caught and corrected
- [ ] **XLSX export:** Often missing exact column width, cell border, and print area matching -- verify by comparing generated XLSX against a known-good ministry submission opened in Excel
- [ ] **PDF extraction:** Often missing handling for rotated/upside-down scans -- verify with a deliberately rotated test PDF
- [ ] **Confidence scoring:** Often missing per-field confidence display -- verify that uncertain fields are visually distinct from confident ones
- [ ] **Error recovery:** Often missing graceful handling of Claude API failures (timeout, rate limit, 500) -- verify by simulating API failures
- [ ] **Audit trail:** Often missing immutable history of what was extracted vs what was manually corrected -- verify that edits are tracked, not just current state
- [ ] **Cost tracking:** Often missing visibility into API spend -- verify that per-document and monthly cost tracking exists
- [ ] **French document handling:** Often missing -- verify extraction works correctly on Quebec BOS with French field labels
- [ ] **Append to existing XLSX:** Often missing preservation of existing rows and formatting when adding new records -- verify with a real Garage Register file containing previous entries

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| VIN errors submitted to ministry | HIGH | Re-submit corrected register; implement VIN validation retroactively; re-process all existing records |
| XLSX format rejected by ministry | MEDIUM | Compare against template; fix formatting; re-export all records; this is purely technical, no data loss |
| API cost overshoot | LOW | Switch to Haiku model; implement caching; reduce page count per extraction; costs reset monthly |
| Prompt regression after model update | MEDIUM | Roll back to pinned model version; restore previous prompt version from database; re-test against all 6 doc types |
| Silent extraction errors discovered late | HIGH | Audit all approved records; re-extract with improved prompts; Andrey must manually verify corrected records against originals |
| Data loss from shared PostgreSQL | HIGH | Regular backups; implement point-in-time recovery; this affects all AD Auto apps on the shared instance |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| VIN character confusion | Phase 1: Core extraction | VIN validation passes on all 18 POC PDFs; check digit + format + substitution logic all present |
| Non-deterministic extraction | Phase 1: Extraction pipeline | Same PDF produces identical parsed output on repeated extraction; model version is pinned |
| Numerical hallucination | Phase 1: Extraction + Phase 2: Review UI | Range validation catches impossible values; AP/AR cross-validation implemented |
| XLSX template drift | Phase 2: Export | Generated XLSX opens correctly in Excel; formatting matches ministry template pixel-for-pixel |
| API cost blow-up | Phase 1: Architecture | Cost tracking shows per-document spend; Haiku used as default; extraction results cached |
| Prompt fragility | Phase 1: Extraction | All 6 document types tested with per-type prompts; regression test suite against 18 POC PDFs |
| Silent extraction failures | Phase 1: Extraction + Phase 2: Review UI | Confidence signals displayed; side-by-side PDF comparison available; cross-field validation active |

## Sources

- [Anthropic Claude Vision Documentation](https://platform.claude.com/docs/en/build-with-claude/vision) -- official limitations: hallucination on low-quality/rotated images, spatial reasoning limits
- [Anthropic Claude PDF Support Documentation](https://platform.claude.com/docs/en/build-with-claude/pdf-support) -- token costs: 1,500-3,000 text tokens + ~1,600 image tokens per page
- [Anthropic Pricing](https://platform.claude.com/docs/en/about-claude/pricing) -- Haiku 4.5: $1/$5, Sonnet 4.6: $3/$15 per million tokens
- [Anthropic Rate Limits](https://platform.claude.com/docs/en/api/rate-limits) -- Tier 1: 20K input TPM for Sonnet-class
- [Don't Use LLMs as OCR: Lessons Learned (Medium)](https://medium.com/@martia_es/dont-use-llms-as-ocr-lessons-learned-from-extracting-complex-documents-db2d1fafcdfb) -- numbers misread, OCR for extraction + LLM for reasoning
- [Claude Structured Outputs Documentation](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) -- JSON mode with schema validation
- [VIN Check Digit Algorithm (Wikibooks)](https://en.wikibooks.org/wiki/Vehicle_Identification_Numbers_(VIN_codes)/Check_digit) -- 1/11 false pass rate, I/O/Q not allowed
- [NHTSA VIN Decoder](https://www.nhtsa.gov/vin-decoder) -- free API for VIN validation and vehicle data lookup
- [ExcelJS cellStyleXfs Bug (GitHub Issue #2830)](https://github.com/exceljs/exceljs/issues/2830) -- styles from cellStyleXfs not preserved on read/write
- [Confidence Signals for LLM Extraction (Sensible Blog)](https://www.sensible.so/blog/confidence-signals) -- per-field uncertainty signals over numeric confidence scores
- [The State of PDF Parsing: 800+ Documents Benchmark (Applied AI)](https://www.applied-ai.com/briefings/pdf-parsing-benchmark/) -- parser accuracy varies 55+ percentage points by document type
- [OMVIC Garage Register Requirements](https://www.omvic.ca/selling/sales-operations/garage-register/) -- electronic format permitted since 2006

---
*Pitfalls research for: LLM vision document extraction for Ontario Garage Register automation*
*Researched: 2026-04-08*
