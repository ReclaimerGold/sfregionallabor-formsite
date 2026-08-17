/**
 * Minimal in-memory sliding-window limiter.
 *
 * This is per-instance state: on a serverless platform each cold instance gets
 * its own counter, so it throttles casual abuse rather than a determined
 * attacker. Combined with the honeypot it's enough for a low-traffic public
 * form. If this site ever sees real abuse, move to a shared store (Upstash
 * Redis, Vercel KV) or put Cloudflare Turnstile in front of the form.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 5;
const MAX_TRACKED_KEYS = 10_000;

const hits = new Map<string, number[]>();

export function checkRateLimit(key: string): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  // Opportunistic sweep so the map can't grow without bound.
  if (hits.size > MAX_TRACKED_KEYS) {
    for (const [existing, times] of hits) {
      if (times.every((time) => time <= cutoff)) hits.delete(existing);
    }
  }

  const recent = (hits.get(key) ?? []).filter((time) => time > cutoff);

  if (recent.length >= MAX_REQUESTS) {
    hits.set(key, recent);
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((recent[0] + WINDOW_MS - now) / 1000),
    );
    return { allowed: false, retryAfterSeconds };
  }

  recent.push(now);
  hits.set(key, recent);
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Best-effort client IP from the usual proxy headers. */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
