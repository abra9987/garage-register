"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";
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

interface Deal {
  id: string;
  jobNumber: string | null;
  vehicleYear: number | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleTrim: string | null;
  bodyStyle: string | null;
  exteriorColor: string | null;
  interiorColor: string | null;
  engine: string | null;
  vin: string | null;
  msrp: string | null;
  buyingPrice: string | null;
  hst: string | null;
  sellingPrice: string | null;
  currency: string | null;
  commissionAmount: string | null;
  commissionFor: string | null;
  deliveryDestination: string | null;
  warehouseAddress: string | null;
  clientName: string | null;
  clientAddress: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  notes: string | null;
  emailSubject: string | null;
  emailBody: string | null;
  status: string;
  createdAt: string;
  documents: DocMeta[];
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

function generateSubject(deal: Deal, jobNumber: string): string {
  const parts: string[] = [];
  if (jobNumber) parts.push(jobNumber);
  const desc = [deal.vehicleYear, deal.vehicleMake, deal.vehicleModel, deal.vehicleTrim, deal.bodyStyle]
    .filter(Boolean).join(" ");
  if (desc) parts.push(desc);
  const colors = [deal.exteriorColor, deal.interiorColor ? `on ${deal.interiorColor.toLowerCase()}` : null]
    .filter(Boolean).join(" ");
  if (colors) parts.push(colors);
  if (deal.vin) parts.push(`VIN ${deal.vin}`);
  return parts.join(", ");
}

function generateBody(deal: Deal, manual: {
  sellingPrice: string; currency: string; commissionAmount: string;
  commissionFor: string; delivery: string; warehouseAddress: string; notes: string;
}): string {
  const cur = manual.currency;
  const lines: string[] = [];
  const msrp = deal.msrp ? Number(deal.msrp) : null;
  const bp = deal.buyingPrice ? Number(deal.buyingPrice) : null;
  const hst = deal.hst ? Number(deal.hst) : null;
  if (msrp) lines.push(`${formatPrice(msrp, cur)} MSRP`);
  if (bp) lines.push(`${formatPrice(bp, cur)} BUYING PRICE`);
  if (hst) lines.push(`${formatPrice(hst, cur)} HST`);
  if (manual.sellingPrice) {
    const sp = parseFloat(manual.sellingPrice);
    if (!isNaN(sp)) lines.push(`${formatPrice(sp, cur)} Selling price`);
  }
  if (manual.commissionAmount && manual.commissionFor) {
    const ca = parseFloat(manual.commissionAmount);
    if (!isNaN(ca)) lines.push(`${formatPrice(ca, cur)} for ${manual.commissionFor}`);
  }
  if (manual.delivery) {
    lines.push("");
    lines.push(`DELIVERY TO ${manual.delivery.toUpperCase()}`);
    if (manual.warehouseAddress) lines.push(manual.warehouseAddress);
  }
  if (deal.clientName) { lines.push(""); lines.push(deal.clientName); }
  if (manual.notes) lines.push(manual.notes);
  return lines.join("\n");
}

function DocViewer({ dealId, doc }: { dealId: string; doc: DocMeta }) {
  const url = `/api/deals/${dealId}/documents/${doc.id}/content`;
  const isImage = doc.mimeType?.startsWith("image/");
  if (isImage) {
    return <img src={url} alt={doc.filename} className="w-full rounded border object-contain max-h-[400px]" />;
  }
  return <iframe src={url} title={doc.filename} className="h-[500px] w-full rounded border" />;
}

export default function DealEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [jobNumber, setJobNumber] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [commissionAmount, setCommissionAmount] = useState("");
  const [commissionFor, setCommissionFor] = useState("");
  const [delivery, setDelivery] = useState("");
  const [warehouseAddress, setWarehouseAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetch(`/api/deals/${id}`)
      .then((res) => res.json())
      .then(({ data }: { data: Deal }) => {
        setDeal(data);
        setJobNumber(data.jobNumber ?? "");
        setSellingPrice(data.sellingPrice ?? "");
        setCurrency(data.currency ?? "USD");
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

    const subj = generateSubject(deal, jobNumber);
    const bod = generateBody(deal, {
      sellingPrice, currency, commissionAmount,
      commissionFor, delivery, warehouseAddress, notes,
    });

    try {
      const res = await fetch(`/api/deals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobNumber: jobNumber || null,
          sellingPrice: sellingPrice || null,
          currency,
          commissionAmount: commissionAmount || null,
          commissionFor: commissionFor || null,
          deliveryDestination: delivery || null,
          warehouseAddress: warehouseAddress || null,
          notes: notes || null,
          emailSubject: subj,
          emailBody: bod,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Draft saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [deal, id, jobNumber, sellingPrice, currency, commissionAmount, commissionFor, delivery, warehouseAddress, notes]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="mx-auto max-w-5xl">
        <p className="text-muted-foreground">Deal not found</p>
      </div>
    );
  }

  const vehicleDesc = [deal.vehicleYear, deal.vehicleMake, deal.vehicleModel, deal.vehicleTrim, deal.bodyStyle]
    .filter(Boolean).join(" ");
  const stickers = deal.documents.filter((d) => d.docType === "window_sticker");
  const invoices = deal.documents.filter((d) => d.docType === "invoice");

  const subject = showPreview ? generateSubject(deal, jobNumber) : null;
  const body = showPreview
    ? generateBody(deal, { sellingPrice, currency, commissionAmount, commissionFor, delivery, warehouseAddress, notes })
    : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/deals")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">
              {deal.jobNumber && <span className="text-primary">{deal.jobNumber} </span>}
              {vehicleDesc || "Deal"}
            </h1>
            <Badge variant={deal.status === "sent" ? "default" : "secondary"}>{deal.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Created {new Date(deal.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Documents */}
        <Card>
          <CardHeader><CardTitle className="text-base">Documents</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {stickers.map((doc, i) => (
              <div key={doc.id}>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Window Sticker{stickers.length > 1 ? ` ${i + 1}` : ""}
                </p>
                <DocViewer dealId={deal.id} doc={doc} />
              </div>
            ))}
            {invoices.map((doc) => (
              <div key={doc.id}>
                <p className="mb-1 text-xs font-medium text-muted-foreground">AP Invoice</p>
                <DocViewer dealId={deal.id} doc={doc} />
              </div>
            ))}
            {deal.documents.length === 0 && (
              <p className="text-sm text-muted-foreground">No documents attached</p>
            )}
          </CardContent>
        </Card>

        {/* Right: Editable details */}
        <Card>
          <CardHeader><CardTitle className="text-base">Deal Details</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {/* Vehicle (read-only from extraction) */}
            <div>
              <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vehicle</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div><span className="text-muted-foreground">Description: </span><span className="font-medium">{vehicleDesc || "—"}</span></div>
                <div><span className="text-muted-foreground">VIN: </span><span className="font-mono font-medium">{deal.vin || "—"}</span></div>
                <div><span className="text-muted-foreground">Colors: </span><span>{[deal.exteriorColor, deal.interiorColor].filter(Boolean).join(" on ") || "—"}</span></div>
                {deal.engine && <div><span className="text-muted-foreground">Engine: </span><span>{deal.engine}</span></div>}
              </div>
            </div>

            {/* Pricing (read-only from extraction) */}
            <div>
              <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pricing</h3>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div><span className="text-muted-foreground">MSRP: </span><span className="font-medium">{deal.msrp ? formatPrice(Number(deal.msrp), currency) : "—"}</span></div>
                <div><span className="text-muted-foreground">Buying: </span><span className="font-medium">{deal.buyingPrice ? formatPrice(Number(deal.buyingPrice), currency) : "—"}</span></div>
                <div><span className="text-muted-foreground">HST: </span><span className="font-medium">{deal.hst ? formatPrice(Number(deal.hst), currency) : "—"}</span></div>
              </div>
            </div>

            {/* Client (read-only from extraction) */}
            {deal.clientName && (
              <div>
                <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client</h3>
                <p className="text-sm font-medium">{deal.clientName}</p>
                {deal.clientAddress && <p className="text-sm text-muted-foreground">{deal.clientAddress}</p>}
              </div>
            )}

            {/* Editable deal terms */}
            <div>
              <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deal Terms</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="jobNumber" className="text-xs">Job Number</Label>
                  <Input id="jobNumber" placeholder="26-J07674" value={jobNumber} onChange={(e) => setJobNumber(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="sellingPrice" className="text-xs">Selling Price</Label>
                  <Input id="sellingPrice" type="number" placeholder="99500" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="currency" className="text-xs">Currency</Label>
                  <select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    <option value="USD">USD</option>
                    <option value="CAD">CAD</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="commissionAmount" className="text-xs">Commission ($)</Label>
                  <Input id="commissionAmount" type="number" placeholder="1000" value={commissionAmount} onChange={(e) => setCommissionAmount(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="commissionFor" className="text-xs">Commission For</Label>
                  <Input id="commissionFor" placeholder="Sergey" value={commissionFor} onChange={(e) => setCommissionFor(e.target.value)} />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="delivery" className="text-xs">Delivery To</Label>
                  <Input id="delivery" placeholder="Vancouver" value={delivery} onChange={(e) => setDelivery(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="warehouseAddress" className="text-xs">Warehouse Address</Label>
                  <Input id="warehouseAddress" placeholder="12431 Horseshoe Way, Richmond, BC" value={warehouseAddress} onChange={(e) => setWarehouseAddress(e.target.value)} />
                </div>
              </div>
              <div className="mt-3">
                <Label htmlFor="notes" className="text-xs">Notes</Label>
                <Textarea id="notes" placeholder="Please see instructions in invoice" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
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

      {/* Email Preview */}
      {subject && body && (
        <Card>
          <CardHeader><CardTitle className="text-base">Email Preview</CardTitle></CardHeader>
          <CardContent>
            <EmailPreview subject={subject} body={body} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
