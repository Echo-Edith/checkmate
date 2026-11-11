import type { TutorRequest } from "@/lib/tutor/schema";

export class TutorClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Calls the secure server route. Throws TutorClientError with a user-friendly message. */
export async function askTutor(request: TutorRequest): Promise<string> {
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

  const data = (await response.json().catch(() => ({}))) as { reply?: string; error?: string };
  if (!response.ok || !data.reply) {
    throw new TutorClientError(data.error ?? "The tutor could not answer right now.", response.status);
  }
  return data.reply;
}
