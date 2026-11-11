import "server-only";

const DEFAULT_MODEL = "gemini-flash-latest";

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
}

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Calls the Gemini REST API from the server. The API key never reaches the browser. */
export async function askGemini(system: string, user: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiError("The AI tutor is not configured. Missing environment variable GEMINI_API_KEY.", 503);
  }
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  let response: Response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 1500 },
      }),
      signal: AbortSignal.timeout(25000),
    });
  } catch {
    throw new GeminiError("The AI tutor did not respond in time. Please try again.", 504);
  }

  if (!response.ok) {
    // Do not log the response body or the key.
    console.error("Gemini request failed with status", response.status);
    if (response.status === 429) throw new GeminiError("The AI tutor is busy. Please try again in a moment.", 429);
    throw new GeminiError("The AI tutor is unavailable right now.", 502);
  }

  const data = (await response.json()) as GeminiResponse;
  if (data.promptFeedback?.blockReason) {
    throw new GeminiError("The tutor could not answer that question.", 422);
  }
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!text) throw new GeminiError("The tutor returned an empty answer. Please try again.", 502);
  return text;
}
