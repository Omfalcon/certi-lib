import { RateLimiterMemory } from 'rate-limiter-flexible';

/**
 * Rate limiter for the /api/verify endpoint.
 * Allows max 10 requests per IP per minute.
 * In production with multiple serverless instances, consider using
 * RateLimiterRedis with Upstash Redis instead.
 */
export const verifyRateLimiter = new RateLimiterMemory({
  points: 10,       // max requests
  duration: 60,     // per 60 seconds
});

/**
 * Rate limiter for the admin upload endpoints.
 * More restrictive — 5 requests per 5 minutes per IP.
 */
export const adminRateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 300,
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
