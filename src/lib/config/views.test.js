import { describe, expect, it } from 'vitest';
import { baseViews, introMethodology, scrollStates } from './views.js';

describe('household story views', () => {
  it('discloses the Microcosm record count and resource measure', () => {
    const intro = baseViews.find((view) => view.id === 'intro');

    expect(intro.groupText).toContain('57,240 modeled records');
    expect(intro.groupText).toContain('124.6 million US households');
    expect(intro.groupText).toContain('$546.1 billion');
    expect(intro.groupText).toContain('$4,384 per household');
    expect(introMethodology).toContain('Household resources equal cash net income plus Medicaid');
    expect(introMethodology).toContain('reduced-form participation scenarios');
  });

  it('partitions nonnegative market income at the displayed boundaries', () => {
    const byId = Object.fromEntries(baseViews.map((view) => [view.id, view]));

    expect(byId['lower-income'].view.filter({ 'Market Income': 49_999 })).toBe(true);
    expect(byId['lower-income'].view.filter({ 'Market Income': 50_000 })).toBe(false);
    expect(byId['middle-income'].view.filter({ 'Market Income': 50_000 })).toBe(true);
    expect(byId['middle-income'].view.filter({ 'Market Income': 200_000 })).toBe(false);
    expect(byId['upper-income'].view.filter({ 'Market Income': 200_000 })).toBe(true);
    expect(byId['upper-income'].view.filter({ 'Market Income': 1_000_000 })).toBe(false);
    expect(byId['highest-income'].view.filter({ 'Market Income': 1_000_000 })).toBe(true);
  });

  it('generates one group state per story view', () => {
    expect(scrollStates).toHaveLength(baseViews.length);
    expect(scrollStates.every((state) => state.viewType === 'group')).toBe(true);
  });
});
