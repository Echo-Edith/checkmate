import "server-only";

const DEFAULT_MODEL = "gemini-flash-latest";

interface GeminiChunk {
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

function extractText(chunk: GeminiChunk): string {
  return (
    chunk.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("") ?? ""
  );
}

async function request(apiKey: string, model: string, body: Record<string, unknown>): Promise<Response> {
  try {
    return await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(25000),
      },
    );
  } catch {
    throw new GeminiError("The AI tutor did not respond in time. Please try again.", 504);
  }
}

/**
 * Calls Gemini from the server and returns the answer as a stream of plain text,
 * so the browser can show it while it is being written. The API key never reaches the browser.
 */
export async function streamGemini(system: string, user: string): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiError("The AI tutor is not configured. Missing environment variable GEMINI_API_KEY.", 503);
  }
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const base = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
  };
  const fast = { ...base, generationConfig: { temperature: 0.5, maxOutputTokens: 900, thinkingConfig: { thinkingBudget: 0 } } };

  // Turning thinking off makes answers much faster. If the model rejects that setting, retry without it.
  let response = await request(apiKey, model, fast);
  if (response.status === 400) {
    response = await request(apiKey, model, { ...base, generationConfig: { temperature: 0.5, maxOutputTokens: 1500 } });
  }

  if (!response.ok || !response.body) {
    // Do not log the response body or the key.
    console.error("Gemini request failed with status", response.status);
    if (response.status === 429) throw new GeminiError("The AI tutor is busy. Please try again in a moment.", 429);
    throw new GeminiError("The AI tutor is unavailable right now.", 502);
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  function emit(line: string, controller: TransformStreamDefaultController<Uint8Array>): void {
    if (!line.startsWith("data:")) return;
    const json = line.slice(5).trim();
    if (!json) return;
    try {
      const text = extractText(JSON.parse(json) as GeminiChunk);
      if (text) controller.enqueue(encoder.encode(text));
    } catch {
      // Ignore a partial or malformed event.
    }
  }

  return response.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) emit(line, controller);
      },
      flush(controller) {
        if (buffer) emit(buffer, controller);
      },
    }),
  );
}
