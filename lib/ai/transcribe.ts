/**
 * Transcribes a voice note (e.g. a WhatsApp audio message) using OpenAI
 * Whisper, per the spec's "AI Engine" section.
 */
export async function transcribeAudio(
  audioBlob: Blob,
  filename: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const formData = new FormData();
  formData.append("file", audioBlob, filename);
  formData.append("model", "whisper-1");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Whisper transcription failed: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as { text: string };
  return json.text;
}
