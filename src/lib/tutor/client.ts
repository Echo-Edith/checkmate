import type { TutorRequest } from "@/lib/tutor/schema";

export class TutorClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/**
 * Calls the secure server route. The answer streams in, so `onText` receives the
 * text so far while it is still being written. Throws TutorClientError with a friendly message.
 */
export async function askTutor(request: TutorRequest, onText?: (textSoFar: string) => void): Promise<string> {
  let response: Response;
  try {
    response = await fetch("/api/tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    throw new TutorClientError("Could not reach the server. Check your connection.", 0);
  }

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new TutorClientError(data.error ?? "The tutor could not answer right now.", response.status);
  }
  if (!response.body) throw new TutorClientError("The tutor returned an empty answer.", 502);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      onText?.(text);
    }
  } catch {
    if (!text) throw new TutorClientError("The connection broke. Please try again.", 0);
  }

  const answer = text.trim();
  if (!answer) throw new TutorClientError("The tutor returned an empty answer. Please try again.", 502);
  return answer;
}
