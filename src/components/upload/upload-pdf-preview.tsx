"use client";

import { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import { Skeleton } from "@/components/ui/skeleton";

// Configure worker in SAME module (react-pdf + Turbopack pattern)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface UploadPdfPreviewProps {
  file: File;
  onNumPages: (numPages: number) => void;
  onError: () => void;
}

export function UploadPdfPreview({
  file,
  onNumPages,
  onError,
}: UploadPdfPreviewProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Object URL lifecycle: create on file change, revoke on cleanup
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    setIsLoading(true);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // Measure container width with ResizeObserver, seed from offsetWidth
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Seed initial width immediately to avoid rendering at natural PDF size
    setContainerWidth(el.offsetWidth);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function handleLoadSuccess({ numPages }: { numPages: number }) {
    setIsLoading(false);
    onNumPages(numPages);
  }

  function handleLoadError() {
    setIsLoading(false);
    onError();
  }

  return (
    <div
      ref={containerRef}
      className="bg-muted rounded-md overflow-hidden w-full"
      aria-label={`Preview of ${file.name}`}
      aria-busy={isLoading}
    >
      {fileUrl && (
        <Document
          file={fileUrl}
          onLoadSuccess={handleLoadSuccess}
          onLoadError={handleLoadError}
          loading={<Skeleton className="h-[200px] w-full" />}
        >
          <Page
            pageNumber={1}
            width={containerWidth > 0 ? containerWidth : undefined}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
      )}
    </div>
  );
}
