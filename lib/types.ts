export type ChannelPreference = "auto" | "whatsapp_only" | "sms_only";
export type ClientStatus = "active" | "inactive" | "lead";

export interface Client {
  id: string;
  agent_id: string;
  national_id: string | null;
  full_name: string;
  phone: string;
  email: string | null;
  birth_date: string | null;
  channel_preference: ChannelPreference;
  status: ClientStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type InsuranceBranch =
  | "car"
  | "home"
  | "health"
  | "life"
  | "pension"
  | "other";
export type PolicyStatus =
  | "active"
  | "expired"
  | "cancelled"
  | "pending_renewal";

export interface Policy {
  id: string;
  agent_id: string;
  client_id: string;
  insurance_company: string;
  branch: InsuranceBranch;
  start_date: string;
  renewal_date: string;
  monthly_premium: number;
  status: PolicyStatus;
  created_at: string;
  updated_at: string;
}

export type TaskType = "renewal" | "claim" | "quote" | "birthday" | "other";
export type TaskStatus = "open" | "in_progress" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface AgentTask {
  id: string;
  agent_id: string;
  client_id: string | null;
  task_type: TaskType;
  due_date: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type CommChannel = "whatsapp" | "sms";
export type SendStatus = "queued" | "sent" | "delivered" | "failed";

export interface CommLog {
  id: string;
  agent_id: string;
  client_id: string;
  channel: CommChannel;
  message_content: string;
  send_status: SendStatus;
  sent_at: string;
}
