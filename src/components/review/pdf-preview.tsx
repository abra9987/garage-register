"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RefreshCcw,
  Loader2,
} from "lucide-react";

// Configure worker in SAME module (react-pdf + Turbopack pattern)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface PdfPreviewProps {
  vehicleId: string;
  documents: Array<{
    id: string;
    type: "ap" | "ar";
    filename: string;
  }>;
  onReExtract: (docId: string, docType: "ap" | "ar") => void;
  isReExtracting: boolean;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.0;
const SCALE_STEP = 0.25;

export default function PdfPreview({
  vehicleId,
  documents,
  onReExtract,
  isReExtracting,
}: PdfPreviewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [scale, setScale] = useState(1.0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [activeDocId, setActiveDocId] = useState(documents[0]?.id ?? "");
  const containerRef = useRef<HTMLDivElement>(null);

  // Get active document type for re-extract callback
  const activeDoc = documents.find((d) => d.id === activeDocId);
  const activeDocType = activeDoc?.type ?? "ap";

  // Measure container width with ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Subtract padding (32px = p-4 on both sides)
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Reset page when switching documents
  const handleTabChange = useCallback(
    (value: string | number | null) => {
      if (value === null) return;
      const docId = String(value);
      setActiveDocId(docId);
      setCurrentPage(1);
      setNumPages(null);
    },
    [],
  );

  function onDocumentLoadSuccess({ numPages: total }: { numPages: number }) {
    setNumPages(total);
    setCurrentPage(1);
  }

  const pdfUrl = activeDocId
    ? `/api/vehicles/${vehicleId}/documents/${activeDocId}/content`
    : "";

  const pageWidth = containerWidth > 0 ? containerWidth * scale : undefined;

  const hasSingleDoc = documents.length === 1;

  return (
    <Card className="lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-96px)] lg:overflow-y-auto">
      <CardContent className="p-4 space-y-3">
        {/* Document Tabs */}
        {!hasSingleDoc && documents.length > 0 && (
          <Tabs
            defaultValue={documents[0]?.id}
            value={activeDocId}
            onValueChange={handleTabChange}
          >
            <TabsList className="w-full">
              {documents.map((doc) => (
                <TabsTrigger key={doc.id} value={doc.id}>
                  {doc.type === "ap" ? "AP Invoice" : "AR Invoice"}
                </TabsTrigger>
              ))}
            </TabsList>
            {documents.map((doc) => (
              <TabsContent key={doc.id} value={doc.id} />
            ))}
          </Tabs>
        )}

        {/* PDF Render Area */}
        <div ref={containerRef} className="bg-muted rounded-md overflow-auto">
          {pdfUrl ? (
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex flex-col items-center justify-center gap-2 p-8">
                  <Skeleton className="h-[400px] w-full" />
                  <p className="text-sm text-muted-foreground">
                    Loading document...
                  </p>
                </div>
              }
              error={
                <div className="flex items-center justify-center p-8">
                  <p className="text-sm text-destructive">
                    Unable to display PDF. The file may be corrupted.
                  </p>
                </div>
              }
            >
              <Page
                pageNumber={currentPage}
                width={pageWidth}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
          ) : (
            <div className="flex items-center justify-center p-8">
              <p className="text-sm text-muted-foreground">
                No document available
              </p>
            </div>
          )}
        </div>

        {/* Page Navigation + Zoom Controls */}
        {numPages && numPages > 0 && (
          <div className="flex items-center justify-between">
            {/* Page Navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-10"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft className="size-5" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[80px] text-center">
                Page {currentPage} of {numPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-10"
                disabled={currentPage >= numPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(numPages!, p + 1))
                }
                aria-label="Next page"
              >
                <ChevronRight className="size-5" />
              </Button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={scale <= MIN_SCALE}
                onClick={() =>
                  setScale((s) =>
                    Math.max(MIN_SCALE, Math.round((s - SCALE_STEP) * 100) / 100),
                  )
                }
                aria-label="Zoom out"
              >
                <ZoomOut className="size-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[40px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={scale >= MAX_SCALE}
                onClick={() =>
                  setScale((s) =>
                    Math.min(MAX_SCALE, Math.round((s + SCALE_STEP) * 100) / 100),
                  )
                }
                aria-label="Zoom in"
              >
                <ZoomIn className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Re-extract Button */}
        <Button
          variant="outline"
          className="w-full"
          disabled={isReExtracting || !activeDocId}
          onClick={() => onReExtract(activeDocId, activeDocType)}
        >
          {isReExtracting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Re-extracting...
            </>
          ) : (
            <>
              <RefreshCcw className="size-4" />
              Re-extract Document
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
