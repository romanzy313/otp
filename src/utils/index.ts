import { OtpData, OtpMeta } from '../types';

export {
  decodeBase64,
  decodeBase64Url,
  encodeBase64,
  encodeBase64Url,
} from './encode';

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
