import { OtpError } from '../OtpError';
import { OtpData, TokenSerializer } from '../types';
import {
  EncryptionMethods,
  EncryptionScheme,
  makeCustomEncryptor,
} from '../utils/encrypt';

export class EncryptedTokenSerializer implements TokenSerializer {
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
    if (data.customData) values.push(data.customData);
    const parts = this.encryptor.encrypt(JSON.stringify(values));
    return parts.join('.');
  }
  parse<Data = unknown>(token: string): OtpData<Data> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any

    const majorParts: string[] = token.split('.');

    if (majorParts.length != 3) {
      throw new OtpError('BAD_REQUEST', 'BAD_TOKEN');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parts: any[] = [];
    try {
      parts = JSON.parse(
        this.encryptor.decrypt(majorParts[0], majorParts[1], majorParts[2])
      );
    } catch {
      throw new OtpError('BAD_REQUEST', 'BAD_TOKEN');
    }

    if (!Array.isArray(parts) || parts.length < 5) {
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

    const customData = parts.length == 6 ? parts[5] : undefined;

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
