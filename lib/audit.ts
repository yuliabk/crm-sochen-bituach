import type { SupabaseClient } from "@supabase/supabase-js";

type AuditedEntity = "clients" | "policies" | "tasks";

export async function logRead(
  supabase: SupabaseClient,
  agentId: string,
  entityType: AuditedEntity,
  entityId?: string,
  metadata: Record<string, unknown> = {}
) {
  const { error } = await supabase.from("audit_logs").insert({
    agent_id: agentId,
    action: "select",
    entity_type: entityType,
    entity_id: entityId ?? null,
    metadata,
  });

  if (error) {
    throw new Error(`failed to write audit log: ${error.message}`);
  }
}
