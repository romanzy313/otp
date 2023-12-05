import crypto from 'crypto';
import type {
  AnySendArgs,
  OtpData,
  OtpSolveError,
  OtpStorage,
  SendOtpFn,
  OtpResult,
  OtpConfig,
  TokenSerializer,
} from './types';
import { OtpError } from './OtpError';
import { computeMeta, safeCompare } from './utils';
import { OpenTokenSerializer } from './serializers/OpenTokenSerializer';

export class OtpService<SendArgs extends AnySendArgs = AnySendArgs> {
  private storage: OtpStorage;
  private storagePrefix: string;
  private generateId: () => string;
  private hash: (value: string) => string;
  private timeToSolve: number;
  private timeToResend: number;
  private maxAttempts: number;
  private gracePeriod: number;
  private storageTtl: number;
  private generateSolution: () => string;
  private tokenSerializer: TokenSerializer;
  private _sendOtp?: SendOtpFn<SendArgs>;

  constructor({
    storage,
    generateSolution,
    sendOtp,
    storagePrefix = '',
    maxAttempts = 3,
    timeToSolve = 5 * 60 * 1000,
    timeToResend = 1 * 60 * 1000,
    gracePeriod = 5000,
    ttlFactor = 4,
    hashingAlgorithm = 'sha256',
    idEntropy = 32,
    tokenSerializer = new OpenTokenSerializer(),
  }: OtpConfig<SendArgs>) {
    if (ttlFactor < 1) throw new Error('ttl factor cannot be less then 1');

    if (hashingAlgorithm && typeof hashingAlgorithm === 'string') {
      const listOfSupportedHashes = crypto.getHashes();
      if (!listOfSupportedHashes.includes(hashingAlgorithm)) {
        throw new Error(
          `Hashing algorithm '${hashingAlgorithm}' is not supported by the crypto module. Supported hashing functions: ${listOfSupportedHashes.join(
            ', '
          )}`
        );
      }
    }

    this.storage = storage;
    this.storagePrefix = storagePrefix;
    this.maxAttempts = maxAttempts;
    this.timeToSolve = timeToSolve;
    this.timeToResend = timeToResend;
    this.gracePeriod = gracePeriod;
    this.storageTtl = Math.ceil((this.timeToSolve * ttlFactor) / 1000);
    this.generateSolution = generateSolution;
    this._sendOtp = sendOtp;

    this.generateId = () => crypto.randomBytes(idEntropy).toString('base64url');

    // TODO make this async? to not block the main thread?
    this.hash =
      typeof hashingAlgorithm === 'function'
        ? hashingAlgorithm
        : hashingAlgorithm === null
        ? (v) => v
        : (value) =>
            crypto.createHash(hashingAlgorithm).update(value).digest('hex');

    this.tokenSerializer = tokenSerializer;
  }

  private calculateResendableAt(expiresAt: number) {
    return expiresAt - this.timeToSolve + this.timeToResend;
  }

  // TODO rename to getTokenData?
  /**
   * Recieves the current status of the token only if it exists, otherwise it throws
   *
   * @throws {OtpError}
   */
  async getTokenInformation<Data = unknown>(
    token: string
  ): Promise<OtpResult<Data>> {
    // this function can be moved in
    const data = this.tokenSerializer.parse<Data>(token);

    const solution = await this.getSolution(token);
    const isSolved = solution === 'S';

    const meta = computeMeta(data, isSolved);

    const error: OtpSolveError | null = meta.isExpired
      ? 'EXPIRED'
      : !meta.canAttempt
      ? 'NO_ATTEMPTS_REMAINING'
      : null;

    return {
      token,
      data,
      meta,
      error,
    };
  }

  /**
   * Check the solution of the token. Default behavior is to invalidate the token when it is solved correctly.
   *
   * Last option allowReuseOfSolvedToken allows to mark the token as solved instead of invalidating it,
   * so that it can be checked inside another API route with getTokenInformation function.
   * If this option is used, the developer is responsible to invalidating the token after use.
   *
   * Usefull when solved token will be sent to another endpoint.
   * It is the only way to keep logic not pretaining to otp solving outside of otp endpoints,
   * Otherwise everything goes through otp handlers and it gets messy very quickly.
   * Simply send solved token to an API endpoint, and
   *
   * allowReuseOfSolvedToken should be set to true if validation of multiple tokens is required.
   * For example, when phone and email needs to be validated before registration.
   * While multiple otps are solved, we want to keep them existing in the cache before proceeding to registration
   *
   * @param token
   * @param solution
   * @param extra
   * @throws {OtpError}
   */
  async check<Data = unknown>(
    token: string,
    solution: string,
    extra?: {
      allowReuseOfSolvedToken?: boolean;
    }
  ): Promise<OtpResult<Data>> {
    const data = this.tokenSerializer.parse<Data>(token);

    if (data.attemptsRemaining == 0) {
      // no attempts remaining, only possible when the token was not solved
      return {
        token,
        data: data,
        meta: computeMeta(data, false),
        // instead return if user can attempt or not
        error: 'NO_ATTEMPTS_REMAINING',
      };
    }

    // Check if expiry time has passed
    const now = Date.now();
    const isExpired = now > data.expiresAt + this.gracePeriod;
    if (isExpired)
      return {
        token,
        data: data,
        meta: computeMeta(data, false),
        error: 'EXPIRED',
      };

    const dbSolution = await this.getSolution(token);

    if (dbSolution === 'S') {
      // meanining it was solved before
      return {
        token,
        data: data,
        meta: computeMeta(data, true),
        error: null,
      };
    }

    const isCorrect = safeCompare(dbSolution, solution);

    if (!isCorrect) {
      // decrease the amount of attemts
      data.attemptsRemaining--;

      const newToken = this.tokenSerializer.stringify(data);

      // invalidate old token first
      await this.invalidateToken(token);
      // issue new token then
      await this.setSolution(newToken, dbSolution);

      // returning NO_ATTEMPTS_REMAINING if there are 0 attempts left
      return {
        token: newToken,
        data: data,
        meta: computeMeta(data, false),
        error:
          data.attemptsRemaining == 0
            ? 'NO_ATTEMPTS_REMAINING'
            : 'BAD_SOLUTION',
      };
    }

    if (extra?.allowReuseOfSolvedToken) {
      await this.setSolution(token, 'S');
    } else {
      // invalidate the token if it is not needed anymore
      await this.invalidateToken(token);
    }

    return {
      token,
      data,
      meta: computeMeta(data, true),
      error: null,
    };
  }

  /**
   * Issues a new token
   *
   * @param account
   * @param sendArgs arguments passed to sendOtp
   * @param customData any JSON-encodable data can be embedded into the token
   *
   * @throws {OtpError}
   */
  async issue<Data = unknown>(
    account: string,
    sendArgs: SendArgs,
    customData?: Data
  ): Promise<OtpResult<Data>> {
    const now = Date.now();

    const expiresAt = now + this.timeToSolve;
    const solution = this.generateSolution();

    const data: OtpData<Data> = {
      id: this.generateId(),
      account,
      attemptsRemaining: this.maxAttempts,
      expiresAt,
      resendAt: this.calculateResendableAt(expiresAt),
      customData: customData as Data,
    };

    const token = this.tokenSerializer.stringify(data);

    await this.sendOtp(account, solution, sendArgs);
    await this.setSolution(token, solution);

    return {
      token,
      data,
      meta: computeMeta(data, false),
      error: null,
    };
  }
  /**
   * Resends otp message and issues a new token
   *
   * @param token
   * @param sendArgs arguments passed to sendOtp
   *
   * @throws {OtpError}
   */
  async resend<Data = unknown>(
    token: string,
    sendArgs: SendArgs
  ): Promise<OtpResult<Data>> {
    // const data = serverDecodeToken<Data>(token);
    const data = await this.getTokenInformation<Data>(token);

    // dont return error if its too early to resend
    // good user will never encounter it!
    // here I need meta, for now its rough
    const now = Date.now();
    const canResend = now > data.data.resendAt - this.gracePeriod;

    if (!canResend) throw new OtpError('BAD_REQUEST', 'TOO_EARLY_TO_RESEND');

    await this.invalidateToken(token);

    return this.issue<Data>(data.data.account, sendArgs, data.data.customData);
  }

  /**
   * Invalidate a token. Important to call this function when
   * allowReuseOfSolvedToken is enabled when solution is checked
   *
   * @throws {OtpError}
   */
  async invalidateToken(token: string): Promise<void> {
    try {
      const hash = this.hash(token);

      await this.storage.invalidate(this.storagePrefix + hash);
    } catch {
      throw new OtpError('INTERNAL_ERROR', 'STORAGE_FAILURE');
    }
  }

  private async sendOtp(account: string, solution: string, args: SendArgs) {
    if (!this._sendOtp) return;

    try {
      await this._sendOtp(account, solution, args);
    } catch {
      throw new OtpError('INTERNAL_ERROR', 'STORAGE_FAILURE');
    }
  }

  private async setSolution(token: string, value: 'S' | string): Promise<void> {
    try {
      const hash = this.hash(token);
      await this.storage.set(this.storagePrefix + hash, value, this.storageTtl);
    } catch {
      throw new OtpError('INTERNAL_ERROR', 'STORAGE_FAILURE');
    }
  }

  private async getSolution(token: string): Promise<'S' | string> {
    let res: 'S' | string | null;
    try {
      const hash = this.hash(token);
      res = await this.storage.get(this.storagePrefix + hash); // the s type
    } catch {
      throw new OtpError('INTERNAL_ERROR', 'STORAGE_FAILURE');
    }

    if (res === null) throw new OtpError('BAD_REQUEST', 'BAD_TOKEN');

    return res;
  }
}

// // TODO this needs more work
// /**
//  * This is work in progress
//  *
//  * Should this function invalidate tokens on when all are solved?
//  * Maybe provide an option: "invalidateWhenAllSolved?: boolean"
//  * Or returning invalidateAll function is okay?
//  *
//  * Returning invalidateAll function is really out of place code-style wise
//  *
//  * maybe multi-token functionality needs to be implemented in a class that
//  * extends this one. It can also make sure that data is stored outside the tokens
//  * and that each token is associated with the same data
//  *
//  * @throws {OtpError}
//  */
// async WIP_checkIfAllTokensAreSolved(tokens: string[]) {
//   const results = await Promise.all(
//     tokens.map((token) => this.getTokenInformation(token))
//   );

//   const allSolved = results.every((result) => result.meta.isSolved);

//   const invalidateAll = async () => {
//     await Promise.all(tokens.map((token) => this.invalidateToken(token)));
//   };

//   return {
//     allSolved,
//     results,
//     invalidateAll,
//   };
// }
