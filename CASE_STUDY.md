# AD Auto — Garage Register Automation

## Problem
- **Who:** Small auto export business owner in Ontario, Canada (AD Auto Export)
- **What was happening:** Every vehicle transaction requires manual data entry into a Ministry of Transportation Ontario Garage Register. The owner reads each PDF invoice/bill of sale and types the data (VIN, make, model, seller, buyer, prices) into an Excel spreadsheet — one row per vehicle.
- **Cost:** ~34+ transactions already logged manually for 2025-2026. Each entry requires reading 2 PDFs (purchase + sale documents) and typing 15+ fields. Estimated ~10-15 minutes per entry = ~6-8 hours/month. Risk of typos in VINs or seller names that could cause regulatory issues.

## Solution
- The system automatically reads PDF invoices and bills of sale using AI vision, extracts vehicle and transaction data, and presents it for human review before exporting to the official Ministry of Transportation Excel format.
- **Key features:**
  - Upload two PDFs per vehicle (purchase invoice + sales invoice) and get data extracted automatically
  - Works with 6+ different document formats including scanned documents without text
  - Review screen lets the owner verify and correct any data before it becomes official
  - One-click export to the exact Excel format required by Ministry of Transportation Ontario
  - Search history of all processed vehicles

## Tech Stack
- Claude API (vision) for document data extraction
- Web application (stack TBD for MVP)
- Excel export in Ministry of Transportation format

## Results
- **Before:** ~10-15 min per vehicle entry, manual reading of PDFs, risk of typos in critical fields like VIN
- **After (projected):** ~2-3 min per vehicle (upload + quick review), AI handles data extraction with 95-99% expected accuracy
- **POC accuracy on basic tools:** VIN 80%, Make 100%, Model 90%, Seller/Buyer 100% — with Claude API vision expected to reach 95-99% across all fields
- **Estimated time savings:** ~8 hours/month reduced to ~1.5 hours/month

## Screenshots
- [PDF upload screen — drag and drop AP + AR documents]
- [Extraction results with highlighted confidence levels]
- [Review/edit screen with side-by-side PDF preview and extracted fields]
- [Garage Register export preview matching Ministry format]
- [Search/history view of all processed vehicles]

## Timeline
- April 2026: POC completed — analyzed 18 real PDFs, validated extraction approach
- TBD: MVP development start

## Lessons Learned
- Document format variety is the main challenge — 6 distinct types found in just 18 documents
- Some scanned documents have OCR issues (1 out of 3 scans had partial VIN failure with basic OCR)
- VIN discrepancies found between PDFs and manual register — highlights why human review step is essential
