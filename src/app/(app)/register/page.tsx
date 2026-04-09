"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/review/status-badge";

type VehicleStatus = "extracting" | "pending_review" | "approved" | "exported";
type FilterStatus = "pending_review" | "approved" | "all";

interface VehicleListItem {
  id: string;
  jobNumber: string | null;
  status: VehicleStatus;
  vin: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function RegisterPage() {
  const [vehicles, setVehicles] = useState<VehicleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("pending_review");

  useEffect(() => {
    fetch("/api/vehicles")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.vehicles) {
          setVehicles(json.data.vehicles);
        }
      })
      .catch(() => {
        // Silently fail -- show empty state
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = vehicles.filter((v) => {
    if (filter === "all") return true;
    return v.status === filter;
  });

  const filterButtons: Array<{ value: FilterStatus; label: string }> = [
    { value: "pending_review", label: "Pending Review" },
    { value: "approved", label: "Approved" },
    { value: "all", label: "All" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Vehicle Register</h1>
        <p className="text-muted-foreground">
          Review pending vehicles or view approved records
        </p>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        {filterButtons.map((btn) => (
          <Button
            key={btn.value}
            variant={filter === btn.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(btn.value)}
          >
            {btn.label}
          </Button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}

      {/* Vehicle List */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((v) => (
            <Card key={v.id} className="hover:bg-muted/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {v.jobNumber ? (
                        <span className="font-semibold">{v.jobNumber}</span>
                      ) : (
                        <span className="text-muted-foreground italic">
                          No job #
                        </span>
                      )}
                      <StatusBadge status={v.status} />
                    </div>
                    <p className="text-sm font-mono text-muted-foreground mt-1 truncate">
                      {v.vin || "No VIN"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {[v.year, v.make, v.model].filter(Boolean).join(" ") ||
                        "Vehicle details pending"}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10"
                      render={<Link href={`/vehicles/${v.id}/review`} />}
                    >
                      {v.status === "pending_review" ? "Review" : "View"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filtered.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
            <p className="text-muted-foreground">
              No vehicles found. Upload documents to get started.
            </p>
            <Button variant="outline" render={<Link href="/upload" />}>
              Upload Documents
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
