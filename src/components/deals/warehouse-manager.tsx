"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Pencil, Trash2, Save, X, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface WarehouseItem {
  id: string;
  name: string;
  address: string | null;
}

interface WarehouseManagerProps {
  onSelect?: (warehouse: WarehouseItem) => void;
}

function WarehouseForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: WarehouseItem;
  onSave: (w: WarehouseItem) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const url = initial ? `/api/warehouses/${initial.id}` : "/api/warehouses";
      const method = initial ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const { data } = await res.json();
      onSave(data);
      toast.success(initial ? "Warehouse updated" : "Warehouse added");
    } catch {
      toast.error("Failed to save warehouse");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 p-3 border-b">
      <div>
        <Label className="text-xs">Name *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus className="h-8 text-sm" placeholder="e.g. Detroit Warehouse" />
      </div>
      <div>
        <Label className="text-xs">Address</Label>
        <Input value={address} onChange={(e) => setAddress(e.target.value)} className="h-8 text-sm" placeholder="Full address" />
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={saving} className="h-7 gap-1 text-xs">
          <Save className="size-3" />
          {initial ? "Update" : "Add"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="h-7 text-xs">
          <X className="size-3" />
        </Button>
      </div>
    </form>
  );
}

export function WarehouseManager({ onSelect }: WarehouseManagerProps) {
  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/warehouses");
      const { data } = await res.json();
      setItems(data ?? []);
    } catch {
      toast.error("Failed to load warehouses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      load();
      setEditingId(null);
      setShowAdd(false);
    }
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/warehouses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((w) => w.id !== id));
      toast.success("Warehouse deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  function handleSaved(w: WarehouseItem) {
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.id === w.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = w;
        return next;
      }
      return [w, ...prev];
    });
    setEditingId(null);
    setShowAdd(false);
  }

  function handleSelect(w: WarehouseItem) {
    onSelect?.(w);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={() => setOpen((v) => !v)}
      >
        <Warehouse className="size-3.5" />
        Warehouses
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border bg-popover shadow-lg">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-medium">Warehouses</span>
            {!showAdd && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => { setShowAdd(true); setEditingId(null); }}
              >
                <Plus className="size-3" />
                Add
              </Button>
            )}
          </div>

          {showAdd && (
            <WarehouseForm onSave={handleSaved} onCancel={() => setShowAdd(false)} />
          )}

          <div className="max-h-72 overflow-auto">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No warehouses yet</p>
            ) : (
              items.map((w) =>
                editingId === w.id ? (
                  <WarehouseForm
                    key={w.id}
                    initial={w}
                    onSave={handleSaved}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div
                    key={w.id}
                    className="group flex items-start justify-between px-3 py-2 hover:bg-accent/50 transition-colors border-b last:border-b-0"
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => handleSelect(w)}
                    >
                      <div className="text-sm font-medium">{w.name}</div>
                      {w.address && (
                        <div className="text-xs text-muted-foreground truncate">{w.address}</div>
                      )}
                    </button>
                    <div className="ml-2 flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => { setEditingId(w.id); setShowAdd(false); }}
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(w.id)}
                      >
                        <Trash2 className="size-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
