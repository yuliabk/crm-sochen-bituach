"use client";

import { useEffect, useState } from "react";
import type { Client, Policy, PolicyStatus } from "@/lib/types";

const STATUSES: PolicyStatus[] = [
  "active",
  "pending_renewal",
  "expired",
  "cancelled",
];

type PolicyWithClient = Policy & { clients: { full_name: string } | null };

const emptyForm = {
  client_id: "",
  policy_number: "",
  company: "",
  insurance_type: "",
  start_date: "",
  renewal_date: "",
  monthly_premium: "",
};

type EditForm = Pick<
  Policy,
  | "policy_number"
  | "company"
  | "insurance_type"
  | "start_date"
  | "renewal_date"
  | "monthly_premium"
  | "status"
>;

function toEditForm(policy: Policy): EditForm {
  return {
    policy_number: policy.policy_number,
    company: policy.company,
    insurance_type: policy.insurance_type,
    start_date: policy.start_date,
    renewal_date: policy.renewal_date,
    monthly_premium: policy.monthly_premium,
    status: policy.status,
  };
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<PolicyWithClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  async function loadAll() {
    setLoading(true);
    const [policiesRes, clientsRes] = await Promise.all([
      fetch("/api/policies"),
      fetch("/api/clients"),
    ]);
    const policiesJson = await policiesRes.json();
    const clientsJson = await clientsRes.json();
    if (!policiesRes.ok) {
      setError(policiesJson.error ?? "שגיאה בטעינת פוליסות");
    } else {
      setPolicies(policiesJson.data);
      setError(null);
    }
    if (clientsRes.ok) setClients(clientsJson.data);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/policies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        monthly_premium: Number(form.monthly_premium) || 0,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "שגיאה בהוספת פוליסה");
    } else {
      setForm(emptyForm);
      await loadAll();
    }
    setSubmitting(false);
  }

  function startEdit(policy: Policy) {
    setEditingId(policy.id);
    setEditForm(toEditForm(policy));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  async function saveEdit(id: string) {
    if (!editForm) return;
    setSavingEdit(true);
    const res = await fetch(`/api/policies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editForm,
        monthly_premium: Number(editForm.monthly_premium) || 0,
      }),
    });
    setSavingEdit(false);
    if (res.ok) {
      cancelEdit();
      await loadAll();
    } else {
      const json = await res.json();
      setError(json.error ?? "שגיאה בעדכון פוליסה");
    }
  }

  async function deletePolicy(id: string) {
    if (!confirm("למחוק את הפוליסה?")) return;
    const res = await fetch(`/api/policies/${id}`, { method: "DELETE" });
    if (res.ok) await loadAll();
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">פוליסות</h1>

      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap gap-3 rounded-lg border bg-white p-4"
      >
        <select
          required
          className="rounded border px-3 py-2"
          value={form.client_id}
          onChange={(e) => setForm({ ...form, client_id: e.target.value })}
        >
          <option value="">בחר לקוח</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name}
            </option>
          ))}
        </select>
        <input
          required
          placeholder="מספר פוליסה"
          className="w-32 rounded border px-3 py-2"
          value={form.policy_number}
          onChange={(e) => setForm({ ...form, policy_number: e.target.value })}
        />
        <input
          required
          placeholder="חברת ביטוח"
          className="flex-1 rounded border px-3 py-2"
          value={form.company}
          onChange={(e) => setForm({ ...form, company: e.target.value })}
        />
        <input
          required
          placeholder="סוג ביטוח (רכב, דירה, בריאות...)"
          className="flex-1 rounded border px-3 py-2"
          value={form.insurance_type}
          onChange={(e) =>
            setForm({ ...form, insurance_type: e.target.value })
          }
        />
        <input
          required
          type="date"
          className="rounded border px-3 py-2"
          value={form.start_date}
          onChange={(e) => setForm({ ...form, start_date: e.target.value })}
        />
        <input
          required
          type="date"
          className="rounded border px-3 py-2"
          value={form.renewal_date}
          onChange={(e) => setForm({ ...form, renewal_date: e.target.value })}
        />
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="פרמיה חודשית"
          className="w-32 rounded border px-3 py-2"
          value={form.monthly_premium}
          onChange={(e) =>
            setForm({ ...form, monthly_premium: e.target.value })
          }
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50"
        >
          הוסף פוליסה
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-gray-500">טוען...</p>
      ) : (
        <ul className="divide-y rounded-lg border bg-white">
          {policies.map((policy) => (
            <li key={policy.id} className="px-4 py-3">
              {editingId === policy.id && editForm ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    className="w-32 rounded border px-2 py-1"
                    placeholder="מספר פוליסה"
                    value={editForm.policy_number}
                    onChange={(e) =>
                      setEditForm({ ...editForm, policy_number: e.target.value })
                    }
                  />
                  <input
                    className="flex-1 rounded border px-2 py-1"
                    placeholder="חברת ביטוח"
                    value={editForm.company}
                    onChange={(e) =>
                      setEditForm({ ...editForm, company: e.target.value })
                    }
                  />
                  <input
                    className="flex-1 rounded border px-2 py-1"
                    placeholder="סוג ביטוח"
                    value={editForm.insurance_type}
                    onChange={(e) =>
                      setEditForm({ ...editForm, insurance_type: e.target.value })
                    }
                  />
                  <input
                    type="date"
                    className="rounded border px-2 py-1"
                    value={editForm.start_date}
                    onChange={(e) =>
                      setEditForm({ ...editForm, start_date: e.target.value })
                    }
                  />
                  <input
                    type="date"
                    className="rounded border px-2 py-1"
                    value={editForm.renewal_date}
                    onChange={(e) =>
                      setEditForm({ ...editForm, renewal_date: e.target.value })
                    }
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-28 rounded border px-2 py-1"
                    value={editForm.monthly_premium}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        monthly_premium: Number(e.target.value),
                      })
                    }
                  />
                  <select
                    className="rounded border px-2 py-1"
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        status: e.target.value as PolicyStatus,
                      })
                    }
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={savingEdit}
                    onClick={() => saveEdit(policy.id)}
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
                  <span>
                    {policy.clients?.full_name ?? "לקוח"} — {policy.company} (
                    {policy.insurance_type}) #{policy.policy_number}
                  </span>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span>חידוש: {policy.renewal_date}</span>
                    <span>{policy.status}</span>
                    <button
                      onClick={() => startEdit(policy)}
                      className="text-blue-600 hover:underline"
                    >
                      ערוך
                    </button>
                    <button
                      onClick={() => deletePolicy(policy.id)}
                      className="text-red-600 hover:underline"
                    >
                      מחק
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
          {policies.length === 0 && (
            <li className="px-4 py-3 text-sm text-gray-500">אין פוליסות עדיין.</li>
          )}
        </ul>
      )}
    </div>
  );
}
