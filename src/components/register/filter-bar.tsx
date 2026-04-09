"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";

interface FilterBarProps {
  status: string | null;
  dateRange: string | null;
  onStatusChange: (v: string | null) => void;
  onDateRangeChange: (v: string | null) => void;
  dateFrom: string | null;
  dateTo: string | null;
  onDateFromChange: (v: string | null) => void;
  onDateToChange: (v: string | null) => void;
}

export function FilterBar({
  status,
  dateRange,
  onStatusChange,
  onDateRangeChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: FilterBarProps) {
  const [customOpen, setCustomOpen] = useState(false);

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Status Filter */}
      <Select
        value={status ?? "all"}
        onValueChange={(val) => {
          onStatusChange(val === "all" ? null : val);
        }}
      >
        <SelectTrigger aria-label="Filter by status" className="w-full sm:w-[160px]">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="pending_review">Pending Review</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="exported">Exported</SelectItem>
        </SelectContent>
      </Select>

      {/* Date Range Filter */}
      <Select
        value={dateRange ?? "all_time"}
        onValueChange={(val) => {
          if (val === "custom") {
            onDateRangeChange("custom");
            setCustomOpen(true);
          } else if (val === "all_time") {
            onDateRangeChange(null);
            onDateFromChange(null);
            onDateToChange(null);
          } else {
            onDateRangeChange(val);
          }
        }}
      >
        <SelectTrigger aria-label="Filter by date range" className="w-full sm:w-[160px]">
          <SelectValue placeholder="All Time" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all_time">All Time</SelectItem>
          <SelectItem value="this_month">This Month</SelectItem>
          <SelectItem value="last_3_months">Last 3 Months</SelectItem>
          <SelectItem value="custom">Custom...</SelectItem>
        </SelectContent>
      </Select>

      {/* Custom Date Range Popover */}
      {dateRange === "custom" && (
        <Popover open={customOpen} onOpenChange={setCustomOpen}>
          <PopoverTrigger
            render={
              <Button variant="outline" className="w-full sm:w-auto gap-2">
                <CalendarIcon className="size-4" />
                {dateFrom && dateTo
                  ? `${dateFrom} - ${dateTo}`
                  : "Select dates"}
              </Button>
            }
          />
          <PopoverContent className="w-auto p-4" align="start">
            <div className="flex flex-col sm:flex-row gap-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  From
                </p>
                <Calendar
                  mode="single"
                  selected={dateFrom ? new Date(dateFrom + "T00:00:00") : undefined}
                  onSelect={(date) => {
                    onDateFromChange(date ? format(date, "yyyy-MM-dd") : null);
                  }}
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  To
                </p>
                <Calendar
                  mode="single"
                  selected={dateTo ? new Date(dateTo + "T00:00:00") : undefined}
                  onSelect={(date) => {
                    onDateToChange(date ? format(date, "yyyy-MM-dd") : null);
                    if (date) setCustomOpen(false);
                  }}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
