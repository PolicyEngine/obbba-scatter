const TCJA_EXTENSION_DATASETS = new Set(['tcja-extension', 'obbba-vs-current-law']);

export function getBaselineLabel(selectedDataset) {
  return TCJA_EXTENSION_DATASETS.has(selectedDataset) ? 'TCJA extension' : 'TCJA expiration';
}

export function getResultMethodology(dataSource) {
  if (dataSource === 'district') {
    return (
      'Modeled record from the predecessor district-target-calibrated dataset. ' +
      'The district route is separate from the national Microcosm Build P results. ' +
      'Provision effects are displayed against the selected baseline.'
    );
  }

  return (
    'Modeled Microcosm Build P record. Household resources include cash net income plus ' +
    'Medicaid, CHIP, and enrollee-assigned ACA premium tax credits valued at program cost. ' +
    'Provision effects are forward-order marginal contributions against the TCJA-expiration ' +
    'counterfactual.'
  );
}
