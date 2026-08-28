import { describe, it, expect } from 'vitest';

describe('HouseholdProfile provisions', () => {
  // Helper function to simulate getProvisionBreakdown logic
  const getProvisionBreakdown = (household) => {
    const provisions = [
      {
        name: 'ACA participation',
        key: 'Change in net income after ACA Takeup Reform',
        description: 'A seeded, reduced-form participation scenario.'
      },
      {
        name: 'SNAP participation',
        key: 'Change in net income after SNAP Takeup Reform',
        description: 'A seeded, reduced-form participation scenario.'
      },
      {
        name: 'Medicaid participation',
        key: 'Change in net income after Medicaid Takeup Reform',
        description: 'A seeded, reduced-form participation scenario.'
      }
    ];

    return provisions
      .map((provision) => ({
        ...provision,
        value: household[provision.key] || 0
      }))
      .filter((p) => Math.abs(p.value) > 0.01);
  };

  it('labels the ACA result as a participation scenario', () => {
    const mockHousehold = {
      'Change in net income after ACA Takeup Reform': -6991.0,
      'Change in benefits after ACA Takeup Reform': -6991.0
    };

    const provisions = getProvisionBreakdown(mockHousehold);
    const acaProvision = provisions.find((p) => p.key.includes('ACA Takeup Reform'));

    expect(acaProvision).toBeDefined();
    expect(acaProvision.name).toBe('ACA participation');
    expect(acaProvision.description).toContain('reduced-form');
    expect(acaProvision.description).not.toContain('eligibility');
    expect(acaProvision.value).toBe(-6991.0);
  });

  it('labels the SNAP result as a participation scenario', () => {
    const mockHousehold = {
      'Change in net income after SNAP Takeup Reform': -500.0,
      'Change in benefits after SNAP Takeup Reform': -500.0
    };

    const provisions = getProvisionBreakdown(mockHousehold);
    const snapProvision = provisions.find((p) => p.key.includes('SNAP Takeup Reform'));

    expect(snapProvision).toBeDefined();
    expect(snapProvision.name).toBe('SNAP participation');
    expect(snapProvision.description).toContain('reduced-form');
  });

  it('labels the Medicaid result as a participation scenario', () => {
    const mockHousehold = {
      'Change in net income after Medicaid Takeup Reform': -1000.0,
      'Change in benefits after Medicaid Takeup Reform': -1000.0
    };

    const provisions = getProvisionBreakdown(mockHousehold);
    const medicaidProvision = provisions.find((p) => p.key.includes('Medicaid Takeup Reform'));

    expect(medicaidProvision).toBeDefined();
    expect(medicaidProvision.name).toBe('Medicaid participation');
    expect(medicaidProvision.description).toContain('reduced-form');
  });
});
