import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadTinyVisualization } from './tinyLoader.js';

describe('loadTinyVisualization', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('preserves profile and provision fields in the instant sample', async () => {
    const csv = [
      [
        'Household ID',
        'Market Income',
        'Total change in net income',
        'Percentage change in net income',
        'Household Weight',
        'State',
        'Age of Head',
        'Baseline Net Income',
        'Change in net income after Tax Rate Reform'
      ].join(','),
      '1138676,109282,3142,3.49,10127.69,Georgia,47,90034,1414'
    ].join('\n');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        text: async () => csv
      }))
    );
    const onUpdate = vi.fn();

    await loadTinyVisualization(onUpdate);

    const update = onUpdate.mock.calls[0][0];
    expect(update.phase).toBe('sample');
    expect(update.visualData[0]['Baseline Net Income']).toBe(90034);
    expect(update.visualData[0]['Change in net income after Tax Rate Reform']).toBe(1414);
    expect(update.visualData[0].State).toBe('Georgia');
    expect(update.visualData[0]['Household Weight']).toBe(10127.69);
  });
});
