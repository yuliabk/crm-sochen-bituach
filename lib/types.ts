export type PreferredChannel = "auto" | "whatsapp_only" | "sms_only";
export type ClientStatus = "active" | "inactive" | "lead";

export interface Client {
  id: string;
  agent_id: string;
  id_number: string;
  full_name: string;
  phone: string;
  email: string | null;
  birth_date: string | null;
  preferred_channel: PreferredChannel;
  status: ClientStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type PolicyStatus = "active" | "expired" | "cancelled" | "pending_renewal";

export interface Policy {
  id: string;
  agent_id: string;
  client_id: string;
  policy_number: string;
  company: string;
  insurance_type: string;
  start_date: string;
  renewal_date: string;
  monthly_premium: number;
  status: PolicyStatus;
  created_at: string;
  updated_at: string;
}

export type TaskPriority = "high" | "medium" | "low";
export type TaskStatus = "open" | "in_progress" | "completed";

export interface AgentTask {
  id: string;
  agent_id: string;
  client_id: string | null;
  task_type: string;
  due_date: string;
  priority: TaskPriority;
  status: TaskStatus;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export type CommChannel = "whatsapp" | "sms";
export type DeliveryStatus = "sent" | "delivered" | "failed";

export interface CommunicationLog {
  id: string;
  agent_id: string;
  client_id: string;
  channel: CommChannel;
  message_body: string;
  delivery_status: DeliveryStatus;
  created_at: string;
}
