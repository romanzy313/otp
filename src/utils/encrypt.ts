/* eslint-disable @typescript-eslint/no-explicit-any */
// source: https://lollyrock.com/posts/nodejs-encryption/

import crypto, { CipherCCMTypes, CipherGCMTypes, CipherOCBTypes } from 'crypto';
import { decodeBase64Url, encodeBase64Url } from './encode';

export type EncryptionMethods = 'aes-128-gcm' | 'aes-192-gcm' | 'aes-256-gcm';

export type EncryptionScheme = {
  algorithm: string;
  ivLength: number;
  authTagLength: number;
  keySize: number;
};

const encryptionSchemes: Readonly<Record<EncryptionMethods, EncryptionScheme>> =
  {
    'aes-128-gcm': {
      algorithm: 'aes-128-gcm',
      authTagLength: 16,
      ivLength: 16,
      keySize: 16,
    },
    'aes-192-gcm': {
      algorithm: 'aes-192-gcm',
      authTagLength: 16,
      ivLength: 16,
      keySize: 24,
    },
    'aes-256-gcm': {
      algorithm: 'aes-256-gcm',
      authTagLength: 16,
      ivLength: 16,
      keySize: 32,
    },
  };

export const makeCustomEncryptor = (
  secret: string,
  scheme: EncryptionMethods | EncryptionScheme
) => {
  if (typeof scheme == 'string') scheme = encryptionSchemes[scheme];

  const { algorithm, authTagLength, ivLength, keySize } =
    scheme as EncryptionScheme;

  if (secret.length != keySize) {
    throw new Error(
      `Bad secret size. Must be ${keySize} but ${secret.length} was provided.`
    );
  }

  return {
    encrypt(value: string): [string, string, string] {
      const iv = crypto.randomBytes(ivLength); // output must be 16 length
      const cipher = crypto.createCipheriv(
        algorithm as EncryptionMethods, // pretend this for authTagLength
        secret,
        iv,
        {
          authTagLength,
        }
      );

      let encrypted = cipher.update(value, 'utf8', 'base64url');
      encrypted += cipher.final('base64url');
      const tag = cipher.getAuthTag();

      return [iv.toString('base64url'), tag.toString('base64url'), encrypted];
    },
    decrypt(iv: string, authTag: string, encryptedText: string): string {
      // Function to decrypt data
      const decipher = crypto.createDecipheriv(
        algorithm as EncryptionMethods,
        secret,
        decodeBase64Url(iv),
        {
          authTagLength,
        }
      );
      const decodedTag = decodeBase64Url(authTag);
      decipher.setAuthTag(decodedTag);
      let decrypted = decipher.update(encryptedText, 'base64url', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    },
  };
};

// this could also be used, but its async... maybe its better
// yet secrets are short
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
