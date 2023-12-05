export type OtpConfig<SendArgs> = {
  /**
   * Storage where the solutions are stored.
   * To write your own implement OtpStorage interface
   */
  storage: OtpStorage;

  /**
   * Function to generate the solution for an otp
   *
   * There are some helpers available out of the box:
   *  - numericalSolutionGenerator
   */
  generateSolution: () => string;

  /**
   * If defined the library will use this function to send otp codes.
   * If not defined, the developer is responsible to send codes themselves.
   *
   * @param account which account is used, typically phone number or email
   * @param solution solution of this otp
   * @param args additional arguments for generating otp message. Useful when need to use internalization or username in otp messages
   * @returns void promise. If there is a failure while sending, the function MUST throw
   */
  sendOtp?: SendOtpFn<SendArgs>;

  /**
   * Prefixes keys in storage.
   *
   * @default "" no prefix is used
   */
  storagePrefix?: string;
  /**
   * Maximum amount of attempts for each unique issue.
   *
   * @default 3
   */
  maxAttempts?: number;

  /**
   * For how many milliseconds is the token is valid for
   *
   * @default 300_000 5 minutes
   */
  timeToSolve?: number; // in millisends, standard javascript

  /**
   * After how many milliseconds the token can be resent (and re-issued)
   *
   * @default 60_000 1 minute
   */
  timeToResend?: number;

  /**
   * By how many milliseconds the client may miss timeToSolve and timeToResend
   *
   * @default 5000 5 seconds
   */
  gracePeriod?: number;

  /**
   * How many times of expiry length of the token kept in the cache
   * Higher values are recommended so that expired tokens do not dissapear
   * and user see proper EXPIRED error, rather then BAD_REQUEST
   *
   * Note: not all storage implementations support ttl, consult the documentation
   *
   * Essentually sets ttl of storage.set function as timeToSolve * ttlFactor
   *
   * @default 4
   */
  ttlFactor?: number;

  /**
   * What algorithm is used when determining the storage key.
   * Can be left null to use entire token as storage key, not recommended.
   *
   * No need for fancy hashing algorithms, it only needs to withstand collisions.
   * I think md5 would work well too? sha256 seems like overkill
   *
   * @default "sha256"
   */
  hashingAlgorithm?: string | null | ((input: string) => string); // default sha256

  /**
   * How many random bytes are used to generate a unique id for new tokens.
   * This value does not need to be too high, as there are many other unknowns.
   * Furthermore tokens are invalidated after each attempt
   *
   * @default 32
   */
  idEntropy?: number;

  /**
   * define custom serializers/deserializers.
   * By default entire value of the token will be visible to the client.
   * Useful when client side rendering. Other built in options are:
   *  - openTokenEncryptedDataSerializer: only customData of the token is encrypted, the rest is readable to the client. Recommended method.
   *  - encryptedTokenSerializer: entire token is serialized, SSR only. Technically does not provide extra security compared to openTokenEncryptedDataSerializer
   *
   * @default openTokenSerializer
   */
  tokenSerializer?: TokenSerializer;
};

export interface OtpStorage {
  /**
   * Saves solution to storage
   *
   * @param ttl time to live, in seconds
   * @throws when storage malfunctions
   */
  set(key: string, value: string, ttl: number): Promise<void>;
  /**
   * Returns solution from storage
   *
   * @returns string when value is found. Null when key does not exist.
   * @throws when storage malfunctions
   */
  get(key: string): Promise<string | null>;
  /**
   * Invalidates solution from storage
   *
   * @throws when storage malfunctions
   */
  invalidate(key: string): Promise<void>;
}

/**
 * If defined, the library will use this function to send otp codes.
 * If not defined, the developer is responsible to send codes themselves.
 *
 * @param account which account is used, typically phone number or email
 * @param solution solution of this one time password
 * @param args additional arguments for generating otp message. Useful when need to use internalization or username in otp messages
 * @returns void promise. If there is a failure while sending, the function MUST throw
 */
export type SendOtpFn<SendArgs> = (
  account: string,
  solution: string,
  args: SendArgs
) => Promise<void>;

/**
 * Data that should be used for server-side rendering
 * Do NOT send this to the client, as they can derive all of these values
 * from the token using browserDecodeToken helper function
 */
export type OtpData<Data = unknown> = Pretty<{
  id: string;
  account: string;
  expiresAt: number;
  resendAt: number;
  attemptsRemaining: number;
  customData: Data;
}>;

/**
 * Precalculated information for server-side rendering
 * Do NOT send this to the client, as they have to dynamically calculate these values
 */
export type OtpMeta = {
  isSolved: boolean;
  canResend: boolean;
  canAttempt: boolean;
  isExpired: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnySendArgs = Record<string, any>;

/**
 * Result of most otp operations.
 * Send only token and error to the client
 *
 * Use data and meta to perform server-side rendering
 */
export type OtpResult<Data = unknown> = {
  token: string;
  data: OtpData<Data>;
  meta: OtpMeta;
  error: OtpSolveError | null;
};

export type OtpIssueError = 'BAD_REQUEST' | 'INTERNAL_ERROR';
export type OtpBadRequestCause = 'BAD_TOKEN' | 'TOO_EARLY_TO_RESEND';
export type OtpInternalErrorCause = 'STORAGE_FAILURE' | 'STORAGE_FAILURE';

export type OtpSolveError =
  | 'NO_ATTEMPTS_REMAINING'
  | 'EXPIRED'
  | 'BAD_SOLUTION';

export interface TokenSerializer {
  stringify<Data = unknown>(data: OtpData<Data>): string;
  parse<Data = unknown>(token: string): OtpData<Data>;
}

type Pretty<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
