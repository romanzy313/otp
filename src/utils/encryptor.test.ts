import { describe, it, expect } from 'vitest';
import { makeCustomEncryptor, makeSubtleEncryptor } from './encryptor';
import crypto from 'crypto';
describe('encryption', () => {
  it('works', () => {
    const e = makeCustomEncryptor('0'.repeat(32), 'aes-256-gcm');

    const [iv, tag, data] = e.encrypt('hello world');

    // console.log('IV', iv, 'TAG', tag, 'DATA', data);
    // console.log('total custom length', [iv, tag, data].join('.').length);

    const decoded = e.decrypt(iv, tag, data);

    expect(decoded).toEqual('hello world');
  });

  // optional test... not used cause its async...
  it('subtle works', async () => {
    const e = await makeSubtleEncryptor('0'.repeat(32));

    const [iv, data] = await e.encrypt('hello world');

    // console.log('total subtle length', [iv, data].join('.').length);
    // console.log('IV', iv, 'DATA', data);

    const decrypted = await e.decrypt(iv, data);

    expect(decrypted).toBe('hello world');
  });
});
