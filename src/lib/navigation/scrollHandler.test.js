import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import {
  currentStateIndex,
  previousStateIndex,
  isTransitioning,
  currentInterpolationT,
  startTransition,
  navigateToSection,
  getRandomWeightedHousehold
} from './scrollHandler.js';

describe('scrollHandler', () => {
  beforeEach(() => {
    // Reset stores to initial state
    currentStateIndex.set(0);
    previousStateIndex.set(0);
    isTransitioning.set(false);
    currentInterpolationT.set(0);

    // Mock requestAnimationFrame and cancelAnimationFrame
    vi.useFakeTimers();
    let frameId = 0;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frameId++;
      setTimeout(() => cb(performance.now()), 16);
      return frameId;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('startTransition', () => {
    it('should update currentStateIndex when transitioning to a new state', () => {
      expect(get(currentStateIndex)).toBe(0);

      startTransition(1, null);

      expect(get(currentStateIndex)).toBe(1);
    });

    it('should set previousStateIndex to the old state', () => {
      currentStateIndex.set(0);

      startTransition(2, null);

      expect(get(previousStateIndex)).toBe(0);
      expect(get(currentStateIndex)).toBe(2);
    });

    it('should set isTransitioning to true', () => {
      expect(get(isTransitioning)).toBe(false);

      startTransition(1, null);

      expect(get(isTransitioning)).toBe(true);
    });

    it('should not transition if already at target state', () => {
      currentStateIndex.set(1);
      previousStateIndex.set(0);

      startTransition(1, null);

      // Should not change anything
      expect(get(currentStateIndex)).toBe(1);
      expect(get(isTransitioning)).toBe(false);
    });

    it('should not start new transition while one is in progress', () => {
      startTransition(1, null);
      expect(get(isTransitioning)).toBe(true);
      expect(get(currentStateIndex)).toBe(1);

      // Try to start another transition
      startTransition(2, null);

      // Should still be at state 1
      expect(get(currentStateIndex)).toBe(1);
    });

    it('should animate interpolationT from 0 to 1', async () => {
      startTransition(1, null);

      expect(get(currentInterpolationT)).toBe(0);

      // Advance timer to trigger animation frames
      vi.advanceTimersByTime(600); // Half of 1200ms transition

      // Should be partially through
      const midT = get(currentInterpolationT);
      expect(midT).toBeGreaterThan(0);
      expect(midT).toBeLessThan(1);

      // Advance to complete
      vi.advanceTimersByTime(700);

      expect(get(currentInterpolationT)).toBe(1);
      expect(get(isTransitioning)).toBe(false);
    });
  });

  describe('navigateToSection', () => {
    const mockScrollStates = [
      { id: 'intro' },
      { id: 'lower-income' },
      { id: 'middle-income' },
      { id: 'upper-income' },
      { id: 'highest-income' },
      { id: 'all-households' }
    ];

    it('should transition to the correct section by ID', () => {
      expect(get(currentStateIndex)).toBe(0);

      const result = navigateToSection('lower-income', mockScrollStates);

      expect(result).toBe(true);
      expect(get(currentStateIndex)).toBe(1);
    });

    it('should return false for invalid section ID', () => {
      const result = navigateToSection('invalid-section', mockScrollStates);

      expect(result).toBe(false);
      expect(get(currentStateIndex)).toBe(0);
    });

    it('should return false if already at target section', () => {
      currentStateIndex.set(2);

      const result = navigateToSection('middle-income', mockScrollStates);

      expect(result).toBe(false);
    });

    it('should navigate to different income sections', () => {
      navigateToSection('middle-income', mockScrollStates);
      expect(get(currentStateIndex)).toBe(2);

      // Complete the transition before starting another
      vi.advanceTimersByTime(1500);
      isTransitioning.set(false);

      navigateToSection('highest-income', mockScrollStates);
      expect(get(currentStateIndex)).toBe(4);
    });
  });

  describe('getRandomWeightedHousehold', () => {
    const light = { id: 'light', 'Household Weight': 1 };
    const heavy = { id: 'heavy', 'Household Weight': 99 };

    it('uses canonical weights to assign random thresholds', () => {
      expect(getRandomWeightedHousehold([light, heavy], () => 0.009)).toBe(light);
      expect(getRandomWeightedHousehold([light, heavy], () => 0.01)).toBe(heavy);
      expect(getRandomWeightedHousehold([light, heavy], () => 0.999)).toBe(heavy);
    });

    it('does not select zero-weight rows', () => {
      const zero = { id: 'zero', 'Household Weight': 0 };

      expect(getRandomWeightedHousehold([zero, heavy], () => 0)).toBe(heavy);
      expect(getRandomWeightedHousehold([zero], () => 0.5)).toBeNull();
    });
  });
});
