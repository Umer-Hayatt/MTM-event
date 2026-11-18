// LLM port: one fetch to an OpenAI-compatible chat API.
// Why: provider-agnostic (Groq main, Cerebras backup, both free), honest token counts from `usage`,
// and every attempt (including failures) is written to the trace so it never misreports.
import type { Area } from "./types.ts";
import type { Trace } from "./trace.ts";

type Provider = { name: string; url: string; key: string | undefined; model: string };

function providers(): Provider[] {
  return [
    { name: "groq", url: "https://api.groq.com/openai/v1/chat/completions", key: process.env.GROQ_API_KEY, model: process.env.GROQ_MODEL || "llama-3.1-8b-instant" },
    { name: "cerebras", url: "https://api.cerebras.ai/v1/chat/completions", key: process.env.CEREBRAS_API_KEY, model: process.env.CEREBRAS_MODEL || "llama3.1-8b" },
    { name: "gemini", url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", key: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite" },
    { name: "gemini-b", url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", key: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL_B || "gemini-3.1-flash-lite" },
    { name: "xai", url: "https://api.x.ai/v1/chat/completions", key: process.env.XAI_API_KEY, model: process.env.XAI_MODEL || "grok-3-mini" },
  ].filter((p) => p.key);
}

const TIMEOUT_MS = 60_000;

export class CallBudget {
  used = 0;
  max: number;
  constructor(max: number) { this.max = max; }
  take(): boolean {
    if (this.used >= this.max) return false;
    this.used++;
    return true;
  }
}

/** Sends system+user, expects a JSON object back. Tries Groq, then Cerebras. Throws if all fail. */
export async function callModel(opts: { area: Area; system: string; user: string; trace: Trace; budget: CallBudget; note?: string }): Promise<string> {
  const list = providers();
  if (!list.length) throw new Error("No model key configured. Set GROQ_API_KEY, CEREBRAS_API_KEY, GEMINI_API_KEY or XAI_API_KEY in .env");
  let lastErr = "";
  const retried = new Set<string>();
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (!opts.budget.take()) throw new Error(`Call limit reached (${opts.budget.max} calls for this run)`);
    const t0 = Date.now();
    try {
      const res = await fetch(p.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.key}` },
        body: JSON.stringify({
          model: p.model,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: opts.system },
            { role: "user", content: opts.user },
          ],
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const raw = (await res.json()) as unknown;
      // Gemini wraps errors in an array; unwrap so the trace shows the provider's reason.
      const body = (Array.isArray(raw) ? raw[0] : raw) as {
        choices?: { message?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
        error?: { message?: string };
      };
      const content = body.choices?.[0]?.message?.content ?? "";
      opts.trace.call({
        model: `${p.name}/${p.model}`,
        area: opts.area,
        input: `[system ${opts.system.length} chars, shown once in README]\n${opts.user}`,
        output: res.ok ? content : `HTTP ${res.status}: ${body.error?.message ?? ""}`,
        inputTokens: body.usage?.prompt_tokens ?? 0,
        outputTokens: body.usage?.completion_tokens ?? 0,
        ok: res.ok && !!content,
        ms: Date.now() - t0,
        note: opts.note,
      });
      if (res.ok && content) return content;
      lastErr = `${p.name}: HTTP ${res.status} ${body.error?.message ?? ""}`;
      // Overloaded / rate-limited: retry the same provider once after a short wait (logged as its own call).
      if ((res.status === 429 || res.status >= 500) && !retried.has(p.name)) {
        retried.add(p.name);
        await new Promise((r) => setTimeout(r, 3000));
        i--;
      }
    } catch (e) {
      lastErr = `${p.name}: ${(e as Error).message}`;
      opts.trace.call({
        model: `${p.name}/${p.model}`, area: opts.area, input: opts.user, output: `ERROR ${lastErr}`,
        inputTokens: 0, outputTokens: 0, ok: false, ms: Date.now() - t0, note: opts.note,
      });
      // Network drop / timeout: one retry of the same provider (logged as its own call).
      if (!retried.has(p.name)) {
        retried.add(p.name);
        await new Promise((r) => setTimeout(r, 2000));
        i--;
      }
    }
  }
  throw new Error(`All providers failed. Last: ${lastErr}`);
}
