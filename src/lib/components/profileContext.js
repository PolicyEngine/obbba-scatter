const TCJA_EXTENSION_DATASETS = new Set(['tcja-extension', 'obbba-vs-current-law']);

export function getBaselineLabel(selectedDataset) {
  return TCJA_EXTENSION_DATASETS.has(selectedDataset) ? 'TCJA extension' : 'TCJA expiration';
}
