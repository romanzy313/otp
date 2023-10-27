import {
  OtpBadRequestCause,
  OtpInternalErrorCause,
  OtpIssueError,
} from './types';

/**
 * Well typed custom error
 */
export class OtpError extends Error {
  public name: 'OtpError';
  constructor(message: 'BAD_REQUEST', cause: OtpBadRequestCause);
  constructor(message: 'INTERNAL_ERROR', cause: OtpInternalErrorCause);
  constructor(
    public message: OtpIssueError,
    public cause: OtpBadRequestCause | OtpInternalErrorCause
  ) {
    super(message, {
      cause,
    });
    this.name = 'OtpError';
  }
}
