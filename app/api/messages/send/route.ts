import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendToClient } from "@/lib/messaging";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { client_id, message } = await request.json();
  if (!client_id || !message) {
    return NextResponse.json(
      { error: "client_id and message are required" },
      { status: 400 }
    );
  }
  if (typeof client_id !== "string" || typeof message !== "string") {
    return NextResponse.json(
      { error: "client_id and message must be strings" },
      { status: 400 }
    );
  }
  if (message.length > 4_000) {
    return NextResponse.json(
      { error: "message exceeds the 4,000 character limit" },
      { status: 413 }
    );
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, phone, preferred_channel")
    .eq("id", client_id)
    .single();

  if (clientError || !client) {
    return NextResponse.json({ error: "client not found" }, { status: 404 });
  }

  try {
    const result = await sendToClient(supabase, user.id, client, message);
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Message delivery failed", error);
    return NextResponse.json({ error: "message delivery failed" }, { status: 502 });
  }
}
