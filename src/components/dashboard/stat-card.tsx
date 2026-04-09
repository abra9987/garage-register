"use client";

import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
}

export function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <Card
      className="relative p-5"
      role="status"
      aria-label={`${label}: ${value}`}
    >
      <Icon className="absolute top-4 right-4 size-5 text-muted-foreground" />
      <div className="text-3xl font-semibold">{value}</div>
      <div className="text-sm font-normal text-muted-foreground">{label}</div>
    </Card>
  );
}
