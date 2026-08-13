"use client";

import { useEffect, useState } from "react";
import type { Client, ClientStatus, PreferredChannel } from "@/lib/types";

const STATUSES: ClientStatus[] = ["active", "lead", "inactive"];
const CHANNEL_PREFS: PreferredChannel[] = ["auto", "whatsapp_only", "sms_only"];

interface EditForm {
  full_name: string;
  phone: string;
  email: string;
  id_number: string;
  birth_date: string;
  preferred_channel: PreferredChannel;
  status: ClientStatus;
  notes: string;
}

function toEditForm(client: Client): EditForm {
  return {
    full_name: client.full_name,
    phone: client.phone,
    email: client.email ?? "",
    id_number: client.id_number ?? "",
    birth_date: client.birth_date ?? "",
    preferred_channel: client.preferred_channel,
    status: client.status,
    notes: client.notes ?? "",
  };
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    id_number: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [messagingId, setMessagingId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageResult, setMessageResult] = useState<string | null>(null);

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
      setForm({ full_name: "", phone: "", email: "", id_number: "" });
      await loadClients();
    }
    setSubmitting(false);
  }

  function startEdit(client: Client) {
    setEditingId(client.id);
    setEditForm(toEditForm(client));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  async function saveEdit(id: string) {
    if (!editForm) return;
    setSavingEdit(true);
    const res = await fetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editForm,
        email: editForm.email || null,
        id_number: editForm.id_number || null,
        birth_date: editForm.birth_date || null,
        notes: editForm.notes || null,
      }),
    });
    setSavingEdit(false);
    if (res.ok) {
      cancelEdit();
      await loadClients();
    } else {
      const json = await res.json();
      setError(json.error ?? "שגיאה בעדכון לקוח");
    }
  }

  async function deleteClient(id: string) {
    if (!confirm("למחוק את הלקוח? פעולה זו תמחק גם את הפוליסות והמשימות שלו."))
      return;
    const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
    if (res.ok) await loadClients();
  }

  function startMessage(id: string) {
    setMessagingId(id);
    setMessageText("");
    setMessageResult(null);
  }

  async function sendMessage(id: string) {
    if (!messageText.trim()) return;
    setSendingMessage(true);
    setMessageResult(null);
    const res = await fetch("/api/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: id, message: messageText }),
    });
    const json = await res.json();
    setSendingMessage(false);
    if (!res.ok) {
      setMessageResult(json.error ?? "שגיאה בשליחה");
      return;
    }
    setMessageResult(
      json.data.status === "sent"
        ? `נשלח בהצלחה בערוץ ${json.data.channel}`
        : `השליחה נכשלה: ${json.data.error ?? ""}`
    );
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
          placeholder="ת&quot;ז"
          className="w-32 rounded border px-3 py-2"
          value={form.id_number}
          onChange={(e) => setForm({ ...form, id_number: e.target.value })}
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
            <li key={client.id} className="space-y-3 px-4 py-3">
              {editingId === client.id && editForm ? (
                <div className="flex flex-wrap gap-2">
                  <input
                    className="flex-1 rounded border px-2 py-1"
                    placeholder="שם מלא"
                    value={editForm.full_name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, full_name: e.target.value })
                    }
                  />
                  <input
                    className="flex-1 rounded border px-2 py-1"
                    placeholder="טלפון"
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm({ ...editForm, phone: e.target.value })
                    }
                  />
                  <input
                    className="flex-1 rounded border px-2 py-1"
                    placeholder="אימייל"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                  />
                  <input
                    className="w-32 rounded border px-2 py-1"
                    placeholder="ת&quot;ז"
                    value={editForm.id_number}
                    onChange={(e) =>
                      setEditForm({ ...editForm, id_number: e.target.value })
                    }
                  />
                  <input
                    type="date"
                    className="rounded border px-2 py-1"
                    value={editForm.birth_date ?? ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, birth_date: e.target.value })
                    }
                  />
                  <select
                    className="rounded border px-2 py-1"
                    value={editForm.preferred_channel}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        preferred_channel: e.target.value as PreferredChannel,
                      })
                    }
                  >
                    {CHANNEL_PREFS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <select
                    className="rounded border px-2 py-1"
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        status: e.target.value as ClientStatus,
                      })
                    }
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <input
                    className="min-w-[10rem] flex-1 rounded border px-2 py-1"
                    placeholder="הערות"
                    value={editForm.notes ?? ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, notes: e.target.value })
                    }
                  />
                  <button
                    disabled={savingEdit}
                    onClick={() => saveEdit(client.id)}
                    className="rounded bg-gray-900 px-3 py-1 text-white disabled:opacity-50"
                  >
                    שמור
                  </button>
                  <button onClick={cancelEdit} className="text-sm text-gray-500">
                    ביטול
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>{client.full_name}</span>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span>{client.phone}</span>
                    <span>{client.status}</span>
                    <button
                      onClick={() => startEdit(client)}
                      className="text-blue-600 hover:underline"
                    >
                      ערוך
                    </button>
                    <button
                      onClick={() => startMessage(client.id)}
                      className="text-blue-600 hover:underline"
                    >
                      שלח הודעה
                    </button>
                    <button
                      onClick={() => deleteClient(client.id)}
                      className="text-red-600 hover:underline"
                    >
                      מחק
                    </button>
                  </div>
                </div>
              )}

              {messagingId === client.id && (
                <div className="flex flex-wrap items-center gap-2 rounded border bg-gray-50 p-2">
                  <input
                    className="flex-1 rounded border px-2 py-1"
                    placeholder="תוכן ההודעה (WhatsApp, נופל אוטומטית ל-SMS)"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                  />
                  <button
                    disabled={sendingMessage}
                    onClick={() => sendMessage(client.id)}
                    className="rounded bg-gray-900 px-3 py-1 text-white disabled:opacity-50"
                  >
                    שלח
                  </button>
                  <button
                    onClick={() => setMessagingId(null)}
                    className="text-sm text-gray-500"
                  >
                    סגור
                  </button>
                  {messageResult && (
                    <span className="text-sm text-gray-600">{messageResult}</span>
                  )}
                </div>
              )}
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
