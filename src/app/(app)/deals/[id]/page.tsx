"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DocViewer({ dealId, doc }: { dealId: string; doc: DocMeta }) {
  const url = `/api/deals/${dealId}/documents/${doc.id}/content`;
  const isImage = doc.mimeType?.startsWith("image/");

  if (isImage) {
    return (
      <img
        src={url}
        alt={doc.filename}
        className="w-full rounded border object-contain max-h-[400px]"
      />
    );
  }

  return (
    <iframe
      src={url}
      title={doc.filename}
      className="h-[500px] w-full rounded border"
    />
  );
}

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/deals/${id}`)
      .then((res) => res.json())
      .then(({ data }) => setDeal(data))
      .finally(() => setLoading(false));
  }, [id]);

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

  const vehicleDesc = [
    deal.vehicleYear,
    deal.vehicleMake,
    deal.vehicleModel,
    deal.vehicleTrim,
    deal.bodyStyle,
  ]
    .filter(Boolean)
    .join(" ");

  const stickers = deal.documents.filter(
    (d) => d.docType === "window_sticker",
  );
  const invoices = deal.documents.filter((d) => d.docType === "invoice");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/deals")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">
              {deal.jobNumber && (
                <span className="text-primary">{deal.jobNumber} </span>
              )}
              {vehicleDesc || "Deal"}
            </h1>
            <Badge
              variant={deal.status === "sent" ? "default" : "secondary"}
            >
              {deal.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Created {formatDate(deal.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documents</CardTitle>
          </CardHeader>
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
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  AP Invoice
                </p>
                <DocViewer dealId={deal.id} doc={doc} />
              </div>
            ))}
            {deal.documents.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No documents attached
              </p>
            )}
          </CardContent>
        </Card>

        {/* Right: Deal details */}
        <div className="space-y-6">
          {/* Vehicle */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vehicle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Description: </span>
                <span className="font-medium">{vehicleDesc || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">VIN: </span>
                <span className="font-mono font-medium">
                  {deal.vin || "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Colors: </span>
                <span>
                  {[deal.exteriorColor, deal.interiorColor]
                    .filter(Boolean)
                    .join(" on ") || "—"}
                </span>
              </div>
              {deal.engine && (
                <div>
                  <span className="text-muted-foreground">Engine: </span>
                  <span>{deal.engine}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {deal.msrp && (
                <div>
                  <span className="text-muted-foreground">MSRP: </span>
                  <span className="font-medium">
                    ${Number(deal.msrp).toLocaleString()} {deal.currency}
                  </span>
                </div>
              )}
              {deal.buyingPrice && (
                <div>
                  <span className="text-muted-foreground">
                    Buying Price:{" "}
                  </span>
                  <span className="font-medium">
                    ${Number(deal.buyingPrice).toLocaleString()} {deal.currency}
                  </span>
                </div>
              )}
              {deal.hst && (
                <div>
                  <span className="text-muted-foreground">HST: </span>
                  <span className="font-medium">
                    ${Number(deal.hst).toLocaleString()} {deal.currency}
                  </span>
                </div>
              )}
              {deal.sellingPrice && (
                <div>
                  <span className="text-muted-foreground">
                    Selling Price:{" "}
                  </span>
                  <span className="font-medium">
                    ${Number(deal.sellingPrice).toLocaleString()}{" "}
                    {deal.currency}
                  </span>
                </div>
              )}
              {deal.commissionAmount && deal.commissionFor && (
                <div>
                  <span className="text-muted-foreground">Commission: </span>
                  <span>
                    ${Number(deal.commissionAmount).toLocaleString()} for{" "}
                    {deal.commissionFor}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Client */}
          {deal.clientName && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Client</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium">{deal.clientName}</p>
                {deal.clientAddress && (
                  <p className="text-muted-foreground">
                    {deal.clientAddress}
                  </p>
                )}
                {deal.clientPhone && <p>{deal.clientPhone}</p>}
                {deal.clientEmail && <p>{deal.clientEmail}</p>}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Email */}
      {deal.emailSubject && deal.emailBody && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Email</CardTitle>
          </CardHeader>
          <CardContent>
            <EmailPreview
              subject={deal.emailSubject}
              body={deal.emailBody}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
