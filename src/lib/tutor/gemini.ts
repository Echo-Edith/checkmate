import "server-only";
import { logAiError } from "@/lib/db/ai-errors";

// A stable, fast model first. The "latest" alias can point at a slower preview model.
const DEFAULT_MODEL = "gemini-2.5-flash";
/** Tried in order if a model is missing, slow or overloaded. */
const FALLBACK_MODELS = ["gemini-flash-latest", "gemini-2.0-flash"];
/** Each try gets this long to start answering. */
const ATTEMPT_TIMEOUT_MS = 7000;
/** Stop starting new tries after this long, so the answer still fits inside the 30 second function limit. */
const TOTAL_BUDGET_MS = 22000;
/** Pause before another round of tries (milliseconds). The AI is tried again up to 3 rounds. */
const RETRY_PAUSES_MS = [500, 1200];
/** What players see. The real reason goes to the owner panel. */
export const AI_UNAVAILABLE_MESSAGE = "The AI didn't respond. Please try again in a moment.";

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
    throw new GeminiError("timeout or network failure" + (cause ? ` (${cause})` : ""), 504);
  }
}

export interface StreamOptions {
  maxOutputTokens?: number;
  json?: boolean;
  /** Which feature is calling, for the owner panel (for example "tutor"). */
  source?: string;
  /** The player who triggered it, for the owner panel. */
  userId?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Result of one try: a stream that already produced its first text, or the reason it failed. */
type Attempt = { ok: true; stream: ReadableStream<Uint8Array> } | { ok: false; status: number; reason: string; retry: boolean };

async function readReason(response: Response): Promise<string> {
  try {
    return (((await response.json()) as { error?: { message?: string } } | undefined)?.error?.message ?? "").slice(0, 300);
  } catch {
    return "";
  }
}

/** Turns Gemini's event stream into plain text and waits for the first words, so an empty answer counts as a failure. */
async function openStream(response: Response): Promise<ReadableStream<Uint8Array> | null> {
  if (!response.body) return null;
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

  const reader = response.body
    .pipeThrough(
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
    )
    .getReader();

  let first: ReadableStreamReadResult<Uint8Array>;
  try {
    first = await reader.read();
  } catch {
    return null;
  }
  if (first.done || !first.value) return null;

  const firstChunk = first.value;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(firstChunk);
    },
    async pull(controller) {
      try {
        const next = await reader.read();
        if (next.done) controller.close();
        else controller.enqueue(next.value);
      } catch (error) {
        controller.error(error);
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}

/**
 * Calls Gemini from the server and returns the answer as a stream of plain text,
 * so the browser can show it while it is being written. The API key never reaches the browser.
 *
 * If the AI fails (slow, overloaded, empty answer), it is tried again, going through the backup
 * models, before any error is shown. Players only ever see a short message; the detailed reason
 * is saved for the owner panel.
 */
export async function streamGemini(system: string, user: string, options: StreamOptions = {}): Promise<ReadableStream<Uint8Array>> {
  const source = options.source ?? "ai";
  const started = Date.now();
  const attempts: string[] = [];

  const fail = async (status: number, summary: string): Promise<never> => {
    await logAiError({ source, status, summary, attempts, userId: options.userId });
    throw new GeminiError(AI_UNAVAILABLE_MESSAGE, status === 429 ? 429 : 502);
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fail(503, "GEMINI_API_KEY is not set in the server environment.");
  const models = [...new Set([process.env.GEMINI_MODEL || DEFAULT_MODEL, ...FALLBACK_MODELS])];

  const base = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
  };
  const jsonMode = options.json ? { responseMimeType: "application/json" } : {};
  const fast = { ...base, generationConfig: { temperature: options.json ? 0.2 : 0.5, maxOutputTokens: options.maxOutputTokens ?? 300, thinkingConfig: { thinkingBudget: 0 }, ...jsonMode } };
  // Turning thinking off makes answers much faster. If the model rejects that setting, retry without it.
  const plain = { ...base, generationConfig: { temperature: options.json ? 0.2 : 0.5, maxOutputTokens: options.maxOutputTokens ?? 450, ...jsonMode } };

  async function tryModel(model: string): Promise<Attempt> {
    const t0 = Date.now();
    try {
      let response = await request(apiKey as string, model, fast);
      if (response.status === 400) response = await request(apiKey as string, model, plain);
      if (!response.ok) {
        const reason = await readReason(response);
        attempts.push(`${model}: HTTP ${response.status} after ${Date.now() - t0}ms ${reason}`);
        // Bad key or bad request will not get better by trying again.
        const retry = response.status === 404 || response.status === 429 || response.status >= 500;
        return { ok: false, status: response.status, reason, retry };
      }
      const stream = await openStream(response);
      if (!stream) {
        attempts.push(`${model}: empty answer after ${Date.now() - t0}ms`);
        return { ok: false, status: 502, reason: "The model returned an empty answer.", retry: true };
      }
      return { ok: true, stream };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown";
      attempts.push(`${model}: ${reason} after ${Date.now() - t0}ms`);
      return { ok: false, status: error instanceof GeminiError ? error.status : 0, reason, retry: true };
    }
  }

  let last: { status: number; reason: string } = { status: 0, reason: "No attempt was made." };
  for (let round = 0; round <= RETRY_PAUSES_MS.length; round += 1) {
    for (const model of models) {
      if (Date.now() - started > TOTAL_BUDGET_MS) {
        return fail(last.status || 504, `Gave up after ${Math.round((Date.now() - started) / 1000)}s. Last problem: ${last.reason}`);
      }
      const result = await tryModel(model);
      if (result.ok) return result.stream;
      last = result;
      // A rejected key or request is final; skip the remaining tries.
      if (!result.retry) {
        const hint =
          result.status === 401 || result.status === 403
            ? "The Gemini API key was rejected. Check GEMINI_API_KEY in Vercel."
            : `Gemini rejected the request (HTTP ${result.status}): ${result.reason}`;
        return fail(result.status, hint);
      }
    }
    const pause = RETRY_PAUSES_MS[round];
    if (pause === undefined || Date.now() - started + pause > TOTAL_BUDGET_MS) break;
    await sleep(pause);
  }

  const hint =
    last.status === 429
      ? "Gemini is busy or the free quota is used up (HTTP 429)."
      : last.status === 404
        ? "No Gemini model was found for this key. Set GEMINI_MODEL in Vercel."
        : `Gemini did not answer after retrying (last: HTTP ${last.status || "no response"}). ${last.reason}`;
  return fail(last.status, hint);
}
