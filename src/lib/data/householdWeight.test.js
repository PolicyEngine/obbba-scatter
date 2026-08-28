import { describe, expect, it } from 'vitest';
import {
  getHouseholdWeight,
  normalizeHouseholdWeight,
  selectWeightedHouseholds
} from './householdWeight.js';

describe('household weights', () => {
  it('reads the canonical CSV field and preserves zero weights', () => {
    expect(getHouseholdWeight({ 'Household Weight': '125.5' })).toBe(125.5);
    expect(getHouseholdWeight({ 'Household Weight': 0 })).toBe(0);
  });

  it('normalizes the legacy alias to one numeric canonical field', () => {
    const normalized = normalizeHouseholdWeight({
      id: 'legacy',
      'Household weight': '42'
    });

    expect(normalized['Household Weight']).toBe(42);
    expect(normalized).not.toHaveProperty('Household weight');
  });

  it('gives a high-weight row priority in a capped render sample', () => {
    const light = { id: 'light', 'Household Weight': 1 };
    const heavy = { id: 'heavy', 'Household Weight': 99 };

    const sample = selectWeightedHouseholds([light, heavy], 1, {
      unitInterval: () => 0.5
    });

    expect(sample).toEqual([heavy]);
  });

  it('retains pinned households in a capped render sample', () => {
    const households = [
      { id: 'selected', 'Household Weight': 1 },
      { id: 'heavy', 'Household Weight': 100 }
    ];

    expect(selectWeightedHouseholds(households, 1, { pinnedIds: ['selected'] })).toEqual([
      households[0]
    ]);
  });
});
