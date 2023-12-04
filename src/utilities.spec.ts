import { browserDecodeToken, numericalSolutionGenerator } from './helpers';
import { describe, expect, test } from 'vitest';

import openTokenSerializer from './serializers/openTokenSerializer';

describe('helpers', () => {
  test('numerical code generator', () => {
    const code4 = numericalSolutionGenerator(4)();
    expect(code4.length).toBe(4);
    const code8 = numericalSolutionGenerator(8)();
    expect(code8.length).toBe(8);
  });

  test('open token serialization', async () => {
    const data = {
      id: 'abcd',
      account: '123',
      attemptsRemaining: 3,
      resendAt: 100,
      expiresAt: 1000,
      customData: undefined,
    };
    const token = openTokenSerializer.stringify(data);
    const serverDecoded = openTokenSerializer.parse(token);
    const browserDecoded = browserDecodeToken(token);

    expect(serverDecoded).toStrictEqual(data);
    expect(browserDecoded).toStrictEqual(data);
  });
});
