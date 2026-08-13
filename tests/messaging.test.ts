import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendToClient } from "../lib/messaging";

test("records both attempts when WhatsApp fails and SMS succeeds", async () => {
  process.env.GREEN_API_INSTANCE_ID = "instance";
  process.env.GREEN_API_TOKEN = "token";
  process.env.SMS_PROVIDER_API_URL = "https://sms.example.test/send";
  process.env.SMS_PROVIDER_API_KEY = "sms-key";

  const calls: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    calls.push(String(input));
    if (calls.length === 1) return new Response("not on WhatsApp", { status: 500 });
    return Response.json({ ok: true });
  };

  const logs: Record<string, unknown>[] = [];
  const supabase = {
    from(table: string) {
      assert.equal(table, "communication_logs");
      return {
        async insert(row: Record<string, unknown>) {
          logs.push(row);
          return { error: null };
        },
      };
    },
  } as unknown as SupabaseClient;

  try {
    const result = await sendToClient(
      supabase,
      "agent-id",
      { id: "client-id", phone: "050-1234567", preferred_channel: "auto" },
      "hello"
    );

    assert.deepEqual(result, { channel: "sms", status: "sent" });
    assert.deepEqual(
      logs.map(({ channel, delivery_status }) => ({ channel, delivery_status })),
      [
        { channel: "whatsapp", delivery_status: "failed" },
        { channel: "sms", delivery_status: "sent" },
      ]
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
