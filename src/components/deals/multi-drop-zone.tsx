"use client";

import { useCallback } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Upload, FileText, Image, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface MultiDropZoneProps {
  label: string;
  files: File[];
  maxFiles?: number;
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
}

const ACCEPT = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function isImage(file: File) {
  return file.type.startsWith("image/");
}

function FileThumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const url = isImage(file) ? URL.createObjectURL(file) : null;

  return (
    <div className="relative flex items-center gap-2 rounded-md border bg-background p-2">
      <Button
        variant="ghost"
        size="icon"
        className="absolute -top-2 -right-2 z-10 size-6 rounded-full border bg-background shadow-sm hover:bg-destructive hover:text-destructive-foreground"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        <X className="size-3" />
      </Button>
      {url ? (
        <img
          src={url}
          alt={file.name}
          className="size-10 rounded object-cover"
          onLoad={() => URL.revokeObjectURL(url)}
        />
      ) : (
        <FileText className="size-10 text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{file.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(file.size)}
        </p>
      </div>
    </div>
  );
}

export function MultiDropZone({
  label,
  files,
  maxFiles = 3,
  onAdd,
  onRemove,
  disabled = false,
}: MultiDropZoneProps) {
  const canAddMore = files.length < maxFiles;

  const handleDrop = useCallback(
    (acceptedFiles: File[]) => {
      const remaining = maxFiles - files.length;
      const toAdd = acceptedFiles.slice(0, remaining);
      if (toAdd.length < acceptedFiles.length) {
        toast.error(`Maximum ${maxFiles} files allowed`);
      }
      onAdd(toAdd);
    },
    [files.length, maxFiles, onAdd],
  );

  const handleRejection = useCallback((rejections: FileRejection[]) => {
    for (const rejection of rejections) {
      for (const error of rejection.errors) {
        if (error.code === "file-invalid-type") {
          toast.error("Only PDF and image files (JPG, PNG) are accepted");
        } else if (error.code === "file-too-large") {
          toast.error("File is too large. Maximum size is 10 MB.");
        }
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    onDropRejected: handleRejection,
    accept: ACCEPT,
    maxSize: 10 * 1024 * 1024,
    maxFiles: maxFiles - files.length,
    disabled: disabled || !canAddMore,
    multiple: true,
  });

  return (
    <div className="flex-1">
      <p className="mb-2 text-sm font-semibold">
        {label}{" "}
        <span className="font-normal text-muted-foreground">
          ({files.length}/{maxFiles})
        </span>
      </p>

      {/* File list */}
      {files.length > 0 && (
        <div className="mb-2 space-y-2">
          {files.map((file, i) => (
            <FileThumb key={`${file.name}-${i}`} file={file} onRemove={() => onRemove(i)} />
          ))}
        </div>
      )}

      {/* Drop zone (show if can add more) */}
      {canAddMore && (
        <div
          {...getRootProps()}
          role="button"
          aria-label={`Upload ${label}`}
          className={cn(
            "flex min-h-[100px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          <input {...getInputProps()} />
          <div className="flex items-center gap-2 text-muted-foreground">
            {files.length === 0 ? (
              <Upload className="size-6" />
            ) : (
              <Image className="size-5" />
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground text-center">
            {isDragActive
              ? "Drop files here"
              : files.length === 0
                ? "Drag PDF or images here, or click to browse"
                : "Add more files"}
          </p>
        </div>
      )}
    </div>
  );
}
