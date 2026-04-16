"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Pencil, Trash2, Save, X, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <form onSubmit={handleSubmit} className="space-y-2 p-3 border-b">
      <div>
        <Label className="text-xs">Name *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus className="h-8 text-sm" />
      </div>
      <div>
        <Label className="text-xs">Address</Label>
        <Input value={address} onChange={(e) => setAddress(e.target.value)} className="h-8 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Email</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} className="h-8 text-sm" />
        </div>
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

export function ClientManager({ onSelect }: ClientManagerProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    if (open) {
      loadClients();
      setEditingId(null);
      setShowAdd(false);
    }
  }, [open, loadClients]);

  // Close on click outside
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
    <div ref={containerRef} className="relative">
      <Button
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={() => setOpen((v) => !v)}
      >
        <Users className="size-3.5" />
        Clients
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border bg-popover shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-medium">Clients</span>
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

          {/* Add form */}
          {showAdd && (
            <ClientForm
              onSave={handleSaved}
              onCancel={() => setShowAdd(false)}
            />
          )}

          {/* Client list */}
          <div className="max-h-72 overflow-auto">
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
                    className="group flex items-start justify-between px-3 py-2 hover:bg-accent/50 transition-colors border-b last:border-b-0"
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => handleSelect(client)}
                    >
                      <div className="text-sm font-medium">{client.name}</div>
                      {(client.email || client.phone) && (
                        <div className="text-xs text-muted-foreground">
                          {[client.email, client.phone].filter(Boolean).join(" · ")}
                        </div>
                      )}
                      {client.address && (
                        <div className="text-xs text-muted-foreground truncate">
                          {client.address}
                        </div>
                      )}
                    </button>
                    <div className="ml-2 flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => { setEditingId(client.id); setShowAdd(false); }}
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(client.id)}
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
