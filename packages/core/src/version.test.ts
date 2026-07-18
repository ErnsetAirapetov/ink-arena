import { describe, expect, it } from 'vitest';
import { CORE_VERSION, coreVersion } from './version.js';

describe('coreVersion', () => {
  it('возвращает версию ядра', () => {
    expect(coreVersion()).toBe(CORE_VERSION);
  });
});
