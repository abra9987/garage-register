"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  useQueryStates,
  parseAsString,
  parseAsInteger,
  parseAsStringLiteral,
} from "nuqs";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
} from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchInput } from "@/components/register/search-input";
import { FilterBar } from "@/components/register/filter-bar";
import { FilterChip } from "@/components/register/filter-chip";
import { VehicleTable, type VehicleRow } from "@/components/register/vehicle-table";
import { VehicleCard } from "@/components/register/vehicle-card";
import { Pagination } from "@/components/register/pagination";

const STATUS_LABELS: Record<string, string> = {
  pending_review: "Pending Review",
  approved: "Approved",
  exported: "Exported",
};

const DATE_RANGE_LABELS: Record<string, string> = {
  this_month: "This Month",
  last_3_months: "Last 3 Months",
  custom: "Custom Range",
};

export default function RegisterPage() {
  const [params, setParams] = useQueryStates({
    q: parseAsString.withDefault(""),
    status: parseAsString,
    page: parseAsInteger.withDefault(1),
    sort: parseAsString.withDefault("createdAt"),
    dir: parseAsStringLiteral(["asc", "desc"] as const).withDefault("desc"),
    dateRange: parseAsString,
    dateFrom: parseAsString,
    dateTo: parseAsString,
  });

  const [searchInput, setSearchInput] = useState(params.q);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hasEverLoaded, setHasEverLoaded] = useState(false);

  // Debounced search: 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== params.q) {
        setParams({ q: searchInput || null, page: 1 });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, params.q, setParams]);

  // Date range helper: calculate dateFrom/dateTo when dateRange changes
  useEffect(() => {
    if (params.dateRange === "this_month") {
      const now = new Date();
      setParams({
        dateFrom: format(startOfMonth(now), "yyyy-MM-dd"),
        dateTo: format(endOfMonth(now), "yyyy-MM-dd"),
      });
    } else if (params.dateRange === "last_3_months") {
      const now = new Date();
      setParams({
        dateFrom: format(startOfMonth(subMonths(now, 3)), "yyyy-MM-dd"),
        dateTo: format(endOfMonth(now), "yyyy-MM-dd"),
      });
    }
    // "custom" dates are handled by the FilterBar calendar
    // null dateRange clears dates (handled in FilterBar)
  }, [params.dateRange, setParams]);

  // Fetch vehicles on params change
  useEffect(() => {
    setLoading(true);
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.set("q", params.q);
    if (params.status) searchParams.set("status", params.status);
    if (params.sort) searchParams.set("sort", params.sort);
    if (params.dir) searchParams.set("dir", params.dir);
    if (params.page) searchParams.set("page", String(params.page));
    if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
    if (params.dateTo) searchParams.set("dateTo", params.dateTo);

    fetch(`/api/vehicles?${searchParams.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setVehicles(json.data.vehicles);
          setTotal(json.data.total);
          setHasEverLoaded(true);
        }
      })
      .catch(() => {
        // Silently fail -- show empty state
      })
      .finally(() => setLoading(false));
  }, [params.q, params.status, params.sort, params.dir, params.page, params.dateFrom, params.dateTo]);

  // Clear selection on page change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [params.page]);

  const handleSort = useCallback(
    (col: string) => {
      if (params.sort === col) {
        if (params.dir === "asc") {
          // Third click: clear sort, back to default
          setParams({ sort: "createdAt", dir: "desc" });
        } else {
          // Second click: switch to ascending
          setParams({ dir: "asc" });
        }
      } else {
        // First click: sort descending
        setParams({ sort: col, dir: "desc", page: 1 });
      }
    },
    [params.sort, params.dir, setParams]
  );

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    const approvedOnPage = vehicles.filter((v) => v.status === "approved");
    const allSelected = approvedOnPage.every((v) => selectedIds.has(v.id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        approvedOnPage.forEach((v) => next.delete(v.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        approvedOnPage.forEach((v) => next.add(v.id));
        return next;
      });
    }
  }, [vehicles, selectedIds]);

  const hasFilters = !!(params.status || params.dateRange);
  const hasSearch = !!params.q;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Vehicle Register</h1>
        <p className="text-muted-foreground">
          Search, filter, and manage vehicle records
        </p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={searchInput} onChange={setSearchInput} />
        <FilterBar
          status={params.status}
          dateRange={params.dateRange}
          onStatusChange={(v) => setParams({ status: v, page: 1 })}
          onDateRangeChange={(v) => setParams({ dateRange: v, page: 1 })}
          dateFrom={params.dateFrom}
          dateTo={params.dateTo}
          onDateFromChange={(v) => setParams({ dateFrom: v, page: 1 })}
          onDateToChange={(v) => setParams({ dateTo: v, page: 1 })}
        />
      </div>

      {/* Active Filter Chips */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2">
          {params.status && (
            <FilterChip
              label={`Status: ${STATUS_LABELS[params.status] || params.status}`}
              onRemove={() => setParams({ status: null, page: 1 })}
            />
          )}
          {params.dateRange && (
            <FilterChip
              label={`Date: ${DATE_RANGE_LABELS[params.dateRange] || params.dateRange}`}
              onRemove={() =>
                setParams({
                  dateRange: null,
                  dateFrom: null,
                  dateTo: null,
                  page: 1,
                })
              }
            />
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {/* Data Table (Desktop) + Cards (Mobile) */}
      {!loading && vehicles.length > 0 && (
        <>
          <VehicleTable
            vehicles={vehicles}
            sort={params.sort}
            dir={params.dir}
            onSort={handleSort}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
          />
          <div className="space-y-3 md:hidden">
            {vehicles.map((v) => (
              <VehicleCard
                key={v.id}
                vehicle={v}
                selected={selectedIds.has(v.id)}
                onToggle={() => handleToggleSelect(v.id)}
              />
            ))}
          </div>
          <Pagination
            page={params.page}
            pageSize={25}
            total={total}
            onPageChange={(p) => setParams({ page: p })}
          />
        </>
      )}

      {/* Empty States */}
      {!loading && vehicles.length === 0 && (hasSearch || hasFilters) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
            <p className="text-muted-foreground" role="status">
              No vehicles match your search. Try adjusting your filters or
              search terms.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && vehicles.length === 0 && !hasSearch && !hasFilters && hasEverLoaded && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
            <p className="text-muted-foreground" role="status">
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
