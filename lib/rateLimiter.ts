import { RateLimiterMemory } from 'rate-limiter-flexible';

/**
 * Rate limiter for the /api/verify endpoint.
 * Allows max 10 requests per IP per minute.
 * In production with multiple serverless instances, consider using
 * RateLimiterRedis with Upstash Redis instead.
 */
export const verifyRateLimiter = new RateLimiterMemory({
  points: 30,       // max 30 requests per minute
  duration: 60,     // per 60 seconds
});

/**
 * Rate limiter for the admin endpoints.
 * Allows 120 requests per minute to support listing, searching, editing and uploading.
 */
export const adminRateLimiter = new RateLimiterMemory({
  points: 120,
  duration: 60,
});

/**
 * Extracts the real client IP from Next.js request headers.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}
