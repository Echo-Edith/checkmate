import "server-only";

// A stable, fast model first. The "latest" alias can point at a slower preview model.
const DEFAULT_MODEL = "gemini-2.5-flash";
/** Tried in order if a model is missing, slow or overloaded. */
const FALLBACK_MODELS = ["gemini-flash-latest", "gemini-2.0-flash"];
/** Each try gets this long to start answering. Three tries still fit inside the 30 second function limit. */
const ATTEMPT_TIMEOUT_MS = 9000;

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
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      },
    );
  } catch (error) {
    // Say why in the Vercel log (never the key): a timeout looks different from a network failure.
    const cause = (error as { cause?: { code?: string } }).cause?.code;
    console.error("Gemini fetch failed:", error instanceof Error ? error.name : "unknown", cause ?? "");
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
  const models = [...new Set([process.env.GEMINI_MODEL || DEFAULT_MODEL, ...FALLBACK_MODELS])];

  const base = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
  };
  const fast = { ...base, generationConfig: { temperature: 0.5, maxOutputTokens: 300, thinkingConfig: { thinkingBudget: 0 } } };

  // Turning thinking off makes answers much faster. If the model rejects that setting, retry without it.
  const plain = { ...base, generationConfig: { temperature: 0.5, maxOutputTokens: 450 } };

  let response: Response | undefined;
  let timedOut: GeminiError | undefined;
  for (const model of models) {
    try {
      response = await request(apiKey, model, fast);
      if (response.status === 400) response = await request(apiKey, model, plain);
      timedOut = undefined;
    } catch (error) {
      // Too slow or unreachable: try the next model.
      if (error instanceof GeminiError) timedOut = error;
      continue;
    }
    // Missing model, overloaded or a Google-side error: try the next one. Anything else is final.
    if (response.status !== 404 && response.status !== 429 && response.status < 500) break;
  }
  if (!response && timedOut) throw timedOut;

  if (!response || !response.ok || !response.body) {
    const status = response?.status ?? 0;
    // Log Google's reason (never the key) so the cause is visible in the Vercel logs.
    let reason = "";
    try {
      reason = ((await response?.json()) as { error?: { message?: string } } | undefined)?.error?.message ?? "";
    } catch {
      // No readable body.
    }
    console.error("Gemini request failed:", status, reason.slice(0, 300));
    if (status === 429) throw new GeminiError("The AI tutor is busy or out of free quota. Try again in a minute.", 429);
    if (status === 401 || status === 403) throw new GeminiError("The Gemini API key was rejected. Check GEMINI_API_KEY in Vercel.", 502);
    if (status === 404) throw new GeminiError("No Gemini model was found for this key. Set GEMINI_MODEL in Vercel.", 502);
    if (status === 400) throw new GeminiError("Gemini rejected the request. Check the Vercel logs for the reason.", 502);
    throw new GeminiError("The AI service is down right now. Please try again soon.", 502);
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
