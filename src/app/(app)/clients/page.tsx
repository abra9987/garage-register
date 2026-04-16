"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Client {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
}

function ClientForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Client;
  onSave: (client: Client) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const url = initial ? `/api/clients/${initial.id}` : "/api/clients";
      const method = initial ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address, phone, email }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const { data } = await res.json();
      onSave(data);
      toast.success(initial ? "Client updated" : "Client added");
    } catch {
      toast.error("Failed to save client");
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
              <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving} className="gap-1">
              <Save className="size-4" />
              {initial ? "Update" : "Add Client"}
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

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const loadClients = useCallback(async () => {
    try {
      const res = await fetch("/api/clients");
      const { data } = await res.json();
      setClients(data ?? []);
    } catch {
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setClients((prev) => prev.filter((c) => c.id !== id));
      toast.success("Client deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  function handleSaved(client: Client) {
    setClients((prev) => {
      const idx = prev.findIndex((c) => c.id === client.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = client;
        return next;
      }
      return [client, ...prev];
    });
    setEditingId(null);
    setShowAdd(false);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">Manage your client list</p>
        </div>
        {!showAdd && (
          <Button onClick={() => { setShowAdd(true); setEditingId(null); }} className="gap-2">
            <Plus className="size-4" />
            Add Client
          </Button>
        )}
      </div>

      {showAdd && (
        <ClientForm onSave={handleSaved} onCancel={() => setShowAdd(false)} />
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : clients.length === 0 && !showAdd ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No clients yet</p>
            <Button variant="outline" className="mt-4" onClick={() => setShowAdd(true)}>
              Add your first client
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {clients.map((client) =>
            editingId === client.id ? (
              <ClientForm
                key={client.id}
                initial={client}
                onSave={handleSaved}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <Card
                key={client.id}
                className="group transition-colors hover:bg-accent/50"
              >
                <CardContent className="flex items-center justify-between py-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{client.name}</div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                      {client.email && <span>{client.email}</span>}
                      {client.phone && <span>{client.phone}</span>}
                      {client.address && <span className="truncate">{client.address}</span>}
                    </div>
                  </div>
                  <div className="ml-2 flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => { setEditingId(client.id); setShowAdd(false); }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(client.id)}
                    >
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
