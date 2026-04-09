"use client";

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface FilterChipProps {
  label: string;
  onRemove: () => void;
}

export function FilterChip({ label, onRemove }: FilterChipProps) {
  return (
    <Badge variant="secondary" className="gap-1 pr-1">
      {label}
      <Button
        variant="ghost"
        size="icon-xs"
        className="size-4 p-0 hover:bg-transparent"
        onClick={onRemove}
        aria-label={`Remove filter: ${label}`}
      >
        <X className="size-3" />
      </Button>
    </Badge>
  );
}
