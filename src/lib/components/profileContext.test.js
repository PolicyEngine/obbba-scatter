import { describe, expect, it } from 'vitest';
import { getBaselineLabel, getResultMethodology } from './profileContext.js';

describe('HouseholdProfile context', () => {
  it('labels both national and district baselines correctly', () => {
    expect(getBaselineLabel('tcja-expiration')).toBe('TCJA expiration');
    expect(getBaselineLabel('obbba-vs-current-policy')).toBe('TCJA expiration');
    expect(getBaselineLabel('tcja-extension')).toBe('TCJA extension');
    expect(getBaselineLabel('obbba-vs-current-law')).toBe('TCJA extension');
  });

  it('keeps Microcosm provenance off district profiles', () => {
    const districtCopy = getResultMethodology('district');

    expect(districtCopy).toContain('district-target-calibrated');
    expect(districtCopy).toContain('separate from the national Microcosm Build P results');
    expect(districtCopy).not.toContain('Modeled Microcosm Build P record');
  });
});
