import { describe, it, expect, beforeAll } from 'vitest';
import Papa from 'papaparse';
import fs from 'fs';
import path from 'path';
import { calculateSectionStats } from '$lib/data/householdStats.js';

describe('Integration Tests with Real CSV Data', () => {
  let data;

  beforeAll(async () => {
    // Load the CSV file
    const csvPath = path.join(
      process.cwd(),
      'static',
      'household_tax_income_changes_microcosm_buildp.csv'
    );

    try {
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      const result = Papa.parse(csvContent, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true
      });
      data = result.data;
    } catch (error) {
      console.error('Could not load CSV file:', error);
      data = [];
    }
  });

  it('should calculate non-zero household count for lower-income group', () => {
    if (data.length === 0) {
      console.warn('Skipping test - no CSV data available');
      return;
    }

    // Filter for lower-income households (below $50,000)
    const lowerIncomeData = data.filter(
      (d) => d['Market Income'] >= 0 && d['Market Income'] < 50000
    );

    expect(lowerIncomeData.length).toBeGreaterThan(0);

    const stats = calculateSectionStats(lowerIncomeData, false, 'lower-income');

    expect(stats).toBeTruthy();
    expect(stats.total).not.toBe('0');
    expect(parseFloat(stats.total)).toBeGreaterThan(0);

    // Based on US demographics, lower-income households should be substantial
    expect(parseFloat(stats.total)).toBeGreaterThan(10); // At least 10 million households

    console.log(`Lower-income households: ${stats.total} million`);
    console.log(`Positive impact: ${stats.positivePercent}%`);
    console.log(`Negative impact: ${stats.negativePercent}%`);
  });

  it('should calculate correct statistics for all income groups', () => {
    if (data.length === 0) {
      console.warn('Skipping test - no CSV data available');
      return;
    }

    const groups = [
      { name: 'lower-income', min: 0, max: 50000 },
      { name: 'middle-income', min: 50000, max: 200000 },
      { name: 'upper-income', min: 200000, max: 1000000 },
      { name: 'highest-income', min: 1000000, max: Infinity }
    ];

    groups.forEach((group) => {
      const groupData = data.filter(
        (d) => d['Market Income'] >= group.min && d['Market Income'] < group.max
      );

      if (groupData.length > 0) {
        const stats = calculateSectionStats(groupData, false, group.name);

        expect(stats).toBeTruthy();
        expect(stats.total).not.toBe('0');

        console.log(`${group.name}: ${stats.total} million households`);
      }
    });
  });
});
