"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Save, X, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

interface Client {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
}

interface ClientManagerProps {
  onSelect?: (client: Client) => void;
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
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-3">
      <div>
        <Label className="text-xs">Name *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div>
        <Label className="text-xs">Address</Label>
        <Input value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <div>
        <Label className="text-xs">Phone</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div>
        <Label className="text-xs">Email</Label>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving} className="gap-1">
          <Save className="size-3" />
          {initial ? "Update" : "Add"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X className="size-3" />
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function ClientManager({ onSelect }: ClientManagerProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [open, setOpen] = useState(false);

  const loadClients = useCallback(async () => {
    setLoading(true);
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
    if (open) loadClients();
  }, [open, loadClients]);

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

  function handleSelect(client: Client) {
    onSelect?.(client);
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1" />
        }
      >
        <Users className="size-3.5" />
        Clients
      </SheetTrigger>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Clients</SheetTitle>
          <SheetDescription>Manage your client list</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-auto px-4 pb-4 space-y-3">
          {/* Add button */}
          {!showAdd && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1"
              onClick={() => { setShowAdd(true); setEditingId(null); }}
            >
              <Plus className="size-3.5" />
              Add Client
            </Button>
          )}

          {/* Add form */}
          {showAdd && (
            <ClientForm
              onSave={handleSaved}
              onCancel={() => setShowAdd(false)}
            />
          )}

          {/* Client list */}
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
          ) : clients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No clients yet</p>
          ) : (
            clients.map((client) =>
              editingId === client.id ? (
                <ClientForm
                  key={client.id}
                  initial={client}
                  onSave={handleSaved}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div
                  key={client.id}
                  className="group flex items-start justify-between rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => handleSelect(client)}
                  >
                    <div className="text-sm font-medium">{client.name}</div>
                    {(client.email || client.phone) && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {[client.email, client.phone].filter(Boolean).join(" · ")}
                      </div>
                    )}
                    {client.address && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {client.address}
                      </div>
                    )}
                  </button>
                  <div className="ml-2 flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => { setEditingId(client.id); setShowAdd(false); }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(client.id)}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              )
            )
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
