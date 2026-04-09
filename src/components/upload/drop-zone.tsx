"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Upload, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const UploadPdfPreview = dynamic(
  () =>
    import("./upload-pdf-preview").then((mod) => ({
      default: mod.UploadPdfPreview,
    })),
  { ssr: false },
);

interface DropZoneProps {
  label: string;
  ariaLabel: string;
  file: File | null;
  onDrop: (file: File) => void;
  onRemove: () => void;
  disabled?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export function DropZone({
  label,
  ariaLabel,
  file,
  onDrop,
  onRemove,
  disabled = false,
}: DropZoneProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [previewError, setPreviewError] = useState(false);

  // Reset preview state when file changes
  useEffect(() => {
    setNumPages(null);
    setPreviewError(false);
  }, [file]);

  const handlePreviewError = useCallback(() => {
    setPreviewError(true);
    toast.error("Unable to preview PDF. The file may be corrupted.", {
      duration: 5000,
    });
  }, []);

  const handleDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onDrop(acceptedFiles[0]);
      }
    },
    [onDrop],
  );

  const handleRejection = useCallback((rejections: FileRejection[]) => {
    for (const rejection of rejections) {
      for (const error of rejection.errors) {
        if (error.code === "file-invalid-type") {
          toast.error("Only PDF files are accepted", { duration: 5000 });
        } else if (error.code === "file-too-large") {
          toast.error("File is too large. Maximum size is 10 MB.", {
            duration: 5000,
          });
        }
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    onDropRejected: handleRejection,
    accept: { "application/pdf": [".pdf"] },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 1,
    disabled,
    multiple: false,
  });

  return (
    <div className="flex-1">
      <p className="mb-2 text-sm font-semibold">{label}</p>
      {file ? (
        /* File loaded state with PDF preview */
        <div className="relative flex min-h-[200px] flex-col items-center rounded-lg border-2 border-solid border-primary p-4">
          {/* Remove button overlaid top-right */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 size-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            aria-label={`Remove file ${file.name}`}
          >
            <X className="size-4" />
          </Button>

          {/* PDF Preview or Fallback */}
          {previewError ? (
            /* Fallback: file info without preview */
            <div className="flex flex-1 flex-col items-center justify-center gap-2">
              <FileText className="size-8 text-muted-foreground" />
              <p className="text-sm font-normal">
                {file.name} ({formatFileSize(file.size)})
              </p>
            </div>
          ) : (
            /* PDF Preview */
            <div className="flex w-full flex-col items-center gap-2">
              <UploadPdfPreview
                file={file}
                onNumPages={setNumPages}
                onError={handlePreviewError}
              />
              <p className="text-center text-sm font-normal truncate max-w-full">
                {file.name} ({formatFileSize(file.size)})
              </p>
              {numPages !== null && numPages > 1 && (
                <Badge variant="secondary">{numPages} pages</Badge>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Empty / drag-over state */
        <div
          {...getRootProps()}
          role="button"
          aria-label={ariaLabel}
          className={cn(
            "flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          <input {...getInputProps()} />
          <Upload
            className={cn(
              "mb-3 size-10 text-muted-foreground",
              isDragActive && "animate-pulse",
            )}
          />
          <p className="text-sm text-muted-foreground">
            {isDragActive
              ? "Drop PDF to upload"
              : "Drag PDF here or click to browse"}
          </p>
        </div>
      )}
    </div>
  );
}
