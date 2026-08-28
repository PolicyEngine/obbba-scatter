import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadFullDataBackground } from './instantLoader.js';

describe('loadFullDataBackground', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('preserves the canonical Household Weight CSV column', async () => {
    const csv = [
      'Household ID,Market Income,Total change in net income,Percentage change in net income,Household Weight',
      '123,50000,1000,2,1234.5'
    ].join('\n');
    const onUpdate = vi.fn();

    vi.stubGlobal('Worker', undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(csv)
      })
    );

    await loadFullDataBackground('tcja-expiration', onUpdate);

    const household = onUpdate.mock.calls[0][0]['tcja-expiration'][0];
    expect(household['Household Weight']).toBe(1234.5);
    expect(household).not.toHaveProperty('Household weight');
  });
});
