// Dataset configuration for main story view
export const datasets = {
  'tcja-expiration': {
    filename: 'household_tax_income_changes_senate_current_law_baseline.csv',
    label: 'TCJA expiration',
    description: 'Analysis showing impact if TCJA provisions expire'
  },
  'tcja-extension': {
    filename: 'household_tax_income_changes_senate_tcja_baseline.csv',
    label: 'TCJA extension',
    description: 'Analysis showing impact if TCJA provisions are extended'
  }
};

// Dataset configuration for district explorer (OBBBA comparisons)
export const districtDatasets = {
  'obbba-vs-current-policy': {
    filename: 'district_obbba_impacts.csv',
    label: 'TCJA Expiration',
    description: 'OBBBA impact compared to TCJA expiration baseline'
  },
  'obbba-vs-current-law': {
    filename: 'district_obbba_impacts_current_law.csv',
    label: 'TCJA Extension',
    description: 'OBBBA impact compared to TCJA extension baseline'
  }
};

export const defaultDataset = 'tcja-expiration';

// Export DATASETS as an alias for compatibility
export const DATASETS = datasets;