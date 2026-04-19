import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Sliding window — distributed, survives redeploys
const limiters = new Map<string, Ratelimit>();

function getLimiter(prefix: string, maxPerMinute: number): Ratelimit {
  const key = `${prefix}:${maxPerMinute}`;
  if (!limiters.has(key)) {
    limiters.set(
      key,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(maxPerMinute, "60 s"),
        prefix: `fdl:${prefix}`,
        analytics: false,
      })
    );
  }
  return limiters.get(key)!;
}

export async function checkRateLimit(
  key: string,
  maxPerMinute: number,
  prefix = "api"
): Promise<{ allowed: boolean; remaining: number; retryAfterMs: number }> {
  try {
    const limiter = getLimiter(prefix, maxPerMinute);
    const result = await limiter.limit(key);
    return {
      allowed: result.success,
      remaining: result.remaining,
      retryAfterMs: result.success ? 0 : result.reset - Date.now(),
    };
  } catch (err) {
    // If Redis is down, fail open to avoid blocking the whole app
    console.error("Rate limit error (failing open):", err);
    return { allowed: true, remaining: maxPerMinute, retryAfterMs: 0 };
  }
}
