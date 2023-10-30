import { OtpStorage } from 'types';
import type { Driver } from 'unstorage';

export default class UnstorageAdapter implements OtpStorage {
  constructor(private driver: Driver) {
    if (!driver.setItem)
      throw new Error(
        `UnstorageAdapter: driver ${driver.name} does not support setItem`
      );

    if (!driver.removeItem)
      throw new Error(
        `UnstorageAdapter: driver ${driver.name} does not support removeItem`
      );
  }

  async set(key: string, value: string, ttl: number): Promise<void> {
    await this.driver.setItem!(key, value, {
      ttl, // all implementations of Unstorge drivers use seconds
    });
  }
  async get(key: string): Promise<string | null> {
    const val = await this.driver.getItem(key);

    return val === null ? null : val.toString();
  }
  async invalidate(key: string): Promise<void> {
    await this.driver.removeItem!(key, {});
  }
}

// old impl below:

// import type { Storage } from 'unstorage';
// export class UnstorageConnector implements OtpStorage {
//   constructor(private Storage: Storage) {
//     // if (!driver.setItem)
//     //     throw new Error(`Driver ${driver.name} does not su`);
//   }
//   set(key: string, value: string, ttl: number): Promise<void> {
//     return this.Storage.setItem(key, value, {
//       ttl,
//     });
//   }
//   get(key: string): Promise<string | null> {
//     return this.Storage.getItem(key).then((val) =>
//       val === null ? null : val.toString()
//     );
//   }
//   invalidate(key: string): Promise<void> {
//     return this.Storage.removeItem(key);
//   }
// }
