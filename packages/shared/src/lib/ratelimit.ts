import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// --- Upstash is OPTIONAL for local dev ---
// If UPSTASH_REDIS_REST_URL / _TOKEN are not set, all rate limit checks
// return { success: true } so local development works without Redis.
const UPSTASH_ENABLED =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

// Passthrough limiter used when Upstash is not configured
const noopResult = { success: true as const, limit: 9999, remaining: 9999, reset: 0 };
const noopLimiter = {
  limit: async (_key: string) => noopResult,
};

// Only construct Redis + Ratelimit instances when credentials are present
function makeLimiter(maxReqs: number, window: string, prefix: string) {
  if (!UPSTASH_ENABLED) return noopLimiter;
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(maxReqs, window as `${number} ${'ms' | 's' | 'm' | 'h' | 'd'}`),
    analytics: true,
    prefix,
  });
}

// 2. Define Rate Limiters (lazy — only touch Redis if env vars are present)
const limiters = {
  anonymous: makeLimiter(10, '24 h', '@upstash/ratelimit:anon'),
  free:      makeLimiter(50,  '1 h',  '@upstash/ratelimit:free'),
  login:     makeLimiter(10, '15 m', '@upstash/ratelimit:login'),
  signup:    makeLimiter(5,   '1 h',  '@upstash/ratelimit:signup'),
};

// Export limiters for direct use in actions
export { limiters };

// Free "compare the first minute" preview (product-gaps gat 2 stap 4) — max 5/user/day, but a
// FAILED attempt (live found 2026-11-14: YouTube bot-detection on the preview path itself) must
// not cost the user a slot — a botcheck is retryable within a minute and isn't the user's fault.
// @upstash/ratelimit's sliding-window limiter always consumes on `.limit()`, so this is a plain
// manual counter (same fixed-window INCR+EXPIRE-nx shape as backend/ratelimit.py) with the
// peek/consume split that requires: check remaining WITHOUT incrementing, only INCR after the
// backend call actually succeeds.
const PREVIEW_COMPARE_MAX_PER_DAY = 5;
const PREVIEW_COMPARE_PREFIX = '@upstash/ratelimit:preview-compare';
let previewCompareRedis: Redis | null = null;
function getPreviewCompareRedis(): Redis | null {
  if (!UPSTASH_ENABLED) return null;
  if (!previewCompareRedis) {
    previewCompareRedis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN! });
  }
  return previewCompareRedis;
}

export async function previewCompareRemaining(userId: string): Promise<number> {
  const redis = getPreviewCompareRedis();
  if (!redis) return PREVIEW_COMPARE_MAX_PER_DAY; // no-op fallback for local dev without Upstash
  const count = Number((await redis.get<number>(`${PREVIEW_COMPARE_PREFIX}:${userId}`)) ?? 0);
  return Math.max(0, PREVIEW_COMPARE_MAX_PER_DAY - count);
}

export async function previewCompareConsumeSlot(userId: string): Promise<void> {
  const redis = getPreviewCompareRedis();
  if (!redis) return;
  const key = `${PREVIEW_COMPARE_PREFIX}:${userId}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 86400);
}

// 3. Helper to get Client IP in Vercel/Next.js environment
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return '127.0.0.1'; // Fallback for localhost
}

// 4. Main Rate Limit Check Function
export async function checkRateLimit(req: Request, userId?: string, isPremium: boolean = false) {
  // Premium Bypass
  if (isPremium) {
    return {
      success: true,
      limit: -1,
      reset: 0,
      remaining: 999999,
      ip: getClientIp(req),
      mode: 'premium'
    };
  }

  const ip = getClientIp(req);
  let result;
  let mode: 'free' | 'anonymous' = 'anonymous';

  if (userId) {
    // Free User Logic
    mode = 'free';
    result = await limiters.free.limit(userId);
  } else {
    // Anonymous Logic
    result = await limiters.anonymous.limit(ip);
  }

  const { success, limit, reset, remaining } = result;

  return {
    success,
    limit,
    reset,
    remaining,
    ip,
    mode
  };
}
