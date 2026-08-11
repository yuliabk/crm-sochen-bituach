import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { transcribeAudio } from "@/lib/ai/transcribe";
import { extractStructuredData } from "@/lib/ai/extract";

/**
 * Accepts either a voice note (multipart form, field "audio") or free text
 * (multipart or JSON, field "text") and returns structured client/policy
 * JSON, per the spec: "OpenAI Whisper לפענוח הודעות קוליות, ו-Gemini 1.5 Pro
 * / GPT-4o לחילוץ JSON מובנה".
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let text: string | null = null;

  try {
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const audio = formData.get("audio");
      const textField = formData.get("text");

      if (audio instanceof Blob) {
        text = await transcribeAudio(audio, "voice-note.webm");
      } else if (typeof textField === "string") {
        text = textField;
      }
    } else {
      const body = await request.json();
      text = body.text ?? null;
    }

    if (!text) {
      return NextResponse.json(
        { error: "provide an 'audio' file or 'text' field" },
        { status: 400 }
      );
    }

    const extracted = await extractStructuredData(text);
    return NextResponse.json({ data: { transcript: text, extracted } });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }
}
