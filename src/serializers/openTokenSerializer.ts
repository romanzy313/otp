import { decodeBase64Url, encodeBase64Url } from '../utils';
import { OtpError } from '../OtpError';
import { OtpData, TokenSerializer } from '../types';

const utf8Decoder = new TextDecoder();
const utf8Encoder = new TextEncoder();

export const openTokenSerializer: TokenSerializer = {
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

    return encodeBase64Url(utf8Encoder.encode(JSON.stringify(values)));
  },
  parse<Data = unknown>(token: string): OtpData<Data> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parts: any[] = [];
    try {
      parts = JSON.parse(utf8Decoder.decode(decodeBase64Url(token)));
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
    const customData = parts.length == 6 ? parts[5] : undefined;

    if (isNaN(attemptsRemaining) || isNaN(resendAt) || isNaN(expiresAt))
      throw new OtpError('BAD_REQUEST', 'BAD_TOKEN');

    // make sure undefined is return if data was not defined

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
