import { createClient } from "@/lib/supabase/server";
import type { AgentTask } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*, clients(full_name)")
    .order("due_date", { ascending: true });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">משימות</h1>
      {error && <p className="text-sm text-red-600">{error.message}</p>}
      <ul className="divide-y rounded-lg border bg-white">
        {(
          (data ?? []) as (AgentTask & {
            clients: { full_name: string } | null;
          })[]
        ).map((task) => (
          <li key={task.id} className="flex justify-between px-4 py-3">
            <span>
              {task.clients?.full_name ?? "כללי"} — {task.task_type}
            </span>
            <span className="text-sm text-gray-500">
              {task.due_date ?? "ללא תאריך"} · {task.priority} · {task.status}
            </span>
          </li>
        ))}
        {(data ?? []).length === 0 && !error && (
          <li className="px-4 py-3 text-sm text-gray-500">אין משימות עדיין.</li>
        )}
      </ul>
    </div>
  );
}
