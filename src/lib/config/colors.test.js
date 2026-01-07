import { describe, it, expect } from 'vitest';
import { COLORS, APP_COLORS, getPointColor } from './colors.js';

describe('color configuration', () => {
  describe('COLORS', () => {
    it('has all required color definitions', () => {
      expect(COLORS.WHITE).toBe('#FFFFFF');
      expect(COLORS.BLACK).toBe('#000000');
      // PolicyEngine Design System colors
      expect(COLORS.PRIMARY_500).toBe('#319795');  // Main teal
      expect(COLORS.GRAY_500).toBe('#6B7280');     // Main gray
      expect(COLORS.GRAY_300).toBe('#D1D5DB');     // Light gray
      // Legacy aliases for backwards compatibility
      expect(COLORS.TEAL_MEDIUM).toBe('#319795');
    });
  });

  describe('getPointColor', () => {
    it('returns positive color for positive values', () => {
      expect(getPointColor(5)).toBe(APP_COLORS.scatterPositive);
      expect(getPointColor(0.2)).toBe(APP_COLORS.scatterPositive);
      expect(getPointColor(100)).toBe(APP_COLORS.scatterPositive);
    });

    it('returns negative color for negative values', () => {
      expect(getPointColor(-5)).toBe(APP_COLORS.scatterNegative);
      expect(getPointColor(-0.2)).toBe(APP_COLORS.scatterNegative);
      expect(getPointColor(-100)).toBe(APP_COLORS.scatterNegative);
    });

    it('returns neutral color for near-zero values', () => {
      expect(getPointColor(0)).toBe(APP_COLORS.scatterNeutral);
      expect(getPointColor(0.05)).toBe(APP_COLORS.scatterNeutral);
      expect(getPointColor(-0.05)).toBe(APP_COLORS.scatterNeutral);
    });

    it('handles edge cases', () => {
      expect(getPointColor(null)).toBe(APP_COLORS.scatterNeutral);
      expect(getPointColor(undefined)).toBe(APP_COLORS.scatterNeutral);
      expect(getPointColor(NaN)).toBe(APP_COLORS.scatterNeutral);
      expect(getPointColor('not a number')).toBe(APP_COLORS.scatterNeutral);
    });
  });
});