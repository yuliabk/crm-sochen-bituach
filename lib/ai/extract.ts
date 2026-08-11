import {
  EXTRACTION_JSON_SCHEMA_DESCRIPTION,
  type ExtractedClientPolicyData,
} from "./types";

const SYSTEM_PROMPT = `You extract structured insurance-agent CRM data (client + policy details) from free text (often a transcribed voice note or WhatsApp message) written in Hebrew or English. ${EXTRACTION_JSON_SCHEMA_DESCRIPTION}`;

async function extractWithOpenAI(text: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`GPT-4o extraction failed: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  return json.choices[0].message.content as string;
}

async function extractWithGemini(text: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n${text}` }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini extraction failed: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  return json.candidates[0].content.parts[0].text as string;
}

/**
 * Extracts structured client/policy JSON from free text, per the spec's
 * "AI Engine" (Gemini 1.5 Pro / GPT-4o) requirement. Provider is chosen via
 * AI_PROVIDER=openai|gemini, defaulting to whichever API key is configured.
 */
export async function extractStructuredData(
  text: string
): Promise<ExtractedClientPolicyData> {
  const provider =
    process.env.AI_PROVIDER ??
    (process.env.OPENAI_API_KEY ? "openai" : "gemini");

  const raw =
    provider === "gemini"
      ? await extractWithGemini(text)
      : await extractWithOpenAI(text);

  return JSON.parse(raw) as ExtractedClientPolicyData;
}
