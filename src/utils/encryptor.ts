/* eslint-disable @typescript-eslint/no-explicit-any */
// source: https://lollyrock.com/posts/nodejs-encryption/

import crypto from 'crypto';
import { decodeBase64Url, encodeBase64Url } from './encode';

// TODO different iv length for for   | 'ccm' | 'ocb'
// and research what are different parts of it mean
// export type EncryptionMethods = CipherGCMTypes | CipherCCMTypes
export type EncryptionMethods = `aes-${'128' | '192' | '256'}-${'gcm'}`;

export type EncryptionScheme = {
  algorithm: string;
  ivLength: number;
  authTagLength: number | null;
  keySize: number;
};

export function getEncryptionSchemeFromAesAlgorithmName(
  algorithm: string,
  authTagLength: number | null
): EncryptionScheme {
  const [variant, size, block] = algorithm.split('-');
  if (variant !== 'aes')
    throw new Error(`Unknown encryption cipher ${algorithm}`);

  if (size !== '128' && size !== '192' && size !== '256') {
    throw new Error(
      `Bad size encryption size ${size}. Expected 128, 192, or 256`
    );
  }

  const keySize = parseInt(size) / 8;

  if (!authTagLength && (block == 'gcm' || block == 'ccm')) {
    // force when required!
    authTagLength = 16;
  }
  return {
    algorithm,
    ivLength: 16,
    keySize,
    authTagLength,
  };
}

export const makeCustomEncryptor = (
  secret: string,
  scheme: EncryptionMethods | EncryptionScheme
) => {
  if (typeof scheme == 'string') {
    // generate it dynamically
    scheme = getEncryptionSchemeFromAesAlgorithmName(scheme, null);
  }

  const { algorithm, authTagLength, ivLength, keySize } =
    scheme as EncryptionScheme;

  /* v8 ignore next 5*/
  if (secret.length != keySize) {
    throw new Error(
      `Invalid secret length. Must be ${keySize} but ${secret.length} was provided.`
    );
  }

  return {
    encrypt(value: string): [string, string, string] {
      const iv = crypto.randomBytes(ivLength); // output must be 16 length
      const cipher = crypto.createCipheriv(
        algorithm as any, // pretend this for authTagLength
        secret,
        iv,
        authTagLength
          ? {
              authTagLength,
            }
          : undefined
      );

      let encrypted = cipher.update(value, 'utf8', 'base64url');
      encrypted += cipher.final('base64url');

      // for empty tag encode literally anything, here is a tuf-8 space
      const tag = authTagLength
        ? cipher.getAuthTag().toString('base64url')
        : '';

      return [iv.toString('base64url'), tag, encrypted];
    },
    decrypt(iv: string, authTag: string, encryptedText: string): string {
      // Function to decrypt data
      const decipher = crypto.createDecipheriv(
        algorithm as any,
        secret,
        decodeBase64Url(iv),
        authTagLength
          ? {
              authTagLength,
            }
          : undefined
      );
      // a space!
      if (authTag) {
        decipher.setAuthTag(decodeBase64Url(authTag));
      }
      let decrypted = decipher.update(encryptedText, 'base64url', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    },
  };
};

// this could also be used, but its async... maybe its better
// secrets are short, so sync implementation is okay?
export const makeSubtleEncryptor = async (secret: string) => {
  const utf8Encoder = new TextEncoder();
  const utf8Decoder = new TextDecoder();

  const pst = utf8Encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    pst,
    {
      name: 'AES-GCM',
    },
    false,
    ['encrypt', 'decrypt']
  );

  return {
    encrypt: async (data: string): Promise<[string, string]> => {
      const iv = crypto.randomBytes(16);
      const res = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          length: 32,
          iv,
        },
        cryptoKey,
        utf8Encoder.encode(data)
      );

      return [encodeBase64Url(iv), encodeBase64Url(res)];
    },
    decrypt: async (_iv: string, _string: string): Promise<string> => {
      const iv = decodeBase64Url(_iv);
      const val = decodeBase64Url(_string);

      const res = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          length: 256,
          iv,
        },
        cryptoKey,
        val
      );

      const textRes = utf8Decoder.decode(res);

      return textRes;
    },
  };
};
