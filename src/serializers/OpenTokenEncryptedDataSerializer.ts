import { decodeBase64Url, encodeBase64Url } from '../utils';
import { OtpError } from '../OtpError';
import { OtpData, TokenSerializer } from '../types';
import {
  EncryptionMethods,
  EncryptionScheme,
  makeCustomEncryptor,
} from '../utils/encryptor';

const utf8Decoder = new TextDecoder();
const utf8Encoder = new TextEncoder();

export class OpenTokenEncryptedDataSerializer implements TokenSerializer {
  private encryptor: ReturnType<typeof makeCustomEncryptor>;

  constructor(
    secret: string,
    scheme: EncryptionMethods | EncryptionScheme = 'aes-256-gcm'
  ) {
    this.encryptor = makeCustomEncryptor(secret, scheme);
  }

  stringify<Data = unknown>(data: OtpData<Data>): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const values: any[] = [
      data.id,
      data.account,
      data.attemptsRemaining,
      data.expiresAt,
      data.resendAt,
    ];

    const parts = [encodeBase64Url(utf8Encoder.encode(JSON.stringify(values)))];
    const hasCustomData =
      data.customData !== null && data.customData !== undefined;

    if (hasCustomData) {
      const [iv, tag, encryptedData] = this.encryptor.encrypt(
        JSON.stringify(data.customData)
      );
      parts.push(iv);
      parts.push(tag);
      parts.push(encryptedData);
    }

    return parts.join('.');
  }
  parse<Data = unknown>(token: string): OtpData<Data> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any

    const majorParts: string[] = token.split('.');

    if (majorParts.length != 1 && majorParts.length != 4) {
      throw new OtpError('BAD_REQUEST', 'BAD_TOKEN');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parts: any[] = [];
    try {
      parts = JSON.parse(utf8Decoder.decode(decodeBase64Url(majorParts[0])));
    } catch {
      throw new OtpError('BAD_REQUEST', 'BAD_TOKEN');
    }

    if (!Array.isArray(parts) || parts.length != 5) {
      // console.log("not array", parts);
      throw new OtpError('BAD_REQUEST', 'BAD_TOKEN');
    }

    const id = parts[0];
    const account = parts[1];
    const attemptsRemaining = parseInt(parts[2]);
    const expiresAt = parseInt(parts[3]);
    const resendAt = parseInt(parts[4]);

    if (isNaN(attemptsRemaining) || isNaN(resendAt) || isNaN(expiresAt))
      throw new OtpError('BAD_REQUEST', 'BAD_TOKEN');

    // attempt to decode the data

    const customData =
      majorParts.length == 4
        ? JSON.parse(
            this.encryptor.decrypt(majorParts[1], majorParts[2], majorParts[3])
          )
        : undefined;

    return {
      id,
      account,
      attemptsRemaining,
      expiresAt,
      resendAt,
      customData,
    };
  }
}
