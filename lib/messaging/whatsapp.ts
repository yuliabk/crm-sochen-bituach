/**
 * Converts a local Israeli phone number (e.g. "050-1234567" or "0501234567")
 * into the international-format WhatsApp chat ID Green API expects
 * ("972501234567@c.us").
 */
function toWhatsAppChatId(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("0") ? digits.slice(1) : digits;
  const international = digits.startsWith("972") ? digits : `972${local}`;
  return `${international}@c.us`;
}

/**
 * Sends a WhatsApp message via Green API
 * (https://green-api.com/en/docs/api/sending/SendMessage/).
 */
export async function sendWhatsAppMessage(phone: string, message: string) {
  const instanceId = process.env.GREEN_API_INSTANCE_ID;
  const token = process.env.GREEN_API_TOKEN;
  if (!instanceId || !token) {
    throw new Error("GREEN_API_INSTANCE_ID / GREEN_API_TOKEN not configured");
  }

  const url = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chatId: toWhatsAppChatId(phone),
      message,
    }),
  });

  if (!res.ok) {
    throw new Error(`WhatsApp send failed: ${res.status} ${await res.text()}`);
  }

  return res.json().catch(() => ({}));
}
