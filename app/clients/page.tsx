"use client";

import { useEffect, useState } from "react";
import type { Client } from "@/lib/types";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ full_name: "", phone: "", email: "" });
  const [submitting, setSubmitting] = useState(false);

  async function loadClients() {
    setLoading(true);
    const res = await fetch("/api/clients");
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "שגיאה בטעינת לקוחות");
    } else {
      setClients(json.data);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadClients();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "שגיאה בהוספת לקוח");
    } else {
      setForm({ full_name: "", phone: "", email: "" });
      await loadClients();
    }
    setSubmitting(false);
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">לקוחות</h1>

      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap gap-3 rounded-lg border bg-white p-4"
      >
        <input
          required
          placeholder="שם מלא"
          className="flex-1 rounded border px-3 py-2"
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
        />
        <input
          required
          placeholder="טלפון"
          className="flex-1 rounded border px-3 py-2"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <input
          placeholder="אימייל"
          className="flex-1 rounded border px-3 py-2"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50"
        >
          הוסף לקוח
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-gray-500">טוען...</p>
      ) : (
        <ul className="divide-y rounded-lg border bg-white">
          {clients.map((client) => (
            <li key={client.id} className="flex justify-between px-4 py-3">
              <span>{client.full_name}</span>
              <span className="text-sm text-gray-500">
                {client.phone} · {client.status}
              </span>
            </li>
          ))}
          {clients.length === 0 && (
            <li className="px-4 py-3 text-sm text-gray-500">אין לקוחות עדיין.</li>
          )}
        </ul>
      )}
    </div>
  );
}
