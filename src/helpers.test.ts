import { browserDecodeToken, numericalSolutionGenerator } from './helpers';
import { describe, expect, test } from 'vitest';

describe('helpers', () => {
  test('numerical code generator', () => {
    const code4 = numericalSolutionGenerator(4)();
    expect(code4.length).toBe(4);
    const code8 = numericalSolutionGenerator(8)();
    expect(code8.length).toBe(8);
  });
});
