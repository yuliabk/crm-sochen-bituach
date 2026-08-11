import { createClient } from "@/lib/supabase/server";
import type { Policy } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PoliciesPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("policies")
    .select("*, clients(full_name)")
    .order("renewal_date", { ascending: true });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">פוליסות</h1>
      {error && <p className="text-sm text-red-600">{error.message}</p>}
      <ul className="divide-y rounded-lg border bg-white">
        {(
          (data ?? []) as (Policy & { clients: { full_name: string } | null })[]
        ).map((policy) => (
          <li key={policy.id} className="flex justify-between px-4 py-3">
            <span>
              {policy.clients?.full_name ?? "לקוח"} — {policy.insurance_company} (
              {policy.branch})
            </span>
            <span className="text-sm text-gray-500">
              חידוש: {policy.renewal_date} · {policy.status}
            </span>
          </li>
        ))}
        {(data ?? []).length === 0 && !error && (
          <li className="px-4 py-3 text-sm text-gray-500">אין פוליסות עדיין.</li>
        )}
      </ul>
    </div>
  );
}
