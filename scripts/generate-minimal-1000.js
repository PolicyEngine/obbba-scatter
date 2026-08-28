#!/usr/bin/env node

import fs from 'fs';
import Papa from 'papaparse';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  HOUSEHOLD_WEIGHT_FIELD,
  getHouseholdWeight,
  selectWeightedHouseholds
} from '../src/lib/data/householdWeight.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate a population-aware 1,000-row sample for the instant first paint.
async function createMinimal1000() {
  const staticDir = path.join(__dirname, '..', 'static');

  const inputFile = 'household_tax_income_changes_microcosm_buildp.csv';
  const outputFile = 'household_visualization_minimal_1000.csv';

  const inputPath = path.join(staticDir, inputFile);
  const outputPath = path.join(staticDir, outputFile);

  console.log('Generating a weighted 1,000-record Microcosm sample...\n');

  // Read the sample CSV
  const csvContent = fs.readFileSync(inputPath, 'utf8');

  // Parse the CSV
  const parseResult = Papa.parse(csvContent, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true
  });

  console.log(`Source has ${parseResult.data.length} rows`);

  const sourceRows = parseResult.data.map((row) => ({
    ...row,
    id: String(row['Household ID'])
  }));
  const sample = selectWeightedHouseholds(sourceRows, 1000);
  const totalWeight = sourceRows.reduce((sum, row) => sum + getHouseholdWeight(row), 0);
  const sampleWeight = totalWeight / sample.length;

  // Keep every profile and provision column so household disclosures work
  // during the instant first paint, before the full artifact finishes loading.
  const minimalData = sample.map((row) => {
    const { id: _id, ...fields } = row;
    return {
      ...fields,
      [HOUSEHOLD_WEIGHT_FIELD]: sampleWeight
    };
  });

  // Convert back to CSV - no quotes needed for numbers
  const csv = Papa.unparse(minimalData, {
    header: true,
    quotes: false,
    newline: '\n'
  });

  // Write minimal file
  fs.writeFileSync(outputPath, csv);
  const fileSize = fs.statSync(outputPath).size;
  console.log(`Created minimal CSV: ${(fileSize / 1024).toFixed(1)} KB`);
  console.log(`Columns: ${Object.keys(minimalData[0]).length} profile and provision fields`);
  console.log(`Rows: ${minimalData.length}`);

  console.log('\n✅ Done! File saved to:', outputFile);
}

// Run the script
createMinimal1000().catch(console.error);
