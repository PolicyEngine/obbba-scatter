import { describe, expect, it } from 'vitest';
import { getBaselineLabel } from './profileContext.js';

describe('HouseholdProfile context', () => {
  it('labels both national and district baselines correctly', () => {
    expect(getBaselineLabel('tcja-expiration')).toBe('TCJA expiration');
    expect(getBaselineLabel('obbba-vs-current-policy')).toBe('TCJA expiration');
    expect(getBaselineLabel('tcja-extension')).toBe('TCJA extension');
    expect(getBaselineLabel('obbba-vs-current-law')).toBe('TCJA extension');
  });
});
