import { OtpData } from './types';
import crypto from 'crypto';

/**
 * This is a helper function for single page applications.
 * Use it when server sends a token to render
 *
 * Do NOT use this function the server. Getting token data + meta should only be done
 * through the methods of OtpService class
 *
 * @param token Token provided by the server
 * @returns All data needed to display otp ui on the client
 */
export function browserDecodeToken<Data = unknown>(
  token: string
): OtpData<Data> {
  try {
    // Replace Base64url-specific characters
    const base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    // Use atob to decode the Base64 string

    const parts = JSON.parse(atob(base64));
    return {
      id: parts[0],
      account: parts[1],
      attemptsRemaining: parseInt(parts[2]),
      expiresAt: parseInt(parts[3]),
      resendAt: parseInt(parts[4]),
      customData: parts[5],
    };
  } catch (error) {
    throw new Error('failed to decode otp token', {
      cause: error,
    });
  }
}

/**
 * Generates random otp code with given amount of digits.
 *
 */
export function numericalSolutionGenerator(digits: number): () => string {
  if (digits < 4) {
    throw new Error('Number of digits must not be less then 4');
  }

  // TODO maybe use a different method where we are unlikely to see the same digits more then 2 times?

  const high = parseInt('9'.repeat(digits));
  const low = 0;

  return () => crypto.randomInt(low, high).toString().padStart(digits, '0');
}
