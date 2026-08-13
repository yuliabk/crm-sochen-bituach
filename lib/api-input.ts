export function pickFields(
  value: unknown,
  allowedFields: readonly string[]
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const input = value as Record<string, unknown>;
  return Object.fromEntries(
    allowedFields
      .filter((field) => Object.prototype.hasOwnProperty.call(input, field))
      .map((field) => [field, input[field]])
  );
}

export const CLIENT_FIELDS = [
  "id_number",
  "full_name",
  "phone",
  "email",
  "birth_date",
  "preferred_channel",
  "status",
  "notes",
] as const;

export const POLICY_FIELDS = [
  "client_id",
  "policy_number",
  "company",
  "insurance_type",
  "start_date",
  "renewal_date",
  "monthly_premium",
  "status",
] as const;

export const TASK_FIELDS = [
  "client_id",
  "task_type",
  "due_date",
  "priority",
  "status",
  "description",
] as const;
