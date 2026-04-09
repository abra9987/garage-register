"use client";

import { useCallback } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Upload, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
        /* File loaded state */
        <div
          className={cn(
            "flex min-h-[200px] flex-col items-center justify-center rounded-lg border-2 border-solid border-primary p-8",
          )}
        >
          <FileText className="mb-2 size-8 text-muted-foreground" />
          <p className="text-sm font-normal">
            {file.name} ({formatFileSize(file.size)})
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            aria-label={`Remove file ${file.name}`}
          >
            <X className="size-4" />
            Remove File
          </Button>
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
