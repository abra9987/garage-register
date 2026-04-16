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
import { EmailPreviewDialog } from "@/components/deals/email-preview";

function fmtPrice(value: string, cur: string): string {
  const n = parseFloat(value);
  if (!value || isNaN(n)) return "";
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
  return `${formatted} ${cur}`;
}

function genSubject(f: Record<string, string>): string {
  const parts: string[] = [];
  if (f.jobNumber) parts.push(f.jobNumber);
  const desc = [f.vehicleYear, f.vehicleMake, f.vehicleModel, f.vehicleTrim, f.bodyStyle]
    .filter(Boolean).join(" ");
  if (desc) parts.push(desc);
  const colors = [f.exteriorColor, f.interiorColor ? `on ${f.interiorColor.toLowerCase()}` : ""]
    .filter(Boolean).join(" ");
  if (colors) parts.push(colors);
  if (f.mileage) parts.push(`${Number(f.mileage).toLocaleString()} km`);
  if (f.vin) parts.push(`VIN ${f.vin}`);
  return parts.join(", ");
}

function genBody(f: Record<string, string>): string {
  const cur = f.currency || "CAD";
  const lines: string[] = [];
  if (f.msrp) lines.push(`${fmtPrice(f.msrp, cur)} MSRP`);
  if (f.buyingPrice) lines.push(`${fmtPrice(f.buyingPrice, cur)} BUYING PRICE`);
  if (f.hst) lines.push(`${fmtPrice(f.hst, cur)} HST`);
  if (f.sellingPrice) lines.push(`${fmtPrice(f.sellingPrice, cur)} Selling price`);
  if (f.commissionAmount && f.commissionFor)
    lines.push(`${fmtPrice(f.commissionAmount, cur)} for ${f.commissionFor} (included)`);
  if (f.delivery) {
    lines.push("");
    lines.push(`DELIVERY TO ${f.delivery.toUpperCase()}`);
    if (f.warehouseAddress) lines.push(f.warehouseAddress);
  }
  if (f.clientName) { lines.push(""); lines.push(f.clientName); }
  if (f.notes) lines.push(f.notes);
  return lines.join("\n");
}

function DocPreview({ file }: { file: File }) {
  const url = URL.createObjectURL(file);
  if (file.type.startsWith("image/")) {
    return <img src={url} alt={file.name} className="w-full rounded border object-contain max-h-[400px]" onLoad={() => URL.revokeObjectURL(url)} />;
  }
  return <iframe src={url} title={file.name} className="h-[500px] w-full rounded border" />;
}

export default function NewDealPage() {
  const router = useRouter();
  const [stickerFiles, setStickerFiles] = useState<File[]>([]);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extracted, setExtracted] = useState(false); // just a flag

  // All fields — editable, pre-filled from extraction
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleTrim, setVehicleTrim] = useState("");
  const [bodyStyle, setBodyStyle] = useState("");
  const [exteriorColor, setExteriorColor] = useState("");
  const [interiorColor, setInteriorColor] = useState("");
  const [vin, setVin] = useState("");
  const [mileage, setMileage] = useState("");
  const [msrp, setMsrp] = useState("");
  const [buyingPrice, setBuyingPrice] = useState("");
  const [hst, setHst] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");

  // Manual-only fields
  const [jobNumber, setJobNumber] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [currency, setCurrency] = useState("CAD");
  const [commissionAmount, setCommissionAmount] = useState("");
  const [commissionFor, setCommissionFor] = useState("");
  const [delivery, setDelivery] = useState("");
  const [warehouseAddress, setWarehouseAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const allFields: Record<string, string> = {
    jobNumber, vehicleYear, vehicleMake, vehicleModel, vehicleTrim, bodyStyle,
    exteriorColor, interiorColor, vin, mileage, msrp, buyingPrice, hst,
    sellingPrice, currency, commissionAmount, commissionFor, delivery,
    warehouseAddress, clientName, notes,
  };

  const handleExtract = useCallback(async () => {
    if (stickerFiles.length === 0 || !invoiceFile) {
      toast.error("Upload Window Sticker and Invoice");
      return;
    }
    setExtracting(true);
    setExtracted(false);
    setShowPreview(false);
    try {
      const formData = new FormData();
      for (const f of stickerFiles) formData.append("windowSticker", f);
      formData.append("invoice", invoiceFile);
      const res = await fetch("/api/deals/extract", { method: "POST", body: formData });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Extraction failed"); }
      const { data } = await res.json();

      // Pre-fill all fields from extraction
      setVehicleYear(data.vehicle_year?.toString() ?? "");
      setVehicleMake(data.vehicle_make ?? "");
      setVehicleModel(data.vehicle_model ?? "");
      setVehicleTrim(data.vehicle_trim ?? "");
      setBodyStyle(data.body_style ?? "");
      setExteriorColor(data.exterior_color ?? "");
      setInteriorColor(data.interior_color ?? "");

      setVin(data.vin ?? "");
      setMsrp(data.msrp?.toString() ?? "");
      setBuyingPrice(data.buying_price?.toString() ?? "");
      setHst(data.hst?.toString() ?? "");
      // Client fields left empty — Denis fills manually
      if (data.currency) setCurrency(data.currency);
      setExtracted(true);
      toast.success("Data extracted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  }, [stickerFiles, invoiceFile]);

  const handleSave = useCallback(async () => {
    if (!extracted) return;
    setSaving(true);
    try {
      const formData = new FormData();
      for (const f of stickerFiles) formData.append("windowSticker", f);
      if (invoiceFile) formData.append("invoice", invoiceFile);
      const createRes = await fetch("/api/deals", { method: "POST", body: formData });
      if (!createRes.ok) throw new Error("Failed to create deal");
      const { data: { id } } = await createRes.json();

      await fetch(`/api/deals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobNumber: jobNumber || null,
          vehicleYear: vehicleYear ? parseInt(vehicleYear) : null,
          vehicleMake: vehicleMake || null,
          vehicleModel: vehicleModel || null,
          vehicleTrim: vehicleTrim || null,
          bodyStyle: bodyStyle || null,
          exteriorColor: exteriorColor || null,
          interiorColor: interiorColor || null,

          vin: vin || null,
          odometer: mileage ? parseInt(mileage) : null,
          msrp: msrp || null,
          buyingPrice: buyingPrice || null,
          hst: hst || null,
          sellingPrice: sellingPrice || null,
          currency,
          commissionAmount: commissionAmount || null,
          commissionFor: commissionFor || null,
          deliveryDestination: delivery || null,
          warehouseAddress: warehouseAddress || null,
          clientName: clientName || null,
          clientAddress: clientAddress || null,
          clientPhone: clientPhone || null,
          clientEmail: clientEmail || null,
          notes: notes || null,
          emailSubject: genSubject(allFields),
          emailBody: genBody(allFields),
        }),
      });
      toast.success("Deal saved");
      router.push("/deals");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [extracted, stickerFiles, invoiceFile, jobNumber, vehicleYear, vehicleMake, vehicleModel, vehicleTrim, bodyStyle, exteriorColor, interiorColor, vin, msrp, buyingPrice, hst, sellingPrice, currency, commissionAmount, commissionFor, delivery, warehouseAddress, clientName, clientAddress, clientPhone, clientEmail, notes, allFields, router]);

  const subject = extracted && showPreview ? genSubject(allFields) : null;
  const body = extracted && showPreview ? genBody(allFields) : null;

  const handleReset = useCallback(() => {
    setStickerFiles([]); setInvoiceFile(null); setExtracted(false); setShowPreview(false);
    setVehicleYear(""); setVehicleMake(""); setVehicleModel(""); setVehicleTrim("");
    setBodyStyle(""); setExteriorColor(""); setInteriorColor(""); setMileage("");
    setVin(""); setMsrp(""); setBuyingPrice(""); setHst("");
    setClientName(""); setClientAddress(""); setClientPhone(""); setClientEmail("");
    setJobNumber(""); setSellingPrice(""); setCurrency("USD");
    setCommissionAmount(""); setCommissionFor(""); setDelivery(""); setWarehouseAddress(""); setNotes("");
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Deal</h1>
          <p className="text-sm text-muted-foreground">Upload documents, extract data, generate email for Andrey</p>
        </div>
        {extracted && <Button variant="outline" onClick={handleReset}>Start Over</Button>}
      </div>

      {/* Upload */}
      <Card>
        <CardHeader><CardTitle className="text-base">Documents</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <MultiDropZone label="Window Sticker" files={stickerFiles} maxFiles={3}
              onAdd={(f) => setStickerFiles((p) => [...p, ...f])}
              onRemove={(i) => setStickerFiles((p) => p.filter((_, idx) => idx !== i))}
              disabled={extracting} />
            <DropZone label="AP Invoice" ariaLabel="Upload AP Invoice PDF" file={invoiceFile}
              onDrop={setInvoiceFile} onRemove={() => setInvoiceFile(null)} disabled={extracting} />
          </div>
          {stickerFiles.length > 0 && invoiceFile && !extracted && (
            <div className="mt-4 flex justify-center">
              <Button onClick={handleExtract} disabled={extracting} size="lg" className="gap-2">
                {extracting && <Loader2 className="size-4 animate-spin" />}
                {extracting ? "Extracting..." : "Extract Data"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form: Documents + Editable fields side by side */}
      {extracted && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Documents</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {stickerFiles.map((f, i) => (
                <div key={`sticker-${i}`}>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Window Sticker {stickerFiles.length > 1 ? i + 1 : ""}</p>
                  <DocPreview file={f} />
                </div>
              ))}
              {invoiceFile && (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">AP Invoice</p>
                  <DocPreview file={invoiceFile} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Deal Details</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              {/* Vehicle */}
              <div>
                <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vehicle</h3>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Year</Label>
                    <Input value={vehicleYear} onChange={(e) => setVehicleYear(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Make</Label>
                    <Input value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Model</Label>
                    <Input value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Trim</Label>
                    <Input value={vehicleTrim} onChange={(e) => setVehicleTrim(e.target.value)} />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Body Style</Label>
                    <Input value={bodyStyle} onChange={(e) => setBodyStyle(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Ext. Color</Label>
                    <Input value={exteriorColor} onChange={(e) => setExteriorColor(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Int. Color</Label>
                    <Input value={interiorColor} onChange={(e) => setInteriorColor(e.target.value)} />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">VIN</Label>
                    <Input value={vin} onChange={(e) => setVin(e.target.value)} className="font-mono" />
                  </div>
                  <div>
                    <Label className="text-xs">Mileage (km)</Label>
                    <Input type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div>
                <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pricing</h3>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">MSRP</Label>
                    <Input type="number" value={msrp} onChange={(e) => setMsrp(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Buying Price</Label>
                    <Input type="number" value={buyingPrice} onChange={(e) => setBuyingPrice(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">HST</Label>
                    <Input type="number" value={hst} onChange={(e) => setHst(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Currency</Label>
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                      <option value="CAD">CAD</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Selling Price</Label>
                    <Input type="number" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Commission ($)</Label>
                    <Input type="number" value={commissionAmount} onChange={(e) => setCommissionAmount(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Commission For</Label>
                    <Input placeholder="Name" value={commissionFor} onChange={(e) => setCommissionFor(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Client */}
              <div>
                <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Address</Label>
                    <Input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Phone</Label>
                    <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Deal details */}
              <div>
                <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deal</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Job Number</Label>
                    <Input placeholder="26-J07674" value={jobNumber} onChange={(e) => setJobNumber(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Delivery To</Label>
                    <Input placeholder="City" value={delivery} onChange={(e) => setDelivery(e.target.value)} />
                  </div>
                </div>
                <div className="mt-3">
                  <Label className="text-xs">Warehouse Address</Label>
                  <Input placeholder="Full address" value={warehouseAddress} onChange={(e) => setWarehouseAddress(e.target.value)} />
                </div>
                <div className="mt-3">
                  <Label className="text-xs">Notes</Label>
                  <Textarea placeholder="Additional notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-center gap-3 pt-2">
                <Button size="lg" onClick={() => setShowPreview(true)}>Preview Email</Button>
                <Button size="lg" variant="outline" onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Save Draft
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Email Preview Dialog */}
      <EmailPreviewDialog
        open={showPreview && !!extracted}
        onOpenChange={setShowPreview}
        subject={genSubject(allFields)}
        body={genBody(allFields)}
      />
    </div>
  );
}
