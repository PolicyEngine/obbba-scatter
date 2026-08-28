#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const staticDir = path.join(scriptDir, '..', 'static');
const csvPath = path.join(staticDir, 'household_tax_income_changes_microcosm_buildp.csv');
const manifestPath = path.join(
  staticDir,
  'household_tax_income_changes_microcosm_buildp.manifest.json'
);

const EXPECTED = {
  households: 57_240,
  weightedHouseholds: 124_557_998.60092863,
  totalResourceChangeBillion: 546.0912384267873,
  averageResourceChange: 4_384.232602969232,
  percentGaining: 82.75913812844902,
  percentLosing: 3.645371858875459,
  buildId: 'populace-us-2024-buildp-sparse-rmloss100-cae8640-20260728T011454Z',
  sha256: '48b9d479fb4fd1c3537f9383ce4697d130b6f618658409d74f6233c43b994c7e'
};

const STEP_SUFFIXES = [
  'Tax Rate Reform',
  'Standard Deduction Reform',
  'Exemption Reform',
  'CTC SSN Requirement',
  'CTC Expansion',
  'CDCC Reform',
  'QBI Deduction Reform',
  'AMT Reform',
  'Miscellaneous Reform',
  'Casualty loss deduction repeal',
  'Other Itemized Deductions Reform',
  'Limitation on Itemized Deductions Reform',
  'Estate Tax Reform',
  'SALT Cap Reform',
  'Tip Income Exemption',
  'Overtime Exemption',
  'Senior Deduction',
  'Auto Loan Interest',
  'SNAP Takeup Reform',
  'ACA Takeup Reform',
  'Medicaid Takeup Reform'
];

const PROVISION_ORDER = [
  'Tax rates',
  'Standard deduction',
  'Personal exemption (continued suspension)',
  'CTC SSN requirement',
  'CTC expansion',
  'CDCC expansion',
  'QBI deduction',
  'AMT',
  'Miscellaneous deductions',
  'Casualty loss repeal',
  'Other itemized deductions',
  'Itemized deduction limitation',
  'Estate tax',
  'SALT cap',
  'Tip exemption',
  'Overtime exemption',
  'Senior deduction',
  'Auto loan interest deduction',
  'SNAP participation',
  'ACA participation',
  'Medicaid participation'
];

function assertClose(actual, expected, tolerance, label) {
  if (!Number.isFinite(actual) || Math.abs(actual - expected) > tolerance) {
    throw new Error(`${label}: expected ${expected} ± ${tolerance}; found ${actual}`);
  }
}

function number(row, column) {
  const value = Number(row[column]);
  if (!Number.isFinite(value)) {
    throw new Error(`Household ${row['Household ID']} has invalid ${column}: ${row[column]}`);
  }
  return value;
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const parsed = Papa.parse(fs.readFileSync(csvPath, 'utf8'), {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true
  });

  if (parsed.errors.length) {
    throw new Error(`CSV parse errors: ${JSON.stringify(parsed.errors.slice(0, 3))}`);
  }

  const rows = parsed.data;
  if (rows.length !== EXPECTED.households) {
    throw new Error(`Expected ${EXPECTED.households} rows; found ${rows.length}`);
  }
  if (manifest.households !== EXPECTED.households) {
    throw new Error(`Manifest household count is ${manifest.households}`);
  }
  if (manifest.build_id !== EXPECTED.buildId) {
    throw new Error(`Unexpected build ID: ${manifest.build_id}`);
  }
  if (manifest.dataset_sha256 !== EXPECTED.sha256) {
    throw new Error(`Unexpected dataset hash: ${manifest.dataset_sha256}`);
  }
  if (manifest.policyengine_version !== '5.0.1') {
    throw new Error(`Unexpected policyengine.py version: ${manifest.policyengine_version}`);
  }
  if (manifest.policyengine_us_version !== '1.764.6') {
    throw new Error(`Unexpected PolicyEngine US version: ${manifest.policyengine_us_version}`);
  }
  if (manifest.baseline !== 'TCJA expiration') {
    throw new Error(`Unexpected baseline: ${manifest.baseline}`);
  }
  if (JSON.stringify(manifest.provision_order) !== JSON.stringify(PROVISION_ORDER)) {
    throw new Error('Manifest provision order does not match the paper sequence');
  }

  const ids = new Set();
  let weightedHouseholds = 0;
  let weightedResourceChange = 0;
  let gainWeight = 0;
  let lossWeight = 0;
  let maxResourceClosure = 0;
  let maxComponentClosure = 0;
  let zeroBaselineCount = 0;

  for (const row of rows) {
    const id = String(row['Household ID']);
    if (ids.has(id)) throw new Error(`Duplicate household ID: ${id}`);
    ids.add(id);

    const weight = number(row, 'Household Weight');
    const total = number(row, 'Total change in net income');
    if (weight < 0) throw new Error(`Household ${id} has a negative weight`);

    weightedHouseholds += weight;
    weightedResourceChange += weight * total;
    if (total > 1) gainWeight += weight;
    if (total < -1) lossWeight += weight;

    let provisionResourceSum = 0;
    let provisionFederalSum = 0;
    let provisionStateSum = 0;
    let provisionBenefitSum = 0;

    for (const suffix of STEP_SUFFIXES) {
      const resource = number(row, `Change in net income after ${suffix}`);
      const federal = number(row, `Change in federal tax liability after ${suffix}`);
      const state = number(row, `Change in state tax liability after ${suffix}`);
      const benefits = number(row, `Change in benefits after ${suffix}`);

      provisionResourceSum += resource;
      provisionFederalSum += federal;
      provisionStateSum += state;
      provisionBenefitSum += benefits;
      maxComponentClosure = Math.max(
        maxComponentClosure,
        Math.abs(resource - (-federal - state + benefits))
      );
    }

    maxResourceClosure = Math.max(
      maxResourceClosure,
      Math.abs(provisionResourceSum - total),
      Math.abs(provisionFederalSum - number(row, 'Total change in federal tax liability')),
      Math.abs(provisionStateSum - number(row, 'Total change in state tax liability')),
      Math.abs(provisionBenefitSum - number(row, 'Total change in benefits'))
    );

    const baseline = number(row, 'Baseline Net Income');
    const percentage = row['Percentage change in net income'];
    if (baseline === 0) {
      zeroBaselineCount += 1;
      if (percentage !== null && percentage !== '') {
        throw new Error(`Household ${id} has a percentage change with a zero baseline`);
      }
    } else if (!Number.isFinite(Number(percentage))) {
      throw new Error(`Household ${id} is missing a percentage change`);
    }
  }

  const totalResourceChangeBillion = weightedResourceChange / 1e9;
  const averageResourceChange = weightedResourceChange / weightedHouseholds;
  const percentGaining = (100 * gainWeight) / weightedHouseholds;
  const percentLosing = (100 * lossWeight) / weightedHouseholds;

  // CSV values are rounded to eight significant digits; tolerances cover only
  // serialization drift, not a changed model result.
  assertClose(weightedHouseholds, EXPECTED.weightedHouseholds, 500, 'Weighted households');
  assertClose(
    totalResourceChangeBillion,
    EXPECTED.totalResourceChangeBillion,
    0.001,
    'Total resource change ($B)'
  );
  assertClose(
    averageResourceChange,
    EXPECTED.averageResourceChange,
    0.02,
    'Average resource change'
  );
  assertClose(percentGaining, EXPECTED.percentGaining, 0.001, 'Percent gaining');
  assertClose(percentLosing, EXPECTED.percentLosing, 0.001, 'Percent losing');
  if (maxResourceClosure > 0.1) {
    throw new Error(`Serialized provision totals fail closure by up to $${maxResourceClosure}`);
  }
  // The paper's stored component frames are float32; one record carries a
  // $1.20 component-rounding residual even before CSV serialization.
  if (maxComponentClosure > 1.25) {
    throw new Error(`Serialized resource components fail closure by up to $${maxComponentClosure}`);
  }
  if (zeroBaselineCount !== 6) {
    throw new Error(`Expected 6 zero-resource baselines; found ${zeroBaselineCount}`);
  }

  console.log(
    JSON.stringify(
      {
        households: rows.length,
        weightedHouseholds,
        totalResourceChangeBillion,
        averageResourceChange,
        percentGaining,
        percentLosing,
        maxResourceClosure,
        maxComponentClosure,
        zeroBaselineCount
      },
      null,
      2
    )
  );
}

main();
