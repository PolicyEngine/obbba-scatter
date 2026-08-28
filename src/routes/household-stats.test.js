import { describe, it, expect } from 'vitest';
import { calculateSectionStats } from '$lib/data/householdStats.js';

describe('Household Statistics Calculation', () => {
  it('should calculate correct statistics for lower-income households', () => {
    // Mock data representing lower-income households
    const mockData = [
      {
        'Market Income': 30000,
        'Household Weight': 15000000,
        'Total change in net income': 1000,
        'Percentage change in net income': 5
      },
      {
        'Market Income': 40000,
        'Household Weight': 20000000,
        'Total change in net income': -1000,
        'Percentage change in net income': -2
      },
      {
        'Market Income': 25000,
        'Household Weight': 8000000,
        'Total change in net income': 0,
        'Percentage change in net income': 0
      }
    ];

    const stats = calculateSectionStats(mockData, false, 'lower-income');

    // Total should be 43 million (15+20+8)
    expect(stats).toBeTruthy();
    expect(stats.total).toBe('43');
    expect(stats.totalRaw).toBe(43000000);

    // 15M positive out of 43M = ~35%
    expect(stats.positivePercent).toBe(35);

    // 20M negative out of 43M = ~47%
    expect(stats.negativePercent).toBe(47);

    // 35M affected (15M + 20M) out of 43M = ~81%
    expect(stats.affectedPercent).toBe(81);
  });

  it('uses survey weights rather than row counts for impact shares', () => {
    const stats = calculateSectionStats([
      {
        'Household Weight': 900,
        'Total change in net income': 5,
        'Percentage change in net income': 5
      },
      {
        'Household Weight': 100,
        'Total change in net income': -5,
        'Percentage change in net income': -5
      }
    ]);

    expect(stats.positivePercent).toBe(90);
    expect(stats.negativePercent).toBe(10);
    expect(stats.affectedPercent).toBe(100);
  });

  it("uses the paper's $1 winner and loser threshold", () => {
    const stats = calculateSectionStats([
      {
        'Household Weight': 60,
        'Total change in net income': 0.5,
        'Percentage change in net income': 10
      },
      {
        'Household Weight': 40,
        'Total change in net income': 2,
        'Percentage change in net income': 0.1
      }
    ]);

    expect(stats.positivePercent).toBe(40);
    expect(stats.negativePercent).toBe(0);
    expect(stats.affectedPercent).toBe(40);
  });

  it('should handle empty data gracefully', () => {
    const stats = calculateSectionStats([]);
    expect(stats).toBeNull();
  });

  it('should handle data with zero weights', () => {
    const mockData = [
      {
        'Market Income': 30000,
        'Household Weight': 0,
        'Total change in net income': 100,
        'Percentage change in net income': 5
      },
      {
        'Market Income': 40000,
        'Household Weight': 0,
        'Total change in net income': -100,
        'Percentage change in net income': -2
      }
    ];

    const stats = calculateSectionStats(mockData);
    expect(stats.total).toBe('0');
    expect(stats.positivePercent).toBe(0);
    expect(stats.negativePercent).toBe(0);
  });

  it('should format high-income totals with decimal', () => {
    const mockData = [
      {
        'Market Income': 500000,
        'Household Weight': 1500000,
        'Total change in net income': -10000,
        'Percentage change in net income': -10
      }
    ];

    const stats = calculateSectionStats(mockData, false, 'highest-income');
    expect(stats.total).toBe('1.5');
  });
});
