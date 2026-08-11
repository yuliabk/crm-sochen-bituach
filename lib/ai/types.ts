export interface ExtractedClientPolicyData {
  client: {
    full_name: string | null;
    phone: string | null;
    national_id: string | null;
    email: string | null;
  };
  policy: {
    insurance_company: string | null;
    branch: string | null;
    monthly_premium: number | null;
    renewal_date: string | null;
  };
  summary: string | null;
}

export const EXTRACTION_JSON_SCHEMA_DESCRIPTION = `
Return strictly valid JSON matching this shape (use null for anything not mentioned):
{
  "client": { "full_name": string|null, "phone": string|null, "national_id": string|null, "email": string|null },
  "policy": { "insurance_company": string|null, "branch": string|null, "monthly_premium": number|null, "renewal_date": string|null (YYYY-MM-DD) },
  "summary": string|null
}`;
