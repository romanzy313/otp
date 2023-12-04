import { OtpError } from './OtpError';
import { OtpData, OtpMeta } from './types';

/**
 * @internal
 */
export function computeMeta(data: OtpData, isSolved: boolean): OtpMeta {
  const now = Date.now();

  return {
    isSolved,
    canAttempt: data.attemptsRemaining > 0,
    canResend: now > data.resendAt,
    isExpired: now > data.expiresAt,
  };
}

// TODO make safe, but may not be needed
/**
 * @internal
 */
export function safeCompare(actual: string, provided: string) {
  return actual === provided;
}

// not used really, but could wrap all methods in this
// for an alternative way, without try/catch
/**
 * @internal
 */
export async function asyncResultOrNull<R>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  throwable: (...args: any[]) => Promise<R>
) {
  try {
    return await throwable();
  } catch (error) {
    return null;
  }
}
