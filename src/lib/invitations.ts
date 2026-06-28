import { createHash, randomBytes } from 'crypto';

/**
 * Hashes an invitation code using SHA-256
 */
export function hashInvitationCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

/**
 * Generates a secure random invitation code
 */
export function generateInvitationCode(length: number = 24): string {
  // Generate random bytes and convert to base64, then clean up to be URL-safe and readable
  return randomBytes(length)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
    .substring(0, length);
}
