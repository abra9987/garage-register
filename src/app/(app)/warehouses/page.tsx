"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface WarehouseItem {
  id: string;
  name: string;
  address: string | null;
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
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="e.g. Detroit Warehouse" />
            </div>
            <div>
              <Label className="text-xs">Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full address" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving} className="gap-1">
              <Save className="size-4" />
              {initial ? "Update" : "Add Warehouse"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              <X className="size-4" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function WarehousesPage() {
  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
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
    load();
  }, [load]);

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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Warehouses</h1>
          <p className="text-sm text-muted-foreground">Manage delivery locations</p>
        </div>
        {!showAdd && (
          <Button onClick={() => { setShowAdd(true); setEditingId(null); }} className="gap-2">
            <Plus className="size-4" />
            Add Warehouse
          </Button>
        )}
      </div>

      {showAdd && (
        <WarehouseForm onSave={handleSaved} onCancel={() => setShowAdd(false)} />
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 && !showAdd ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No warehouses yet</p>
            <Button variant="outline" className="mt-4" onClick={() => setShowAdd(true)}>
              Add your first warehouse
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((w) =>
            editingId === w.id ? (
              <WarehouseForm
                key={w.id}
                initial={w}
                onSave={handleSaved}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <Card key={w.id} className="group transition-colors hover:bg-accent/50">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{w.name}</div>
                    {w.address && (
                      <div className="mt-0.5 text-xs text-muted-foreground">{w.address}</div>
                    )}
                  </div>
                  <div className="ml-2 flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon-sm" onClick={() => { setEditingId(w.id); setShowAdd(false); }}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(w.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </div>
      )}
    </div>
  );
}
