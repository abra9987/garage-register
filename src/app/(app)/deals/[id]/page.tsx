"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmailPreview } from "@/components/deals/email-preview";

interface DocMeta {
  id: string;
  docType: string;
  filename: string;
  mimeType: string | null;
  fileSize: number;
}

interface DealData {
  id: string;
  status: string;
  createdAt: string;
  documents: DocMeta[];
}

function fmtPrice(value: string, cur: string): string {
  const n = parseFloat(value);
  if (!value || isNaN(n)) return "";
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits: 2,
  }).format(n);
  return `${formatted} ${cur}`;
}

function genSubject(f: Record<string, string>): string {
  const parts: string[] = [];
  if (f.jobNumber) parts.push(f.jobNumber);
  const desc = [f.vehicleYear, f.vehicleMake, f.vehicleModel, f.vehicleTrim, f.bodyStyle].filter(Boolean).join(" ");
  if (desc) parts.push(desc);
  const colors = [f.exteriorColor, f.interiorColor ? `on ${f.interiorColor.toLowerCase()}` : ""].filter(Boolean).join(" ");
  if (colors) parts.push(colors);
  if (f.vin) parts.push(`VIN ${f.vin}`);
  return parts.join(", ");
}

function genBody(f: Record<string, string>): string {
  const cur = f.currency || "CAD";
  const lines: string[] = [];
  if (f.mileage) lines.push(`${Number(f.mileage).toLocaleString()} km`);
  lines.push("");
  if (f.msrp) lines.push(`${fmtPrice(f.msrp, cur)} MSRP`);
  if (f.buyingPrice) lines.push(`${fmtPrice(f.buyingPrice, cur)} BUYING PRICE`);
  if (f.hst) lines.push(`${fmtPrice(f.hst, cur)} HST`);
  if (f.sellingPrice) lines.push(`${fmtPrice(f.sellingPrice, cur)} Selling price`);
  if (f.commissionAmount && f.commissionFor)
    lines.push(`${fmtPrice(f.commissionAmount, cur)} for ${f.commissionFor}`);
  if (f.delivery) {
    lines.push(""); lines.push(`DELIVERY TO ${f.delivery.toUpperCase()}`);
    if (f.warehouseAddress) lines.push(f.warehouseAddress);
  }
  if (f.clientName) { lines.push(""); lines.push(f.clientName); }
  if (f.notes) lines.push(f.notes);
  return lines.join("\n");
}

function DocViewer({ dealId, doc }: { dealId: string; doc: DocMeta }) {
  const url = `/api/deals/${dealId}/documents/${doc.id}/content`;
  if (doc.mimeType?.startsWith("image/")) {
    return <img src={url} alt={doc.filename} className="w-full rounded border object-contain max-h-[400px]" />;
  }
  return <iframe src={url} title={doc.filename} className="h-[500px] w-full rounded border" />;
}

export default function DealEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [deal, setDeal] = useState<DealData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // All editable fields
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

  useEffect(() => {
    fetch(`/api/deals/${id}`)
      .then((res) => res.json())
      .then(({ data }) => {
        setDeal({ id: data.id, status: data.status, createdAt: data.createdAt, documents: data.documents });
        setVehicleYear(data.vehicleYear?.toString() ?? "");
        setVehicleMake(data.vehicleMake ?? "");
        setVehicleModel(data.vehicleModel ?? "");
        setVehicleTrim(data.vehicleTrim ?? "");
        setBodyStyle(data.bodyStyle ?? "");
        setExteriorColor(data.exteriorColor ?? "");
        setInteriorColor(data.interiorColor ?? "");
        setVin(data.vin ?? "");
        setMileage(data.odometer?.toString() ?? "");
        setMsrp(data.msrp ?? "");
        setBuyingPrice(data.buyingPrice ?? "");
        setHst(data.hst ?? "");
        setClientName(data.clientName ?? "");
        setClientAddress(data.clientAddress ?? "");
        setClientPhone(data.clientPhone ?? "");
        setClientEmail(data.clientEmail ?? "");
        setJobNumber(data.jobNumber ?? "");
        setSellingPrice(data.sellingPrice ?? "");
        setCurrency(data.currency ?? "CAD");
        setCommissionAmount(data.commissionAmount ?? "");
        setCommissionFor(data.commissionFor ?? "");
        setDelivery(data.deliveryDestination ?? "");
        setWarehouseAddress(data.warehouseAddress ?? "");
        setNotes(data.notes ?? "");
        if (data.emailSubject) setShowPreview(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = useCallback(async () => {
    if (!deal) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/deals/${id}`, {
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
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Draft saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [deal, id, allFields, jobNumber, vehicleYear, vehicleMake, vehicleModel, vehicleTrim, bodyStyle, exteriorColor, interiorColor, vin, mileage, msrp, buyingPrice, hst, sellingPrice, currency, commissionAmount, commissionFor, delivery, warehouseAddress, clientName, clientAddress, clientPhone, clientEmail, notes]);

  const handleDelete = useCallback(async () => {
    if (!confirm("Delete this deal? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/deals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Deal deleted");
      router.push("/deals");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }, [id, router]);

  if (loading) {
    return <div className="mx-auto max-w-5xl space-y-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>;
  }
  if (!deal) {
    return <div className="mx-auto max-w-5xl"><p className="text-muted-foreground">Deal not found</p></div>;
  }

  const stickers = deal.documents.filter((d) => d.docType === "window_sticker");
  const invoices = deal.documents.filter((d) => d.docType === "invoice");
  const vehicleDesc = [vehicleYear, vehicleMake, vehicleModel, vehicleTrim, bodyStyle].filter(Boolean).join(" ");

  const subject = showPreview ? genSubject(allFields) : null;
  const body = showPreview ? genBody(allFields) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/deals")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">
              {jobNumber && <span className="text-primary">{jobNumber} </span>}
              {vehicleDesc || "Deal"}
            </h1>
            <Badge variant={deal.status === "sent" ? "default" : "secondary"}>{deal.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Created {new Date(deal.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleDelete} disabled={deleting} className="text-destructive hover:text-destructive">
          {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Documents</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {stickers.map((doc, i) => (
              <div key={doc.id}>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Window Sticker{stickers.length > 1 ? ` ${i + 1}` : ""}</p>
                <DocViewer dealId={deal.id} doc={doc} />
              </div>
            ))}
            {invoices.map((doc) => (
              <div key={doc.id}>
                <p className="mb-1 text-xs font-medium text-muted-foreground">AP Invoice</p>
                <DocViewer dealId={deal.id} doc={doc} />
              </div>
            ))}
            {deal.documents.length === 0 && <p className="text-sm text-muted-foreground">No documents attached</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Deal Details</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vehicle</h3>
              <div className="grid grid-cols-4 gap-3">
                <div><Label className="text-xs">Year</Label><Input value={vehicleYear} onChange={(e) => setVehicleYear(e.target.value)} /></div>
                <div><Label className="text-xs">Make</Label><Input value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} /></div>
                <div><Label className="text-xs">Model</Label><Input value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} /></div>
                <div><Label className="text-xs">Trim</Label><Input value={vehicleTrim} onChange={(e) => setVehicleTrim(e.target.value)} /></div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div><Label className="text-xs">Body Style</Label><Input value={bodyStyle} onChange={(e) => setBodyStyle(e.target.value)} /></div>
                <div><Label className="text-xs">Ext. Color</Label><Input value={exteriorColor} onChange={(e) => setExteriorColor(e.target.value)} /></div>
                <div><Label className="text-xs">Int. Color</Label><Input value={interiorColor} onChange={(e) => setInteriorColor(e.target.value)} /></div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div><Label className="text-xs">VIN</Label><Input value={vin} onChange={(e) => setVin(e.target.value)} className="font-mono" /></div>
                <div><Label className="text-xs">Mileage (km)</Label><Input type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} /></div>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pricing</h3>
              <div className="grid grid-cols-4 gap-3">
                <div><Label className="text-xs">MSRP</Label><Input type="number" value={msrp} onChange={(e) => setMsrp(e.target.value)} /></div>
                <div><Label className="text-xs">Buying Price</Label><Input type="number" value={buyingPrice} onChange={(e) => setBuyingPrice(e.target.value)} /></div>
                <div><Label className="text-xs">HST</Label><Input type="number" value={hst} onChange={(e) => setHst(e.target.value)} /></div>
                <div>
                  <Label className="text-xs">Currency</Label>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    <option value="CAD">CAD</option><option value="USD">USD</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div><Label className="text-xs">Selling Price</Label><Input type="number" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} /></div>
                <div><Label className="text-xs">Commission ($)</Label><Input type="number" value={commissionAmount} onChange={(e) => setCommissionAmount(e.target.value)} /></div>
                <div><Label className="text-xs">Commission For</Label><Input placeholder="Name" value={commissionFor} onChange={(e) => setCommissionFor(e.target.value)} /></div>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Name</Label><Input value={clientName} onChange={(e) => setClientName(e.target.value)} /></div>
                <div><Label className="text-xs">Address</Label><Input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} /></div>
                <div><Label className="text-xs">Phone</Label><Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} /></div>
                <div><Label className="text-xs">Email</Label><Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} /></div>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deal</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Job Number</Label><Input placeholder="26-J07674" value={jobNumber} onChange={(e) => setJobNumber(e.target.value)} /></div>
                <div><Label className="text-xs">Delivery To</Label><Input placeholder="City" value={delivery} onChange={(e) => setDelivery(e.target.value)} /></div>
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

      {subject && body && (
        <Card>
          <CardHeader><CardTitle className="text-base">Email Preview</CardTitle></CardHeader>
          <CardContent><EmailPreview subject={subject} body={body} /></CardContent>
        </Card>
      )}
    </div>
  );
}
