import type { ChatMessage } from "./prompt.ts";

export const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

export interface CompletionRequest {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  temperature: number;
  maxTokens?: number;
  signal?: AbortSignal;
  /** Sent as HTTP-Referer for OpenRouter's app attribution (optional). */
  referer?: string;
}

export class LlmError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "LlmError";
    this.status = status;
  }
}

/** One chat completion via OpenRouter's OpenAI-compatible API. Returns the reply text. */
export async function complete(request: CompletionRequest, fetchImpl: typeof fetch = fetch): Promise<string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${request.apiKey}`,
    "Content-Type": "application/json",
    "X-Title": "Axelrod Arena",
  };
  if (request.referer) headers["HTTP-Referer"] = request.referer;

  const response = await fetchImpl(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers,
    signal: request.signal,
    body: JSON.stringify({
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens ?? 16,
    }),
  });

  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      detail = body.error?.message ?? "";
    } catch {
      // Non-JSON error body.
    }
    const hint =
      response.status === 401
        ? "Invalid or missing API key."
        : response.status === 402
          ? "Out of credits on this key."
          : response.status === 429
            ? "Rate limited. Wait a moment and try again."
            : `Request failed (${response.status}).`;
    throw new LlmError(detail ? `${hint} ${detail}` : hint, response.status);
  }

  const body = (await response.json()) as {
    choices?: { message?: { content?: string | null } }[];
    error?: { message?: string };
  };
  if (body.error?.message) throw new LlmError(body.error.message);
  return body.choices?.[0]?.message?.content ?? "";
}

export interface ModelInfo {
  id: string;
  name: string;
  /** USD per token, as strings in OpenRouter's API. */
  pricing?: { prompt?: string; completion?: string };
}

/** Public model catalogue (no key needed). */
export async function listModels(fetchImpl: typeof fetch = fetch): Promise<ModelInfo[]> {
  const response = await fetchImpl(`${OPENROUTER_BASE}/models`);
  if (!response.ok) throw new LlmError(`Could not load models (${response.status}).`, response.status);
  const body = (await response.json()) as { data?: ModelInfo[] };
  return (body.data ?? []).filter((model) => typeof model.id === "string");
}
