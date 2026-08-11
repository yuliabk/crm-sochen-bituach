export async function sendSmsMessage(phone: string, message: string) {
  const url = process.env.SMS_API_URL;
  const token = process.env.SMS_API_TOKEN;
  if (!url || !token) {
    throw new Error("SMS_API_URL / SMS_API_TOKEN not configured");
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ phone, message }),
  });

  if (!res.ok) {
    throw new Error(`SMS send failed: ${res.status} ${await res.text()}`);
  }

  return res.json().catch(() => ({}));
}
