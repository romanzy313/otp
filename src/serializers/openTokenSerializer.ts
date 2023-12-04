import { OtpError } from '../OtpError';
import { OtpData, TokenSerializer } from '../types';

const openTokenSerializer: TokenSerializer = {
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

    return Buffer.from(JSON.stringify(values)).toString('base64url');
  },
  parse<Data = unknown>(token: string): OtpData<Data> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parts: any[] = [];
    try {
      parts = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
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
    const customData = parts[5];

    if (isNaN(attemptsRemaining) || isNaN(resendAt) || isNaN(expiresAt))
      throw new OtpError('BAD_REQUEST', 'BAD_TOKEN');

    return {
      id,
      account,
      attemptsRemaining,
      expiresAt,
      resendAt,
      customData,
    };
  },
};

export default openTokenSerializer;
