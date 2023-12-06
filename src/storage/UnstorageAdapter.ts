import { OtpStorage } from '../types';
import type { Driver } from 'unstorage';

export class UnstorageAdapter implements OtpStorage {
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
