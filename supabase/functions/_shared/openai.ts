// LLM helpers (streaming + JSON) using Deno fetch.
// Provider: OpenAI by default; OpenRouter supported as a drop-in (same chat.completions shape).
// Key detection is prefix-based: "sk-or-" keys are routed to OpenRouter no matter
// which secret slot they're stored in, so users can paste either provider's key.
// Keys are read from Edge Function secrets — never from the client.

const DEFAULT_MODEL = "gpt-4o-mini";

function isOpenRouterKey(key: string): boolean {
  return key.trim().toLowerCase().startsWith("sk-or-");
}

function providerConfig(): { baseUrl: string; key: string } {
  const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  if (openrouterKey || (openaiKey && isOpenRouterKey(openaiKey))) {
    const key = openrouterKey || openaiKey!;
    return { baseUrl: "https://openrouter.ai/api/v1", key };
  }
  if (!openaiKey) {
    throw new Error("LLM API key missing: set OPENAI_API_KEY (or OPENROUTER_API_KEY)");
  }
  return { baseUrl: "https://api.openai.com/v1", key: openaiKey };
}

function model(): string {
  return Deno.env.get("LLM_MODEL") || DEFAULT_MODEL;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Stream a chat completion, invoking onDelta for each content token.
 * Returns the fully accumulated text.
 */
export async function streamChat(
  messages: ChatMessage[],
  onDelta: (delta: string) => void,
  opts: { maxTokens?: number; temperature?: number } = {},
): Promise<string> {
  const { baseUrl, key } = providerConfig();
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: model(),
      messages,
      stream: true,
      max_tokens: opts.maxTokens ?? 400,
      temperature: opts.temperature ?? 0.8,
    }),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`LLM error ${res.status}: ${text.slice(0, 300)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const parsed = JSON.parse(payload);
        const delta: string | undefined = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          text += delta;
          onDelta(delta);
        }
      } catch {
        // keep-alive comment or partial frame — ignore
      }
    }
  }
  return text;
}

/**
 * Non-streaming completion with a JSON object response.
 */
export async function chatJSON(
  messages: ChatMessage[],
  opts: { maxTokens?: number; temperature?: number } = {},
): Promise<Record<string, unknown>> {
  const { baseUrl, key } = providerConfig();
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: model(),
      messages,
      stream: false,
      max_tokens: opts.maxTokens ?? 600,
      temperature: opts.temperature ?? 0.5,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LLM error ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(content);
}
