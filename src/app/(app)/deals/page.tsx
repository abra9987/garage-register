"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface DealRow {
  id: string;
  jobNumber: string | null;
  vehicleYear: number | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleTrim: string | null;
  bodyStyle: string | null;
  exteriorColor: string | null;
  interiorColor: string | null;
  vin: string | null;
  msrp: string | null;
  buyingPrice: string | null;
  sellingPrice: string | null;
  currency: string | null;
  clientName: string | null;
  status: string;
  createdAt: string;
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

export default function DealsListPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/deals")
      .then((res) => res.json())
      .then(({ data }) => setDeals(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deals</h1>
          <p className="text-sm text-muted-foreground">
            History of filed deals
          </p>
        </div>
        <Button onClick={() => router.push("/deals/new")} className="gap-2">
          <Plus className="size-4" />
          New Deal
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : deals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No deals yet</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/deals/new")}
            >
              Create your first deal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {deals.map((deal) => {
            const vehicleDesc = [
              deal.vehicleYear,
              deal.vehicleMake,
              deal.vehicleModel,
              deal.vehicleTrim,
              deal.bodyStyle,
            ]
              .filter(Boolean)
              .join(" ");

            const colors = [deal.exteriorColor, deal.interiorColor]
              .filter(Boolean)
              .join(" on ");

            return (
              <Card
                key={deal.id}
                className="cursor-pointer transition-colors hover:bg-accent/50"
                onClick={() => router.push(`/deals/${deal.id}`)}
              >
                <CardContent className="flex items-center justify-between py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {deal.jobNumber && (
                        <span className="text-sm font-mono font-medium text-primary">
                          {deal.jobNumber}
                        </span>
                      )}
                      <span className="text-sm font-medium truncate">
                        {vehicleDesc || "Untitled deal"}
                      </span>
                      {colors && (
                        <span className="text-sm text-muted-foreground">
                          {colors}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      {deal.vin && (
                        <span className="font-mono">{deal.vin}</span>
                      )}
                      {deal.clientName && <span>{deal.clientName}</span>}
                      <span>{formatDate(deal.createdAt)}</span>
                    </div>
                  </div>
                  <Badge
                    variant={
                      deal.status === "sent" ? "default" : "secondary"
                    }
                  >
                    {deal.status}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
