"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";

export interface WarehouseSuggestion {
  id: string;
  name: string;
  address: string | null;
}

interface WarehouseAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (warehouse: WarehouseSuggestion) => void;
  placeholder?: string;
}

export function WarehouseAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Start typing...",
}: WarehouseAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<WarehouseSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    try {
      const res = await fetch(`/api/warehouses?q=${encodeURIComponent(q)}`);
      const { data } = await res.json();
      setSuggestions(data ?? []);
      setOpen((data ?? []).length > 0);
      setActiveIndex(-1);
    } catch {
      setSuggestions([]);
      setOpen(false);
    }
  }, []);

  function handleChange(val: string) {
    onChange(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 250);
  }

  function handleSelect(w: WarehouseSuggestion) {
    onChange(w.name);
    onSelect(w);
    setOpen(false);
    setSuggestions([]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-60 overflow-auto">
          {suggestions.map((s, i) => (
            <li
              key={s.id}
              className={`cursor-pointer px-3 py-2 text-sm hover:bg-accent ${i === activeIndex ? "bg-accent" : ""}`}
              onMouseDown={() => handleSelect(s)}
            >
              <div className="font-medium">{s.name}</div>
              {s.address && (
                <div className="text-xs text-muted-foreground truncate">{s.address}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
