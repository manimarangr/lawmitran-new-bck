/**
 * Minimal fetch-based LLM client (docs/12 P1) — no SDK dependencies.
 * Used ONLY to rephrase/select from the curated knowledge base, never to
 * generate legal rules. All failures degrade silently to the deterministic KB.
 */
import { Logger } from '@nestjs/common';

const logger = new Logger('LlmClient');
const TIMEOUT_MS = 25_000; // thinking models (Gemini 3 Flash) can take 10s+

export interface LlmConfig {
  provider: string; // 'openai' | 'gemini'
  apiKey: string;
  model: string;
}

async function withTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Single-turn completion returning raw text, or null on any failure.
 * Transient provider errors (429 rate-spike / 503 overload) get ONE retry
 * after a short backoff before falling back to the deterministic path.
 */
// ---- quota circuit breaker -------------------------------------------------
// When the provider reports an exhausted quota (429) there is no point firing
// more calls — each one just burns latency (and budget on paid plans). We
// pause ALL LLM calls, let the deterministic KB serve everyone at zero cost,
// and re-probe automatically once the cooldown lapses.
let pausedUntil = 0;

const QUOTA_COOLDOWN_MS = 30 * 60_000; // daily/billing quota exhausted
const SPIKE_COOLDOWN_MS = 60_000; // per-minute rate limit / persistent overload

export function llmPaused(): boolean {
  return Date.now() < pausedUntil;
}

function pause(ms: number, reason: string) {
  pausedUntil = Date.now() + ms;
  logger.warn(
    `AI calls paused for ${Math.max(1, Math.round(ms / 60_000))} min — deterministic KB keeps serving. Reason: ${reason}`,
  );
}

export async function complete(
  cfg: LlmConfig,
  system: string,
  user: string,
): Promise<string | null> {
  if (llmPaused()) return null; // breaker open — instant deterministic fallback

  const first = await completeOnce(cfg, system, user);
  if (first.ok) return first.text ?? null;

  if (first.quota) {
    // 429: retrying only burns more quota — back off instead.
    pause(
      first.daily ? QUOTA_COOLDOWN_MS : SPIKE_COOLDOWN_MS,
      first.error ?? 'quota exceeded',
    );
    return null;
  }
  if (first.transient) {
    await new Promise((r) => setTimeout(r, 1500));
    const second = await completeOnce(cfg, system, user);
    if (second.ok) return second.text ?? null;
    // still overloaded — stop hammering (each attempt can cost 25s of latency)
    pause(SPIKE_COOLDOWN_MS, second.error ?? 'provider overloaded');
    return null;
  }
  logger.warn(`LLM call failed (${cfg.provider}): ${first.error}`);
  return null;
}

interface OnceResult {
  ok: boolean;
  text?: string | null;
  transient?: boolean;
  quota?: boolean;
  daily?: boolean;
  error?: string;
}

async function completeOnce(
  cfg: LlmConfig,
  system: string,
  user: string,
): Promise<OnceResult> {
  try {
    if (cfg.provider === 'gemini') {
      const model = cfg.model || 'gemini-flash-latest';
      const res = await withTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cfg.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: user }] }],
            // thinking tokens count against the cap on Gemini 2.5+/3 — leave headroom
            generationConfig: { temperature: 0.2, maxOutputTokens: 2000 },
          }),
        },
      );
      if (!res.ok) {
        throw new Error(
          `gemini ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`,
        );
      }
      const body = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      return {
        ok: true,
        text: body.candidates?.[0]?.content?.parts?.[0]?.text ?? null,
      };
    }

    // default: openai-compatible chat completions
    const res = await withTimeout(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify({
          model: cfg.model || 'gpt-4o-mini',
          temperature: 0.2,
          max_tokens: 500,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      },
    );
    if (!res.ok) {
      throw new Error(
        `openai ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`,
      );
    }
    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return { ok: true, text: body.choices?.[0]?.message?.content ?? null };
  } catch (err) {
    const msg = (err as Error).message ?? 'unknown';
    const quota = /\b429\b|quota|RESOURCE_EXHAUSTED/i.test(msg);
    const daily = quota && /per ?day|plan and billing/i.test(msg);
    const transient =
      !quota && /\b503\b|overloaded|UNAVAILABLE|aborted/i.test(msg);
    return { ok: false, quota, daily, transient, error: msg.slice(0, 300) };
  }
}
