type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  scope: string;
  userId: string;
  request: Request;
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSec: number;
  remaining: number;
};

const globalForRateLimit = globalThis as unknown as {
  __taskflowRateLimitBuckets?: Map<string, RateLimitBucket>;
};

function getBuckets() {
  if (!globalForRateLimit.__taskflowRateLimitBuckets) {
    globalForRateLimit.__taskflowRateLimitBuckets = new Map<string, RateLimitBucket>();
  }
  return globalForRateLimit.__taskflowRateLimitBuckets;
}

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

function cleanupExpiredBuckets(buckets: Map<string, RateLimitBucket>, now: number) {
  for (const [key, value] of buckets.entries()) {
    if (value.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function consumeRateLimit(options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const buckets = getBuckets();
  cleanupExpiredBuckets(buckets, now);

  const ip = getClientIp(options.request);
  const key = `${options.scope}:${options.userId}:${ip}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return {
      allowed: true,
      retryAfterSec: Math.ceil(options.windowMs / 1000),
      remaining: Math.max(options.limit - 1, 0),
    };
  }

  if (current.count >= options.limit) {
    return {
      allowed: false,
      retryAfterSec: Math.max(Math.ceil((current.resetAt - now) / 1000), 1),
      remaining: 0,
    };
  }

  current.count += 1;
  buckets.set(key, current);

  return {
    allowed: true,
    retryAfterSec: Math.max(Math.ceil((current.resetAt - now) / 1000), 1),
    remaining: Math.max(options.limit - current.count, 0),
  };
}
