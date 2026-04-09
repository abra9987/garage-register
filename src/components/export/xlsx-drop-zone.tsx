"use client";

import { useCallback } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { FileSpreadsheet, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface XlsxDropZoneProps {
  file: File | null;
  onFileAccept: (file: File) => void;
  onFileRemove: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export function XlsxDropZone({
  file,
  onFileAccept,
  onFileRemove,
}: XlsxDropZoneProps) {
  const handleDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileAccept(acceptedFiles[0]);
      }
    },
    [onFileAccept],
  );

  const handleRejection = useCallback((rejections: FileRejection[]) => {
    for (const rejection of rejections) {
      for (const error of rejection.errors) {
        if (error.code === "file-invalid-type") {
          toast.error("Only .xlsx files are accepted", { duration: 5000 });
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
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 1,
    multiple: false,
  });

  if (file) {
    return (
      <div className="mb-4 flex min-h-[160px] flex-col items-center justify-center rounded-lg border-2 border-solid border-primary p-6">
        <FileSpreadsheet className="mb-2 size-10 text-muted-foreground" />
        <p className="text-sm font-medium">
          {file.name} ({formatFileSize(file.size)})
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={onFileRemove}
        >
          <X className="size-4" />
          Remove
        </Button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      role="button"
      aria-label="Upload existing Garage Register XLSX"
      className={cn(
        "mb-4 flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50",
      )}
    >
      <input {...getInputProps()} />
      <FileSpreadsheet
        className={cn(
          "mb-3 size-10 text-muted-foreground",
          isDragActive && "animate-pulse",
        )}
      />
      <p className="text-center text-sm text-muted-foreground">
        {isDragActive
          ? "Drop XLSX to upload"
          : "Drag your Garage Register XLSX here or click to browse"}
      </p>
    </div>
  );
}
