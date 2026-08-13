import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendToClient } from "@/lib/messaging";

export async function POST(request: NextRequest) {
  const supabase = createClient();
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

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, phone, preferred_channel")
    .eq("id", client_id)
    .single();

  if (clientError || !client) {
    return NextResponse.json({ error: "client not found" }, { status: 404 });
  }

  const result = await sendToClient(supabase, user.id, client, message);

  return NextResponse.json({ data: result });
}
