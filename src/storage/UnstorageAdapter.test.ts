import { beforeEach, describe, expect, test } from 'vitest';
import { OtpService } from '../OtpService';
import { OtpError } from '../OtpError';

import memoryDriver from 'unstorage/drivers/memory';
import { UnstorageAdapter } from './UnstorageAdapter';
import { Driver } from 'unstorage';

let driver: Driver;
let service: OtpService;

beforeEach(() => {
  driver = memoryDriver();
  service = new OtpService({
    storage: new UnstorageAdapter(driver),
    generateSolution: () => '1234',
    storagePrefix: 'otp:',
  });
});

describe('UnstorageAdapter', () => {
  test('works with memory driver', async () => {
    expect.assertions(4);

    const issue = await service.issue('+123', {});

    const badSolve = await service.check(issue.token, '00', {
      allowReuseOfSolvedToken: true,
    });

    expect(badSolve.meta.isSolved).toBe(false);

    const goodSolve = await service.check(badSolve.token, '1234', {
      allowReuseOfSolvedToken: true,
    });

    expect(goodSolve.meta.isSolved).toBe(true);

    const info = await service.getTokenInformation(badSolve.token); // old token still can be reused, ay?

    expect(info.meta.isSolved).toBe(true);

    await service.invalidateToken(info.token);

    expect(service.getTokenInformation(badSolve.token)).rejects.toEqual(
      new OtpError('BAD_REQUEST', 'BAD_TOKEN')
    );
  });
});
