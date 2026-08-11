"use client";

import { useEffect, useState } from "react";
import type {
  AgentTask,
  Client,
  TaskPriority,
  TaskStatus,
  TaskType,
} from "@/lib/types";

const TASK_TYPES: TaskType[] = ["renewal", "claim", "quote", "birthday", "other"];
const PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];
const STATUSES: TaskStatus[] = ["open", "in_progress", "done", "cancelled"];

type TaskWithClient = AgentTask & { clients: { full_name: string } | null };

const emptyForm = {
  client_id: "",
  task_type: "other" as TaskType,
  due_date: "",
  priority: "medium" as TaskPriority,
  notes: "",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskWithClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  async function loadAll() {
    setLoading(true);
    const [tasksRes, clientsRes] = await Promise.all([
      fetch("/api/tasks"),
      fetch("/api/clients"),
    ]);
    const tasksJson = await tasksRes.json();
    const clientsJson = await clientsRes.json();
    if (!tasksRes.ok) {
      setError(tasksJson.error ?? "שגיאה בטעינת משימות");
    } else {
      setTasks(tasksJson.data);
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
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        client_id: form.client_id || null,
        due_date: form.due_date || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "שגיאה בהוספת משימה");
    } else {
      setForm(emptyForm);
      await loadAll();
    }
    setSubmitting(false);
  }

  async function updateStatus(id: string, status: TaskStatus) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) await loadAll();
  }

  async function deleteTask(id: string) {
    if (!confirm("למחוק את המשימה?")) return;
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (res.ok) await loadAll();
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">משימות</h1>

      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap gap-3 rounded-lg border bg-white p-4"
      >
        <select
          className="rounded border px-3 py-2"
          value={form.client_id}
          onChange={(e) => setForm({ ...form, client_id: e.target.value })}
        >
          <option value="">כללי (ללא לקוח)</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name}
            </option>
          ))}
        </select>
        <select
          className="rounded border px-3 py-2"
          value={form.task_type}
          onChange={(e) =>
            setForm({ ...form, task_type: e.target.value as TaskType })
          }
        >
          {TASK_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="rounded border px-3 py-2"
          value={form.due_date}
          onChange={(e) => setForm({ ...form, due_date: e.target.value })}
        />
        <select
          className="rounded border px-3 py-2"
          value={form.priority}
          onChange={(e) =>
            setForm({ ...form, priority: e.target.value as TaskPriority })
          }
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          placeholder="הערות"
          className="flex-1 rounded border px-3 py-2"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50"
        >
          הוסף משימה
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-gray-500">טוען...</p>
      ) : (
        <ul className="divide-y rounded-lg border bg-white">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
            >
              <span>
                {task.clients?.full_name ?? "כללי"} — {task.task_type}
              </span>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>{task.due_date ?? "ללא תאריך"}</span>
                <span>{task.priority}</span>
                <select
                  className="rounded border px-2 py-1"
                  value={task.status}
                  onChange={(e) =>
                    updateStatus(task.id, e.target.value as TaskStatus)
                  }
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="text-red-600 hover:underline"
                >
                  מחק
                </button>
              </div>
            </li>
          ))}
          {tasks.length === 0 && (
            <li className="px-4 py-3 text-sm text-gray-500">אין משימות עדיין.</li>
          )}
        </ul>
      )}
    </div>
  );
}
