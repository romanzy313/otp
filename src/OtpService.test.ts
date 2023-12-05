import { beforeEach, describe, expect, test } from 'vitest';
import { OtpService } from './OtpService';
import MemoryStorage from './storage/MemoryStorage';
import { OtpError } from './OtpError';
import { OpenTokenSerializer } from './serializers/OpenTokenSerializer';
// TODO use fake timers to test expires at and resend at

const memStore = new MemoryStorage();
let service: OtpService;
const openTokenSerializer = new OpenTokenSerializer();

beforeEach(() => {
  memStore.map.clear();
  service = new OtpService({
    storage: memStore,
    maxAttempts: 2,
    timeToResend: 60 * 1000,
    timeToSolve: 5 * 60 * 1000,
    gracePeriod: 5 * 1000,
    idEntropy: 32,
    ttlFactor: 1,
    hashingAlgorithm: 'sha256',
    generateSolution() {
      return '1234';
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async sendOtp(account, solution, args) {
      // do nothing
    },
  });
});

describe('core', () => {
  test('initialization', async () => {
    // test many different options
  });

  test('happy path', async () => {
    const issue = await service.issue(
      'user@email.com',
      {},
      {
        hello: 'world',
      }
    );

    expect(issue.meta).toStrictEqual({
      isSolved: false,
      canAttempt: true,
      canResend: false,
      isExpired: false,
    });
    expect(issue.data.id).toBeTypeOf('string');
    expect(issue.data.account).toBe('user@email.com');
    expect(issue.data.attemptsRemaining).toBe(2);
    expect(issue.data.customData).toStrictEqual({ hello: 'world' });

    expect(issue.token).toBeTypeOf('string');

    expect(memStore.map.size).toBe(1);

    // correct decording

    const solve = await service.check(issue.token, '1234', {
      allowReuseOfSolvedToken: true,
    });

    expect(solve.error).toBeNull();

    expect(solve.meta.isSolved).toBe(true);
    expect(solve.data.id).toBeTypeOf('string');
    expect(solve.data.account).toBe('user@email.com');
    expect(solve.data.attemptsRemaining).toBe(2);
    expect(solve.data.customData).toStrictEqual({ hello: 'world' });

    expect(memStore.map.size).toBe(1);

    await service.invalidateToken(solve.token);

    expect(memStore.map.size).toBe(0);
  });

  test('errors', async () => {
    const issue = await service.issue('+123', {});

    expect(issue.meta.isSolved).toBe(false);
    expect(issue.data.attemptsRemaining).toBe(2);

    const solve1 = await service.check(issue.token, 'badbad');

    expect(solve1.error).toBe('BAD_SOLUTION');
    expect(solve1.data.attemptsRemaining).toBe(1);

    const solve2 = await service.check(solve1.token, 'superbad');

    expect(solve2.error).toBe('NO_ATTEMPTS_REMAINING');
    expect(solve2.meta.canAttempt).toBe(false);
    expect(solve2.data.attemptsRemaining).toBe(0);

    expect(memStore.map.size).toBe(1); // double check to make sure old tokens were invalidated?

    const solve3 = await service.check(solve2.token, '1234');

    expect(solve3).not.toBeNull();
    expect(solve3.error).toBe('NO_ATTEMPTS_REMAINING');
    expect(solve3.data.attemptsRemaining).toBe(0);
  });

  test('old tokens dont work', async () => {
    expect.assertions(3);

    const issue = await service.issue('+123', {});
    expect(issue.data.attemptsRemaining).toBe(2);

    const solve1 = await service.check(issue.token, 'badbad');
    expect(solve1!.error).toBe('BAD_SOLUTION');

    // expect.assertions(3) not yet supported in bun
    // so logs are messed up
    expect(service.check(issue.token, '1234')).rejects.toEqual(
      new OtpError('BAD_REQUEST', 'BAD_TOKEN')
    );
  });

  test('malicious modification is ineffective 1', async () => {
    expect.assertions(1);

    const issue = await service.issue('user@email.com', {});
    const decoded = openTokenSerializer.parse(issue.token);
    decoded.account = 'haxxed@email.com';

    const encoded = openTokenSerializer.stringify(decoded);
    expect(service.check(encoded, '1234')).rejects.toEqual(
      new OtpError('BAD_REQUEST', 'BAD_TOKEN')
    );
  });
  test('malicious modification is ineffective 2', async () => {
    expect.assertions(1);

    const issue = await service.issue('user@email.com', {});
    const decoded = openTokenSerializer.parse(issue.token);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    decoded.attemptsRemaining = 'surprice' as any;

    const encoded = openTokenSerializer.stringify(decoded);

    expect(service.check(encoded, '1234')).rejects.toEqual(
      new OtpError('BAD_REQUEST', 'BAD_TOKEN')
    );
  });
});
