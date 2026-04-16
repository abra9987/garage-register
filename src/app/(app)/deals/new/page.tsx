"use client";

import { useState, useCallback } from "react";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropZone } from "@/components/upload/drop-zone";
import { MultiDropZone } from "@/components/deals/multi-drop-zone";
import { EmailPreview } from "@/components/deals/email-preview";

interface ExtractedData {
  vehicle_year: number | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_trim: string | null;
  body_style: string | null;
  exterior_color: string | null;
  interior_color: string | null;
  engine: string | null;
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

function formatPrice(value: number | null, cur: string): string {
  if (value === null) return "";
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${formatted} ${cur}`;
}

function generateSubject(data: ExtractedData, jobNumber: string): string {
  const parts: string[] = [];
  if (jobNumber) parts.push(jobNumber);

  const vehicleDesc = [
    data.vehicle_year,
    data.vehicle_make,
    data.vehicle_model,
    data.vehicle_trim,
    data.body_style,
  ]
    .filter(Boolean)
    .join(" ");
  if (vehicleDesc) parts.push(vehicleDesc);

  const colors = [
    data.exterior_color,
    data.interior_color ? `on ${data.interior_color.toLowerCase()}` : null,
  ]
    .filter(Boolean)
    .join(" ");
  if (colors) parts.push(colors);

  if (data.vin) parts.push(`VIN ${data.vin}`);

  return parts.join(", ");
}

function generateBody(
  data: ExtractedData,
  manual: {
    sellingPrice: string;
    currency: string;
    commissionAmount: string;
    commissionFor: string;
    delivery: string;
    warehouseAddress: string;
    notes: string;
  },
): string {
  const cur = manual.currency;
  const lines: string[] = [];

  if (data.msrp !== null) lines.push(`${formatPrice(data.msrp, cur)} MSRP`);
  if (data.buying_price !== null)
    lines.push(`${formatPrice(data.buying_price, cur)} BUYING PRICE`);
  if (data.hst !== null) lines.push(`${formatPrice(data.hst, cur)} HST`);
  if (manual.sellingPrice) {
    const sp = parseFloat(manual.sellingPrice);
    if (!isNaN(sp)) lines.push(`${formatPrice(sp, cur)} Selling price`);
  }
  if (manual.commissionAmount && manual.commissionFor) {
    const ca = parseFloat(manual.commissionAmount);
    if (!isNaN(ca))
      lines.push(`${formatPrice(ca, cur)} for ${manual.commissionFor}`);
  }

  if (manual.delivery) {
    lines.push("");
    lines.push(`DELIVERY TO ${manual.delivery.toUpperCase()}`);
    if (manual.warehouseAddress) lines.push(manual.warehouseAddress);
  }

  if (data.client_name) {
    lines.push("");
    lines.push(data.client_name);
  }

  if (manual.notes) lines.push(manual.notes);

  return lines.join("\n");
}

function DocPreview({ file }: { file: File }) {
  const url = URL.createObjectURL(file);
  const isImage = file.type.startsWith("image/");

  if (isImage) {
    return (
      <img
        src={url}
        alt={file.name}
        className="w-full rounded border object-contain max-h-[400px]"
        onLoad={() => URL.revokeObjectURL(url)}
      />
    );
  }
  // PDF — use iframe
  return (
    <iframe
      src={url}
      title={file.name}
      className="h-[500px] w-full rounded border"
    />
  );
}

export default function NewDealPage() {
  const router = useRouter();
  const [stickerFiles, setStickerFiles] = useState<File[]>([]);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);

  const [jobNumber, setJobNumber] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [commissionAmount, setCommissionAmount] = useState("");
  const [commissionFor, setCommissionFor] = useState("");
  const [delivery, setDelivery] = useState("");
  const [warehouseAddress, setWarehouseAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [showPreview, setShowPreview] = useState(false);

  const handleExtract = useCallback(async () => {
    if (stickerFiles.length === 0 || !invoiceFile) {
      toast.error("Upload Window Sticker and Invoice");
      return;
    }

    setExtracting(true);
    setExtracted(null);
    setShowPreview(false);

    try {
      const formData = new FormData();
      for (const f of stickerFiles) {
        formData.append("windowSticker", f);
      }
      formData.append("invoice", invoiceFile);

      const res = await fetch("/api/deals/extract", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Extraction failed");
      }

      const { data } = (await res.json()) as { data: ExtractedData };
      setExtracted(data);
      if (data.currency) setCurrency(data.currency);
      toast.success("Data extracted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Extraction failed",
      );
    } finally {
      setExtracting(false);
    }
  }, [stickerFiles, invoiceFile]);

  const handleSave = useCallback(async () => {
    if (!extracted) return;

    const subj = generateSubject(extracted, jobNumber);
    const bod = generateBody(extracted, {
      sellingPrice,
      currency,
      commissionAmount,
      commissionFor,
      delivery,
      warehouseAddress,
      notes,
    });

    setSaving(true);
    try {
      // 1. Create deal with files
      const formData = new FormData();
      for (const f of stickerFiles) {
        formData.append("windowSticker", f);
      }
      if (invoiceFile) formData.append("invoice", invoiceFile);

      const createRes = await fetch("/api/deals", {
        method: "POST",
        body: formData,
      });
      if (!createRes.ok) throw new Error("Failed to create deal");
      const { data: { id } } = await createRes.json();

      // 2. Update deal with extracted + manual data
      const updateRes = await fetch(`/api/deals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobNumber: jobNumber || null,
          vehicleYear: extracted.vehicle_year,
          vehicleMake: extracted.vehicle_make,
          vehicleModel: extracted.vehicle_model,
          vehicleTrim: extracted.vehicle_trim,
          bodyStyle: extracted.body_style,
          exteriorColor: extracted.exterior_color,
          interiorColor: extracted.interior_color,
          engine: extracted.engine,
          vin: extracted.vin,
          msrp: extracted.msrp?.toString() ?? null,
          buyingPrice: extracted.buying_price?.toString() ?? null,
          hst: extracted.hst?.toString() ?? null,
          sellingPrice: sellingPrice || null,
          currency,
          commissionAmount: commissionAmount || null,
          commissionFor: commissionFor || null,
          deliveryDestination: delivery || null,
          warehouseAddress: warehouseAddress || null,
          clientName: extracted.client_name,
          clientAddress: extracted.client_address,
          clientPhone: extracted.client_phone,
          clientEmail: extracted.client_email,
          notes: notes || null,
          emailSubject: subj,
          emailBody: bod,
        }),
      });
      if (!updateRes.ok) throw new Error("Failed to save deal");

      toast.success("Deal saved");
      router.push("/deals");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save",
      );
    } finally {
      setSaving(false);
    }
  }, [
    extracted,
    jobNumber,
    sellingPrice,
    currency,
    commissionAmount,
    commissionFor,
    delivery,
    warehouseAddress,
    notes,
    stickerFiles,
    invoiceFile,
    router,
  ]);

  const subject =
    extracted && showPreview ? generateSubject(extracted, jobNumber) : null;
  const body =
    extracted && showPreview
      ? generateBody(extracted, {
          sellingPrice,
          currency,
          commissionAmount,
          commissionFor,
          delivery,
          warehouseAddress,
          notes,
        })
      : null;

  const handleReset = useCallback(() => {
    setStickerFiles([]);
    setInvoiceFile(null);
    setExtracted(null);
    setShowPreview(false);
    setJobNumber("");
    setSellingPrice("");
    setCurrency("USD");
    setCommissionAmount("");
    setCommissionFor("");
    setDelivery("");
    setWarehouseAddress("");
    setNotes("");
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Deal</h1>
          <p className="text-sm text-muted-foreground">
            Upload documents, extract data, generate email for Andrey
          </p>
        </div>
        {extracted && (
          <Button variant="outline" onClick={handleReset}>
            Start Over
          </Button>
        )}
      </div>

      {/* Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <MultiDropZone
              label="Window Sticker"
              files={stickerFiles}
              maxFiles={3}
              onAdd={(newFiles) =>
                setStickerFiles((prev) => [...prev, ...newFiles])
              }
              onRemove={(i) =>
                setStickerFiles((prev) => prev.filter((_, idx) => idx !== i))
              }
              disabled={extracting}
            />
            <DropZone
              label="AP Invoice"
              ariaLabel="Upload AP Invoice PDF"
              file={invoiceFile}
              onDrop={setInvoiceFile}
              onRemove={() => setInvoiceFile(null)}
              disabled={extracting}
            />
          </div>

          {stickerFiles.length > 0 && invoiceFile && !extracted && (
            <div className="mt-4 flex justify-center">
              <Button
                onClick={handleExtract}
                disabled={extracting}
                size="lg"
                className="gap-2"
              >
                {extracting && <Loader2 className="size-4 animate-spin" />}
                {extracting ? "Extracting..." : "Extract Data"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review: Documents + Form side by side */}
      {extracted && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: Document previews */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stickerFiles.map((f, i) => (
                <div key={`sticker-${i}`}>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    Window Sticker {stickerFiles.length > 1 ? i + 1 : ""}
                  </p>
                  <DocPreview file={f} />
                </div>
              ))}
              {invoiceFile && (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    AP Invoice
                  </p>
                  <DocPreview file={invoiceFile} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: Extracted data + manual fields */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Deal Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Vehicle */}
              <div>
                <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Vehicle
                </h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">Description: </span>
                    <span className="font-medium">
                      {[
                        extracted.vehicle_year,
                        extracted.vehicle_make,
                        extracted.vehicle_model,
                        extracted.vehicle_trim,
                        extracted.body_style,
                      ]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">VIN: </span>
                    <span className="font-mono font-medium">
                      {extracted.vin || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Colors: </span>
                    <span>
                      {[extracted.exterior_color, extracted.interior_color]
                        .filter(Boolean)
                        .join(" on ") || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Engine: </span>
                    <span>{extracted.engine || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div>
                <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Pricing
                </h3>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">MSRP: </span>
                    <span className="font-medium">
                      {extracted.msrp !== null
                        ? formatPrice(extracted.msrp, currency)
                        : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Buying: </span>
                    <span className="font-medium">
                      {extracted.buying_price !== null
                        ? formatPrice(extracted.buying_price, currency)
                        : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">HST: </span>
                    <span className="font-medium">
                      {extracted.hst !== null
                        ? formatPrice(extracted.hst, currency)
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Client */}
              {extracted.client_name && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Client
                  </h3>
                  <p className="text-sm font-medium">
                    {extracted.client_name}
                  </p>
                  {extracted.client_address && (
                    <p className="text-sm text-muted-foreground">
                      {extracted.client_address}
                    </p>
                  )}
                </div>
              )}

              {/* Manual fields */}
              <div>
                <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Deal Terms
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="jobNumber" className="text-xs">
                      Job Number
                    </Label>
                    <Input
                      id="jobNumber"
                      placeholder="26-J07674"
                      value={jobNumber}
                      onChange={(e) => setJobNumber(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sellingPrice" className="text-xs">
                      Selling Price
                    </Label>
                    <Input
                      id="sellingPrice"
                      type="number"
                      placeholder="99500"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="currency" className="text-xs">
                      Currency
                    </Label>
                    <select
                      id="currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="USD">USD</option>
                      <option value="CAD">CAD</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="commissionAmount" className="text-xs">
                      Commission ($)
                    </Label>
                    <Input
                      id="commissionAmount"
                      type="number"
                      placeholder="1000"
                      value={commissionAmount}
                      onChange={(e) => setCommissionAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="commissionFor" className="text-xs">
                      Commission For
                    </Label>
                    <Input
                      id="commissionFor"
                      placeholder="Name"
                      value={commissionFor}
                      onChange={(e) => setCommissionFor(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="delivery" className="text-xs">
                      Delivery To
                    </Label>
                    <Input
                      id="delivery"
                      placeholder="City"
                      value={delivery}
                      onChange={(e) => setDelivery(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="warehouseAddress" className="text-xs">
                      Warehouse Address
                    </Label>
                    <Input
                      id="warehouseAddress"
                      placeholder="Full address"
                      value={warehouseAddress}
                      onChange={(e) => setWarehouseAddress(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <Label htmlFor="notes" className="text-xs">
                    Notes
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-center gap-3 pt-2">
                <Button size="lg" onClick={() => setShowPreview(true)}>
                  Preview Email
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleSave}
                  disabled={saving}
                  className="gap-2"
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Save Draft
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Email Preview */}
      {subject && body && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Email Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <EmailPreview subject={subject} body={body} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
