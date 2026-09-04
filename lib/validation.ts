/**
 * Sanitizes a string input by trimming whitespace and limiting length.
 * Prevents excessively long inputs from being stored or queried.
 */
export function sanitizeString(value: unknown, maxLength = 200): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

/**
 * Validates an email address format.
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates that a SAP ID is numeric and within expected length.
 */
export function isValidSapId(sapid: string): boolean {
  return /^\d{6,12}$/.test(sapid);
}

/**
 * Verifies the admin password against the environment variable.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifyAdminPassword(provided: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || typeof provided !== 'string') return false;
  
  // Constant-time comparison
  if (provided.length !== adminPassword.length) return false;
  
  let result = 0;
  for (let i = 0; i < provided.length; i++) {
    result |= provided.charCodeAt(i) ^ adminPassword.charCodeAt(i);
  }
  return result === 0;
}

// ----------------------------------------------------
// SECURE ADMIN SESSION HANDLING (COOKIE / HMAC-SHA256)
// ----------------------------------------------------

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

function getSessionSecret(): string {
  const adminPassword = process.env.ADMIN_PASSWORD || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'cert-lib-salt-key';
  return `${adminPassword}:${serviceKey}`;
}

/**
 * Generates a signed, cryptographically authenticated session token (HMAC-SHA256).
 */
export function createAdminSessionToken(maxAgeSeconds = 86400): string {
  const secret = getSessionSecret();
  const payload = Buffer.from(
    JSON.stringify({
      role: 'admin',
      exp: Date.now() + maxAgeSeconds * 1000,
      iat: Date.now(),
    })
  ).toString('base64url');

  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');

  return `${payload}.${signature}`;
}

/**
 * Verifies a signed session token using timing-safe comparison and checks expiration.
 */
export function verifyAdminSessionToken(token: string | undefined | null): boolean {
  if (!token || typeof token !== 'string' || !token.includes('.')) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;

  const secret = getSessionSecret();
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');

  if (sig.length !== expectedSig.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return false;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof data.exp === 'number' && data.exp > Date.now();
  } catch {
    return false;
  }
}

/**
 * Verifies an incoming admin request:
 * 1. Checks HttpOnly session cookie ('admin_session')
 * 2. Checks 'x-admin-password' header
 * 3. Checks fallback provided password (for backwards compatibility)
 */
export function verifyAdminRequest(req: NextRequest, fallbackPassword?: string): boolean {
  // 1. Primary: HttpOnly cookie
  const sessionCookie = req.cookies.get('admin_session')?.value;
  if (verifyAdminSessionToken(sessionCookie)) {
    return true;
  }

  // 2. Custom header
  const headerPassword = req.headers.get('x-admin-password');
  if (headerPassword && verifyAdminPassword(headerPassword)) {
    return true;
  }

  // 3. Fallback body password
  if (fallbackPassword && verifyAdminPassword(fallbackPassword)) {
    return true;
  }

  return false;
}

/**
 * Sets an HttpOnly, Secure, SameSite=Strict session cookie.
 */
export function setAdminSessionCookie(res: NextResponse, token: string, maxAge = 86400): void {
  res.cookies.set('admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge,
  });
}

/**
 * Clears the session cookie on logout.
 */
export function clearAdminSessionCookie(res: NextResponse): void {
  res.cookies.set('admin_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
}

/**
 * Standard JSON error response helper using NextResponse.
 */
export function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Standard JSON success response helper using NextResponse.
 */
export function successResponse(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}
