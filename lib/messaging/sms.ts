/**
 * Sends an SMS via an Israeli SMS gateway (019 SMS or InforUMobile), used as
 * the Smart Fallback channel for clients without WhatsApp (e.g. the
 * kosher-phone segment) or when a WhatsApp send fails.
 *
 * 019 and InforUMobile each have their own request/response shape; this
 * function targets a generic JSON gateway configured via SMS_PROVIDER_API_URL
 * and should be adjusted to match whichever provider's actual API contract
 * is used in production.
 */
export async function sendSmsMessage(phone: string, message: string) {
  const url = process.env.SMS_PROVIDER_API_URL;
  const apiKey = process.env.SMS_PROVIDER_API_KEY;
  const senderName = process.env.SMS_SENDER_NAME;
  if (!url || !apiKey) {
    throw new Error("SMS_PROVIDER_API_URL / SMS_PROVIDER_API_KEY not configured");
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      recipient: phone,
      message,
      sender: senderName,
    }),
  });

  if (!res.ok) {
    throw new Error(`SMS send failed: ${res.status} ${await res.text()}`);
  }

  return res.json().catch(() => ({}));
}
