import Papa from 'papaparse';
import { HOUSEHOLD_WEIGHT_FIELD, getHouseholdWeight } from './householdWeight.js';

// Load just 1000 points for instant visualization
export async function loadTinyVisualization(onUpdate) {
  const startTime = performance.now();

  try {
    // Load the population-aware sample used for the instant first paint.
    const base = import.meta.env.BASE_URL || '/';
    const normalizedBase = base.endsWith('/') ? base : base + '/';
    const url = `${normalizedBase}household_visualization_minimal_1000.csv`;

    console.log('⚡ Loading 1,000-record Microcosm visualization sample...');

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load sample: ${response.status}`);
    }

    const text = await response.text();

    // Parse CSV
    const result = Papa.parse(text, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      fastMode: true
    });

    // Process the display-only sample. Full profiles replace it in the background.
    const data = result.data.map((d, i) => ({
      id: String(d['Household ID'] ?? i),
      householdId: d['Household ID'] ?? i,
      'Market Income': d['Market Income'] || 0,
      'Total change in net income': d['Total change in net income'] || 0,
      'Change in Household Net Income': d['Total change in net income'] || 0, // Alias
      [HOUSEHOLD_WEIGHT_FIELD]: getHouseholdWeight(d),
      'Percentage change in net income': d['Percentage change in net income'] ?? 0,
      // Placeholder demographics for compatibility
      'Number of Dependents': 0,
      Dependents: 0,
      'Age of Head': 40,
      Age: 40,
      'Is Married': false,
      State: null // Will be filled when full data loads
    }));

    const totalTime = performance.now() - startTime;
    console.log(
      `✅ Sample ready in ${totalTime.toFixed(0)}ms - ${data.length} dots for instant display!`
    );

    // Return data immediately for starfield animation
    onUpdate({
      visualData: data,
      phase: 'sample',
      isComplete: false
    });
  } catch (error) {
    console.error('Error loading sample visualization:', error);
    throw error;
  }
}
