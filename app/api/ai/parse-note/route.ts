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
  const supabase = await createClient();
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
        if (audio.size > 25 * 1024 * 1024) {
          return NextResponse.json(
            { error: "audio file exceeds the 25 MB limit" },
            { status: 413 }
          );
        }
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

    if (text.length > 50_000) {
      return NextResponse.json(
        { error: "text exceeds the 50,000 character limit" },
        { status: 413 }
      );
    }

    const extracted = await extractStructuredData(text);
    return NextResponse.json({ data: { transcript: text, extracted } });
  } catch (err) {
    console.error("AI note parsing failed", err);
    return NextResponse.json(
      { error: "AI processing failed" },
      { status: 502 }
    );
  }
}
