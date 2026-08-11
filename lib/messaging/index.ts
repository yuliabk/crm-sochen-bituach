import type { SupabaseClient } from "@supabase/supabase-js";
import type { Client, CommChannel } from "@/lib/types";
import { sendWhatsAppMessage } from "./whatsapp";
import { sendSmsMessage } from "./sms";

interface SendResult {
  channel: CommChannel;
  status: "sent" | "failed";
  error?: string;
}

/**
 * Sends a message to a client following the Dual-Channel Architecture from
 * the spec: WhatsApp is the primary channel, with an automatic fallback to
 * SMS when the client prefers SMS-only or the WhatsApp send fails. Every
 * attempt is recorded in `logs` (append-only audit trail).
 */
export async function sendToClient(
  supabase: SupabaseClient,
  agentId: string,
  client: Pick<Client, "id" | "phone" | "channel_preference">,
  message: string
): Promise<SendResult> {
  const tryChannel = async (channel: CommChannel): Promise<SendResult> => {
    try {
      if (channel === "whatsapp") {
        await sendWhatsAppMessage(client.phone, message);
      } else {
        await sendSmsMessage(client.phone, message);
      }
      return { channel, status: "sent" };
    } catch (err) {
      return {
        channel,
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  };

  let result: SendResult;

  if (client.channel_preference === "sms_only") {
    result = await tryChannel("sms");
  } else {
    result = await tryChannel("whatsapp");
    if (result.status === "failed" && client.channel_preference !== "whatsapp_only") {
      result = await tryChannel("sms");
    }
  }

  await supabase.from("logs").insert({
    agent_id: agentId,
    client_id: client.id,
    channel: result.channel,
    message_content: message,
    send_status: result.status === "sent" ? "sent" : "failed",
  });

  return result;
}
