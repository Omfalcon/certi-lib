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
  if (!adminPassword) return false;
  
  // Constant-time comparison
  if (provided.length !== adminPassword.length) return false;
  
  let result = 0;
  for (let i = 0; i < provided.length; i++) {
    result |= provided.charCodeAt(i) ^ adminPassword.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Standard JSON error response helper.
 */
export function errorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Standard JSON success response helper.
 */
export function successResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
