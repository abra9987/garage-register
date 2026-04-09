"use client";

import { useState, useEffect, useCallback } from "react";
import { useQueryState, parseAsString } from "nuqs";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { RecordSelector } from "@/components/export/record-selector";
import { ExportActions } from "@/components/export/export-actions";
import { XlsxDropZone } from "@/components/export/xlsx-drop-zone";
import { ExportSuccess } from "@/components/export/export-success";

interface VehicleRow {
  id: string;
  jobNumber: string | null;
  vin: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  status: string;
}

/**
 * Extract filename from Content-Disposition header.
 * Falls back to Garage_Register_YYYY-MM-DD.xlsx if not found.
 */
function extractFilename(headers: Headers): string {
  const disposition = headers.get("Content-Disposition");
  if (disposition) {
    const match = disposition.match(/filename="?([^";\n]+)"?/);
    if (match?.[1]) return match[1];
  }
  const date = new Date().toISOString().slice(0, 10);
  return `Garage_Register_${date}.xlsx`;
}

/** Trigger browser download from a blob */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function ExportPage() {
  const [mode, setMode] = useQueryState(
    "mode",
    parseAsString.withDefault("new"),
  );

  const [records, setRecords] = useState<VehicleRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [appendFile, setAppendFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch approved records on mount
  useEffect(() => {
    setLoading(true);
    fetch("/api/vehicles?status=approved&page=1&pageSize=500")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setRecords(json.data.vehicles);
      })
      .catch(() => toast.error("Failed to load records"))
      .finally(() => setLoading(false));
  }, []);

  const toggle = useCallback((id: string) => {
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

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === records.length) {
        return new Set();
      }
      return new Set(records.map((r) => r.id));
    });
  }, [records]);

  const handleExportNew = useCallback(async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleIds: Array.from(selectedIds) }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(
          err?.error ||
            "Export failed. Please try again. If the problem persists, check that all selected records have complete data.",
        );
        return;
      }

      const blob = await res.blob();
      const filename = extractFilename(res.headers);
      downloadBlob(blob, filename);

      // Update local state: mark exported records
      setRecords((prev) =>
        prev.map((r) =>
          selectedIds.has(r.id) ? { ...r, status: "exported" } : r,
        ),
      );
      // Remove exported records from the list (they are no longer "approved")
      setRecords((prev) => prev.filter((r) => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
      setShowSuccess(true);
      toast.success("Garage Register exported successfully");
    } catch {
      toast.error(
        "Export failed. Please try again. If the problem persists, check that all selected records have complete data.",
      );
    } finally {
      setIsExporting(false);
    }
  }, [selectedIds]);

  const handleExportAppend = useCallback(async () => {
    if (!appendFile) {
      toast.error("Please upload an existing Garage Register XLSX first.");
      return;
    }

    setIsExporting(true);
    try {
      const formData = new FormData();
      formData.append("file", appendFile);
      formData.append("vehicleIds", JSON.stringify(Array.from(selectedIds)));

      const res = await fetch("/api/export/append", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(
          err?.error ||
            "Append failed. Please check the uploaded file and try again.",
        );
        return;
      }

      const blob = await res.blob();
      const filename = extractFilename(res.headers);
      downloadBlob(blob, filename);

      // Update local state: remove exported records
      setRecords((prev) => prev.filter((r) => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
      setAppendFile(null);
      setShowSuccess(true);
      toast.success(`Records appended to ${filename} successfully`);
    } catch {
      toast.error(
        "Append failed. Please check the uploaded file and try again.",
      );
    } finally {
      setIsExporting(false);
    }
  }, [selectedIds, appendFile]);

  const handleDismissSuccess = useCallback(() => {
    setShowSuccess(false);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Export to Garage Register</h1>
        <p className="text-muted-foreground">
          Generate or update your Ministry of Transportation XLSX
        </p>
      </div>

      <Tabs
        value={mode ?? "new"}
        onValueChange={(value) => setMode(value as string)}
      >
        <TabsList>
          <TabsTrigger value="new">Export New</TabsTrigger>
          <TabsTrigger value="append">Append to Existing</TabsTrigger>
        </TabsList>

        <TabsContent value="new">
          <div className="space-y-4 pt-4">
            <ExportSuccess
              visible={showSuccess}
              onDismiss={handleDismissSuccess}
            />
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <>
                <RecordSelector
                  records={records}
                  selectedIds={selectedIds}
                  onToggle={toggle}
                  onToggleAll={toggleAll}
                />
                <ExportActions
                  selectedCount={selectedIds.size}
                  isExporting={isExporting}
                  onExport={handleExportNew}
                  mode="new"
                  disabled={false}
                />
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="append">
          <div className="space-y-4 pt-4">
            <ExportSuccess
              visible={showSuccess}
              onDismiss={handleDismissSuccess}
            />
            <XlsxDropZone
              file={appendFile}
              onFileAccept={setAppendFile}
              onFileRemove={() => setAppendFile(null)}
            />
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <>
                <RecordSelector
                  records={records}
                  selectedIds={selectedIds}
                  onToggle={toggle}
                  onToggleAll={toggleAll}
                />
                <ExportActions
                  selectedCount={selectedIds.size}
                  isExporting={isExporting}
                  onExport={handleExportAppend}
                  mode="append"
                  disabled={!appendFile}
                />
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
