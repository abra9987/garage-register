"use client";

import type { UseFormRegisterReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { ConfidenceBadge } from "@/components/upload/confidence-badge";
import { cn } from "@/lib/utils";
import type { ConfidenceLevel } from "@/types/extraction";

interface ReviewFieldProps {
  label: string;
  fieldName: string;
  confidence: ConfidenceLevel;
  isEdited: boolean;
  originalValue?: string | null;
  error?: string;
  required?: boolean;
  inputType: "text" | "number" | "textarea" | "date";
  register: UseFormRegisterReturn;
}

const CONFIDENCE_BORDER_CLASSES: Record<ConfidenceLevel, string> = {
  high: "border-2 border-green-500 dark:border-green-500 bg-green-50/50 dark:bg-green-950/20",
  medium:
    "border-2 border-amber-500 dark:border-amber-500 bg-amber-50/50 dark:bg-amber-950/20",
  low: "border-2 border-red-500 dark:border-red-500 bg-red-50/50 dark:bg-red-950/20",
  not_found:
    "border-2 border-dashed border-muted-foreground bg-muted/50",
};

const EDITED_BORDER_CLASS =
  "border-2 border-blue-500 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-950/20";

export function ReviewField({
  label,
  fieldName,
  confidence,
  isEdited,
  originalValue,
  error,
  required,
  inputType,
  register,
}: ReviewFieldProps) {
  const borderClass = isEdited
    ? EDITED_BORDER_CLASS
    : CONFIDENCE_BORDER_CLASSES[confidence];

  const isVin = fieldName === "vin";
  const isCurrency = fieldName === "purchasePrice" || fieldName === "salePrice";
  const isNotFound = confidence === "not_found" && !isEdited;

  const placeholder = isNotFound
    ? "Not found in document -- enter manually"
    : undefined;

  const inputClassName = cn(
    borderClass,
    isVin && "font-mono tracking-wider uppercase",
    isCurrency && "pl-6",
    isNotFound && "placeholder:italic",
  );

  const renderInput = () => {
    if (inputType === "textarea") {
      return (
        <Textarea
          {...register}
          rows={2}
          className={inputClassName}
          placeholder={placeholder}
          aria-invalid={!!error}
        />
      );
    }

    return (
      <Input
        {...register}
        type={inputType}
        className={inputClassName}
        placeholder={placeholder}
        aria-invalid={!!error}
      />
    );
  };

  const inputElement = renderInput();

  return (
    <div className="space-y-1.5">
      {/* Label row */}
      <div className="flex items-center gap-2">
        <Label htmlFor={fieldName}>
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
        <ConfidenceBadge level={confidence} />
      </div>

      {/* Input with currency prefix and tooltip wrapper */}
      {isCurrency ? (
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
            $
          </span>
          {isEdited ? (
            <Tooltip>
              <TooltipTrigger className="w-full text-left">
                {inputElement}
              </TooltipTrigger>
              <TooltipContent>
                Original: {originalValue ?? "not found in document"}
              </TooltipContent>
            </Tooltip>
          ) : (
            inputElement
          )}
        </div>
      ) : isEdited ? (
        <Tooltip>
          <TooltipTrigger className="w-full text-left">
            {inputElement}
          </TooltipTrigger>
          <TooltipContent>
            Original: {originalValue ?? "not found in document"}
          </TooltipContent>
        </Tooltip>
      ) : (
        inputElement
      )}

      {/* Edited indicator */}
      {isEdited && (
        <p className="text-xs text-blue-600 dark:text-blue-400">Edited</p>
      )}

      {/* Error message */}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
