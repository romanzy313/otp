import { describe, expect, test } from 'vitest';

import { browserDecodeToken } from '../helpers';
import { openTokenSerializer } from './openTokenSerializer';
import { openTokenEncryptedDataSerializer } from './openTokenEncryptedDataSerializer';
import { encryptedTokenSerializer } from './encryptedTokenSerializer';

describe('open token', () => {
  test('without data', async () => {
    const serializer = openTokenSerializer;

    const data = {
      id: 'abcd',
      account: '123',
      attemptsRemaining: 3,
      resendAt: 100,
      expiresAt: 1000,
      customData: undefined,
    };
    const token = serializer.stringify(data);
    const serverDecoded = serializer.parse(token);
    const browserDecoded = browserDecodeToken(token);

    expect(serverDecoded).toStrictEqual(data);
    expect(browserDecoded).toStrictEqual(data);
  });
  test('with data', async () => {
    const serializer = openTokenSerializer;

    const data = {
      id: 'abcd',
      account: '123',
      attemptsRemaining: 3,
      resendAt: 100,
      expiresAt: 1000,
      customData: {
        type: 'login',
      },
    };
    const token = serializer.stringify(data);
    const serverDecoded = serializer.parse(token);
    const browserDecoded = browserDecodeToken(token);

    expect(serverDecoded).toStrictEqual(data);
    expect(browserDecoded).toStrictEqual(data);
  });
});

describe('open token encrypted data', () => {
  test('without data', async () => {
    const serializer = openTokenEncryptedDataSerializer(
      '0'.repeat(16),
      'aes-128-gcm'
    );

    const data = {
      id: 'abcd',
      account: '123',
      attemptsRemaining: 3,
      resendAt: 100,
      expiresAt: 1000,
      customData: undefined,
    };
    const token = serializer.stringify(data);
    const serverDecoded = serializer.parse(token);

    expect(serverDecoded).toStrictEqual(data);
  });
  test('open token with data', async () => {
    const serializer = openTokenEncryptedDataSerializer(
      '0'.repeat(16),
      'aes-128-gcm'
    );
    const data = {
      id: 'abcd',
      account: '123',
      attemptsRemaining: 3,
      resendAt: 100,
      expiresAt: 1000,
      customData: {
        type: 'login',
      },
    };
    const token = serializer.stringify(data);
    const serverDecoded = serializer.parse(token);

    expect(serverDecoded).toStrictEqual(data);
  });
});

describe('encrypted serializer', () => {
  test('without data', async () => {
    const serializer = encryptedTokenSerializer('0'.repeat(16), 'aes-128-gcm');

    const data = {
      id: 'abcd',
      account: '123',
      attemptsRemaining: 3,
      resendAt: 100,
      expiresAt: 1000,
      customData: undefined,
    };
    const token = serializer.stringify(data);
    const serverDecoded = serializer.parse(token);

    expect(serverDecoded).toStrictEqual(data);
  });
  test('open token with data', async () => {
    const serializer = openTokenEncryptedDataSerializer(
      '0'.repeat(16),
      'aes-128-gcm'
    );
    const data = {
      id: 'abcd',
      account: '123',
      attemptsRemaining: 3,
      resendAt: 100,
      expiresAt: 1000,
      customData: {
        type: 'login',
      },
    };
    const token = serializer.stringify(data);
    const serverDecoded = serializer.parse(token);

    expect(serverDecoded).toStrictEqual(data);
  });
});
