import { createClient } from "@/lib/supabase/server";
import type { AgentTask, Policy } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  const supabase = createClient();
  const today = new Date();
  const in30Days = new Date(today);
  in30Days.setDate(today.getDate() + 30);

  const [renewalsRes, tasksRes] = await Promise.all([
    supabase
      .from("policies")
      .select("*, clients(full_name)")
      .lte("renewal_date", in30Days.toISOString().slice(0, 10))
      .order("renewal_date", { ascending: true })
      .limit(10),
    supabase
      .from("tasks")
      .select("*, clients(full_name)")
      .in("status", ["open", "in_progress"])
      .order("due_date", { ascending: true })
      .limit(10),
  ]);

  return {
    renewals: renewalsRes.data ?? [],
    tasks: tasksRes.data ?? [],
    renewalsError: renewalsRes.error?.message,
    tasksError: tasksRes.error?.message,
  };
}

export default async function DashboardPage() {
  const { renewals, tasks, renewalsError, tasksError } =
    await getDashboardData();

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">דשבורד בוקר</h1>

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          חידושי פוליסות ב-30 הימים הקרובים
        </h2>
        {renewalsError && (
          <p className="text-sm text-red-600">
            שגיאה בטעינת נתונים: {renewalsError}
          </p>
        )}
        {!renewalsError && renewals.length === 0 && (
          <p className="text-sm text-gray-500">אין חידושים קרובים.</p>
        )}
        <ul className="divide-y rounded-lg border bg-white">
          {(renewals as (Policy & { clients: { full_name: string } | null })[]).map(
            (policy) => (
              <li key={policy.id} className="flex justify-between px-4 py-3">
                <span>
                  {policy.clients?.full_name ?? "לקוח"} — {policy.company}
                </span>
                <span className="text-sm text-gray-500">
                  {policy.renewal_date}
                </span>
              </li>
            )
          )}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">משימות פתוחות</h2>
        {tasksError && (
          <p className="text-sm text-red-600">
            שגיאה בטעינת נתונים: {tasksError}
          </p>
        )}
        {!tasksError && tasks.length === 0 && (
          <p className="text-sm text-gray-500">אין משימות פתוחות.</p>
        )}
        <ul className="divide-y rounded-lg border bg-white">
          {(tasks as (AgentTask & { clients: { full_name: string } | null })[]).map(
            (task) => (
              <li key={task.id} className="flex justify-between px-4 py-3">
                <span>
                  {task.clients?.full_name ?? "כללי"} — {task.task_type}
                </span>
                <span className="text-sm text-gray-500">{task.due_date}</span>
              </li>
            )
          )}
        </ul>
      </section>
    </div>
  );
}
