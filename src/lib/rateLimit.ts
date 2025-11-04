// Simple in-memory rate limiter for client-side spam prevention
// This provides a first line of defense; server-side RLS is the ultimate security layer

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  identifier: string; // e.g., "report:user123", "message:user123"
}

export function checkRateLimit({ maxRequests, windowMs, identifier }: RateLimitConfig): {
  allowed: boolean;
  resetAt?: number;
  remaining?: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // No entry or expired window - allow and create new entry
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  // Within window - check count
  if (entry.count < maxRequests) {
    entry.count++;
    return { allowed: true, remaining: maxRequests - entry.count };
  }

  // Rate limit exceeded
  return { 
    allowed: false, 
    resetAt: entry.resetAt,
    remaining: 0 
  };
}

export function formatResetTime(resetAt: number): string {
  const seconds = Math.ceil((resetAt - Date.now()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes}min`;
}
