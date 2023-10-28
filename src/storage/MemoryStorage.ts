import { OtpStorage } from '../types';

// default or not default exports as a convention?
// what would work better?

/**
 * Simple implementation of storage
 */
export class MemoryStorage implements OtpStorage {
  public map = new Map();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async set(key: string, value: string, ttl: number): Promise<void> {
    this.map.set(key, value);
  }
  async get(key: string): Promise<string | null> {
    return this.map.get(key) || null;
  }
  async invalidate(key: string): Promise<void> {
    this.map.delete(key);
  }
}