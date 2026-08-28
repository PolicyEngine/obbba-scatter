<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { base } from '$app/paths';
  import { COLORS } from '../config/colors.js';
  import { districtDatasets } from '../config/datasets.js';
  import { getHouseholdWeight } from '../data/householdWeight.js';

  export let dataset = 'obbba-vs-current-law'; // Which pre-aggregated file to load
  export let selectedDistrict = null; // null = nationwide
  export let metric = 'relChange'; // 'relChange', 'absChange', 'pctWinners', 'pctLosers'

  const dispatch = createEventDispatcher();

  let mapContainer;
  let map = null;
  let districtAggregates = {};
  let mapLoading = true;
  let mapError = null;
  let geoJsonData = null; // Store the GeoJSON for re-coloring
  let aggregatesLoaded = false;
  let currentLoadedDataset = null; // Track which dataset is loaded

  // State FIPS to name mapping
  const STATE_FIPS_NAMES = {
    1: 'Alabama',
    2: 'Alaska',
    4: 'Arizona',
    5: 'Arkansas',
    6: 'California',
    8: 'Colorado',
    9: 'Connecticut',
    10: 'Delaware',
    11: 'District of Columbia',
    12: 'Florida',
    13: 'Georgia',
    15: 'Hawaii',
    16: 'Idaho',
    17: 'Illinois',
    18: 'Indiana',
    19: 'Iowa',
    20: 'Kansas',
    21: 'Kentucky',
    22: 'Louisiana',
    23: 'Maine',
    24: 'Maryland',
    25: 'Massachusetts',
    26: 'Michigan',
    27: 'Minnesota',
    28: 'Mississippi',
    29: 'Missouri',
    30: 'Montana',
    31: 'Nebraska',
    32: 'Nevada',
    33: 'New Hampshire',
    34: 'New Jersey',
    35: 'New Mexico',
    36: 'New York',
    37: 'North Carolina',
    38: 'North Dakota',
    39: 'Ohio',
    40: 'Oklahoma',
    41: 'Oregon',
    42: 'Pennsylvania',
    44: 'Rhode Island',
    45: 'South Carolina',
    46: 'South Dakota',
    47: 'Tennessee',
    48: 'Texas',
    49: 'Utah',
    50: 'Vermont',
    51: 'Virginia',
    53: 'Washington',
    54: 'West Virginia',
    55: 'Wisconsin',
    56: 'Wyoming'
  };

  // Color scales for the map
  // For avgChange: diverging scale (grey for negative, green for positive, white at 0)
  const POSITIVE_COLORS = ['#E6FFFA', '#B2F5EA', '#81E6D9', '#4FD1C5', '#38B2AC', '#319795'];
  const NEGATIVE_COLORS = ['#F5F5F5', '#E0E0E0', '#BDBDBD', '#9E9E9E', '#757575', '#616161'];
  const NEUTRAL_COLOR = '#FFFFFF';

  // For pctWinners: white to green (0% to 100%)
  const WINNERS_COLORS = ['#FFFFFF', '#B2F5EA', '#81E6D9', '#4FD1C5', '#38B2AC', '#319795'];
  // For pctLosers: white to grey (0% to 100%)
  const LOSERS_COLORS = ['#FFFFFF', '#E0E0E0', '#BDBDBD', '#9E9E9E', '#757575', '#616161'];

  // Compute district-level aggregates from household data
  function computeDistrictAggregates(households) {
    const aggregates = {};

    households.forEach((d) => {
      const district = d['Congressional District'];
      if (!district) return;

      if (!aggregates[district]) {
        aggregates[district] = {
          totalWeight: 0,
          positiveWeight: 0,
          negativeWeight: 0,
          weightedChangeSum: 0,
          count: 0
        };
      }

      const weight = getHouseholdWeight(d);
      const change = d['Percentage change in net income'] || 0;

      aggregates[district].totalWeight += weight;
      aggregates[district].weightedChangeSum += change * weight;
      aggregates[district].count += 1;

      if (change > 0.1) {
        aggregates[district].positiveWeight += weight;
      } else if (change < -0.1) {
        aggregates[district].negativeWeight += weight;
      }
    });

    // Compute final metrics
    Object.keys(aggregates).forEach((district) => {
      const agg = aggregates[district];
      agg.avgChange = agg.totalWeight > 0 ? agg.weightedChangeSum / agg.totalWeight : 0;
      agg.pctWinners = agg.totalWeight > 0 ? (agg.positiveWeight / agg.totalWeight) * 100 : 0;
      agg.pctLosers = agg.totalWeight > 0 ? (agg.negativeWeight / agg.totalWeight) * 100 : 0;
      agg.households = Math.round(agg.totalWeight);
    });

    return aggregates;
  }

  // Load pre-aggregated district data (tiny ~14KB file instead of computing from 1M+ rows)
  async function loadAggregates() {
    const config = districtDatasets[dataset];
    if (!config || !config.aggregateFilename) {
      console.error('No aggregate file for dataset:', dataset);
      return;
    }

    const url = `${base}/${config.aggregateFilename}`;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to load: ${response.statusText}`);

      const text = await response.text();
      const lines = text.trim().split('\n');

      // CSV format: district,relChange,absChange,pctWinners,pctLosers,totalHouseholds,householdCount
      districtAggregates = {};
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const district = parseInt(values[0], 10);
        districtAggregates[district] = {
          relChange: parseFloat(values[1]),
          absChange: parseFloat(values[2]),
          pctWinners: parseFloat(values[3]),
          pctLosers: parseFloat(values[4]),
          households: parseInt(values[5], 10)
        };
      }

      console.log('Loaded aggregates for', Object.keys(districtAggregates).length, 'districts');
      currentLoadedDataset = dataset;
      aggregatesLoaded = true;
      updateMapColors();
    } catch (error) {
      console.error('Error loading aggregates:', error);
    }
  }

  // Get color for a district based on its metric value
  function getDistrictColor(districtId, aggregates, metricKey) {
    const agg = aggregates[districtId];
    if (!agg) return NEUTRAL_COLOR;

    if (metricKey === 'relChange') {
      // Diverging scale: grey for negative, green for positive, white at 0
      const value = agg.relChange;
      const maxPos = 5; // +5% max
      const maxNeg = -5; // -5% min

      if (Math.abs(value) < 0.1) return NEUTRAL_COLOR;

      if (value > 0) {
        const ratio = Math.min(value / maxPos, 1);
        const idx = Math.floor(ratio * (POSITIVE_COLORS.length - 1));
        return POSITIVE_COLORS[idx];
      } else {
        const ratio = Math.min(Math.abs(value) / Math.abs(maxNeg), 1);
        const idx = Math.floor(ratio * (NEGATIVE_COLORS.length - 1));
        return NEGATIVE_COLORS[idx];
      }
    } else if (metricKey === 'absChange') {
      // Diverging scale: grey for negative, green for positive, white at 0
      const value = agg.absChange;
      const maxPos = 10000; // +$10,000 max
      const maxNeg = -10000; // -$10,000 min

      if (Math.abs(value) < 100) return NEUTRAL_COLOR; // Within $100 of zero

      if (value > 0) {
        const ratio = Math.min(value / maxPos, 1);
        const idx = Math.floor(ratio * (POSITIVE_COLORS.length - 1));
        return POSITIVE_COLORS[idx];
      } else {
        const ratio = Math.min(Math.abs(value) / Math.abs(maxNeg), 1);
        const idx = Math.floor(ratio * (NEGATIVE_COLORS.length - 1));
        return NEGATIVE_COLORS[idx];
      }
    } else if (metricKey === 'pctWinners') {
      // Sequential scale: grey (0%) to green (100%)
      const value = agg.pctWinners;
      const ratio = Math.min(value / 100, 1);
      const idx = Math.floor(ratio * (WINNERS_COLORS.length - 1));
      return WINNERS_COLORS[idx];
    } else if (metricKey === 'pctLosers') {
      // Sequential scale: white (0%) to grey (100%)
      const value = agg.pctLosers;
      const ratio = Math.min(value / 100, 1);
      const idx = Math.floor(ratio * (LOSERS_COLORS.length - 1));
      return LOSERS_COLORS[idx];
    }

    return NEUTRAL_COLOR;
  }

  // Transform Alaska coordinates - position in bottom left
  function transformAlaska(coords, scale, targetLng, targetLat) {
    const centerLng = -154,
      centerLat = 64;
    if (typeof coords[0] === 'number') {
      return [
        targetLng + (coords[0] - centerLng) * scale,
        targetLat + (coords[1] - centerLat) * scale
      ];
    }
    return coords.map((c) => transformAlaska(c, scale, targetLng, targetLat));
  }

  // Transform Hawaii coordinates - position in bottom left, next to Alaska
  function transformHawaii(coords, targetLng, targetLat) {
    const centerLng = -155.5,
      centerLat = 20;
    if (typeof coords[0] === 'number') {
      return [targetLng + coords[0] - centerLng, targetLat + coords[1] - centerLat];
    }
    return coords.map((c) => transformHawaii(c, targetLng, targetLat));
  }

  // Format district name
  function formatDistrictName(geoid) {
    const stateFips = Math.floor(geoid / 100);
    const districtNum = geoid % 100;
    const stateName = STATE_FIPS_NAMES[stateFips] || 'Unknown';
    return districtNum === 0 ? `${stateName} (At-Large)` : `${stateName} District ${districtNum}`;
  }

  // Format metric value for display
  function formatMetricValue(value, metricKey) {
    if (metricKey === 'relChange') {
      const sign = value > 0 ? '+' : '';
      return `${sign}${value.toFixed(1)}%`;
    } else if (metricKey === 'absChange') {
      const sign = value > 0 ? '+' : '';
      const absVal = Math.abs(Math.round(value));
      const formatted = absVal.toLocaleString();
      return `${sign}$${formatted}`;
    }
    return `${value.toFixed(0)}%`;
  }

  // Initialize the map
  async function initMap() {
    if (!mapContainer || typeof window === 'undefined') {
      console.log('Map init skipped: no container or SSR');
      return;
    }

    console.log('Initializing map, container:', mapContainer);

    try {
      // Dynamically import MapLibre
      const maplibregl = await import('maplibre-gl');
      console.log('MapLibre loaded:', maplibregl);

      map = new maplibregl.default.Map({
        container: mapContainer,
        style: {
          version: 8,
          sources: {},
          layers: [
            {
              id: 'background',
              type: 'background',
              paint: { 'background-color': '#FFFFFF' }
            }
          ]
        },
        center: [-98, 38],
        zoom: 2.8,
        minZoom: 2,
        maxZoom: 10,
        attributionControl: false,
        // Fit to container better
        fitBoundsOptions: { padding: 20 }
      });

      map.on('load', async () => {
        console.log('Map loaded, loading district data...');

        // Fit to continental US bounds (adjusted for transformed AK/HI)
        map.fitBounds(
          [
            [-128, 24],
            [-66, 50]
          ], // [[west, south], [east, north]]
          { padding: 10, duration: 0 }
        );

        // Load pre-aggregated data first (fast 14KB file)
        await loadAggregates();

        await loadDistrictData();
        setupMapEventHandlers();
        mapLoading = false;
      });

      map.on('error', (e) => {
        console.error('Map error:', e);
        mapError = e.message || 'Map error';
        mapLoading = false;
      });
    } catch (error) {
      console.error('Error initializing map:', error);
      mapError = error.message;
      mapLoading = false;
    }
  }

  // Load and process district GeoJSON
  async function loadDistrictData() {
    try {
      const response = await fetch(`${base}/real_congressional_districts.geojson`);
      const geoData = await response.json();

      // Transform Alaska and Hawaii
      const transformedFeatures = geoData.features.map((f) => {
        const stateCode =
          f.properties.STATEFP || (f.properties.GEOID ? f.properties.GEOID.substring(0, 2) : null);

        if (stateCode === '02') {
          // Alaska
          return {
            ...f,
            geometry: {
              ...f.geometry,
              coordinates: transformAlaska(f.geometry.coordinates, 0.35, -125, 27)
            }
          };
        } else if (stateCode === '15') {
          // Hawaii
          return {
            ...f,
            geometry: {
              ...f.geometry,
              coordinates: transformHawaii(f.geometry.coordinates, -108, 27)
            }
          };
        }
        return f;
      });

      // Store the base GeoJSON for re-coloring when metric changes
      geoJsonData = {
        type: 'FeatureCollection',
        features: transformedFeatures
      };

      // Enrich with colors based on current data
      const enrichedGeoData = enrichGeoData(geoJsonData);

      // Add source and layers
      map.addSource('districts', {
        type: 'geojson',
        data: enrichedGeoData
      });

      map.addLayer({
        id: 'districts-fill',
        type: 'fill',
        source: 'districts',
        paint: {
          'fill-color': ['get', 'fillColor'],
          'fill-opacity': 0.8
        }
      });

      map.addLayer({
        id: 'districts-line',
        type: 'line',
        source: 'districts',
        paint: {
          'line-color': '#94A3B8',
          'line-width': 0.5
        }
      });

      map.addLayer({
        id: 'districts-selected',
        type: 'line',
        source: 'districts',
        paint: {
          'line-color': COLORS.BLACK,
          'line-width': ['case', ['==', ['get', 'geoid'], selectedDistrict || -1], 3, 0]
        }
      });
    } catch (error) {
      console.error('Error loading district data:', error);
    }
  }

  // Enrich GeoJSON with computed colors
  function enrichGeoData(geoData) {
    return {
      type: 'FeatureCollection',
      features: geoData.features.map((feature, index) => {
        const geoid = parseInt(feature.properties.GEOID, 10);
        const color = getDistrictColor(geoid, districtAggregates, metric);

        return {
          ...feature,
          id: index,
          properties: {
            ...feature.properties,
            geoid: geoid,
            fillColor: color
          }
        };
      })
    };
  }

  // Set up map event handlers
  function setupMapEventHandlers() {
    // Show pointer cursor on hover
    map.on('mouseenter', 'districts-fill', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'districts-fill', () => {
      map.getCanvas().style.cursor = '';
    });

    // Click to select/toggle
    map.on('click', 'districts-fill', (e) => {
      if (e.features.length > 0) {
        const geoid = e.features[0].properties.geoid;
        // Toggle: if clicking same district, deselect it
        const newDistrict = geoid === selectedDistrict ? null : geoid;
        dispatch('selectDistrict', { district: newDistrict });
      }
    });
  }

  // Get metric label
  function getMetricLabel(metricKey) {
    switch (metricKey) {
      case 'relChange':
        return 'Rel. Change';
      case 'absChange':
        return 'Abs. Change';
      case 'pctWinners':
        return 'Winners';
      case 'pctLosers':
        return 'Losers';
      default:
        return 'Value';
    }
  }

  // Update map colors when data or metric changes
  function updateMapColors() {
    if (!map || !map.getSource('districts') || !geoJsonData) {
      return;
    }

    const source = map.getSource('districts');
    const enriched = enrichGeoData(geoJsonData);
    source.setData(enriched);

    // Update selected district outline
    if (map.getLayer('districts-selected')) {
      map.setPaintProperty('districts-selected', 'line-width', [
        'case',
        ['==', ['get', 'geoid'], selectedDistrict || -1],
        3,
        0
      ]);
    }
  }

  // Reactive updates - reload aggregates when dataset changes
  $: if (dataset && currentLoadedDataset && dataset !== currentLoadedDataset) {
    // Re-load aggregates if dataset switches
    loadAggregates();
  }

  $: if (selectedDistrict !== undefined) {
    updateMapColors();
  }

  // Re-run when metric changes to any value
  $: (metric, updateMapColors());

  onMount(() => {
    initMap();
  });

  onDestroy(() => {
    if (map) {
      map.remove();
      map = null;
    }
  });
</script>

<svelte:head>
  <link href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" rel="stylesheet" />
</svelte:head>

<div class="district-map-container">
  <div class="map-header">
    <span class="map-title">Congressional Districts</span>
    <select class="metric-select" bind:value={metric}>
      <option value="relChange">Relative Change (%)</option>
      <option value="absChange">Absolute Change ($)</option>
      <option value="pctWinners">% Winners</option>
      <option value="pctLosers">% Losers</option>
    </select>
  </div>

  <div class="map-section">
    <div class="map-wrapper" bind:this={mapContainer}>
      {#if mapLoading}
        <div class="map-loading">
          <div class="spinner"></div>
          <span>Loading map...</span>
        </div>
      {:else if !aggregatesLoaded}
        <div class="map-loading">
          <div class="spinner"></div>
          <span>Loading district data...</span>
        </div>
      {/if}
      {#if mapError}
        <div class="map-error">
          <span>Error: {mapError}</span>
        </div>
      {/if}
    </div>

    <div class="map-legend">
      <div class="legend-title">{getMetricLabel(metric)}</div>
      <div class="legend-scale">
        <div
          class="legend-gradient"
          class:winners={metric === 'pctWinners'}
          class:losers={metric === 'pctLosers'}
        ></div>
        <div class="legend-labels">
          {#if metric === 'relChange'}
            <span>+5%</span>
            <span>0%</span>
            <span>-5%</span>
          {:else if metric === 'absChange'}
            <span>+$10K</span>
            <span>$0</span>
            <span>-$10K</span>
          {:else}
            <span>100%</span>
            <span>50%</span>
            <span>0%</span>
          {/if}
        </div>
      </div>
    </div>
  </div>

  <!-- District info panel below map -->
  <div class="district-info-panel">
    {#if selectedDistrict}
      {@const agg = districtAggregates[selectedDistrict]}
      <div class="selected-district-info">
        <div class="district-title">{formatDistrictName(selectedDistrict)}</div>
        {#if agg}
          <div class="district-stats">
            <div class="mini-stat">
              <span
                class="mini-value"
                class:positive={agg.relChange > 0}
                class:negative={agg.relChange < 0}
                >{formatMetricValue(agg.relChange, 'relChange')}</span
              >
              <span class="mini-label">rel. change</span>
            </div>
            <div class="mini-stat">
              <span
                class="mini-value"
                class:positive={agg.absChange > 0}
                class:negative={agg.absChange < 0}
                >{formatMetricValue(agg.absChange, 'absChange')}</span
              >
              <span class="mini-label">abs. change</span>
            </div>
            <div class="mini-stat">
              <span class="mini-value positive">{agg.pctWinners.toFixed(0)}%</span>
              <span class="mini-label">gain</span>
            </div>
            <div class="mini-stat">
              <span class="mini-value negative">{agg.pctLosers.toFixed(0)}%</span>
              <span class="mini-label">lose</span>
            </div>
          </div>
        {/if}
      </div>
    {:else}
      <div class="help-text">Click a district on the map to see details</div>
    {/if}
  </div>
</div>

<style>
  .district-map-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    position: relative;
    background: var(--app-background, #fff);
    border-radius: 8px;
    overflow: hidden;
  }

  .map-section {
    position: relative;
    flex-shrink: 0;
  }

  .district-info-panel {
    flex: 1;
    padding: 16px;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
  }

  .help-text {
    text-align: center;
    color: #94a3b8;
    font-size: 13px;
    font-family: 'Inter', sans-serif;
  }

  .selected-district-info {
    text-align: center;
  }

  .district-title {
    font-family: 'Inter', sans-serif;
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 12px;
  }

  .district-stats {
    display: flex;
    justify-content: center;
    gap: 24px;
  }

  .mini-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .mini-value {
    font-family: 'Inter', sans-serif;
    font-size: 18px;
    font-weight: 600;
    color: #334155;
  }

  .mini-value.positive {
    color: #319795;
  }

  .mini-value.negative {
    color: #6b7280;
  }

  .mini-label {
    font-family: 'Inter', sans-serif;
    font-size: 11px;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .map-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid #e2e8f0;
    background: #f8fafc;
  }

  .map-title {
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: #334155;
  }

  .metric-select {
    padding: 6px 28px 6px 10px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    background: #fff
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748B' d='M6 8L2 4h8z'/%3E%3C/svg%3E")
      no-repeat right 8px center;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    color: #334155;
    cursor: pointer;
    appearance: none;
  }

  .metric-select:focus {
    outline: none;
    border-color: #319795;
  }

  .map-wrapper {
    width: 100%;
    aspect-ratio: 1.6 / 1; /* US map is wider than tall */
    position: relative;
  }

  .map-loading,
  .map-error {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background: #f8fafc;
    color: #64748b;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    z-index: 5;
  }

  .map-error {
    color: #dc2626;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #e2e8f0;
    border-top-color: #319795;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .map-legend {
    position: absolute;
    bottom: 8px;
    right: 8px;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 4px;
    padding: 6px 8px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
    z-index: 10;
  }

  .legend-title {
    font-family: 'Inter', sans-serif;
    font-size: 9px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin-bottom: 4px;
  }

  .legend-scale {
    display: flex;
    gap: 4px;
  }

  .legend-gradient {
    width: 8px;
    height: 40px;
    border-radius: 2px;
    /* Default: diverging scale for avgChange (green positive, white zero, grey negative) */
    background: linear-gradient(to bottom, #319795, #81e6d9, #ffffff, #bdbdbd, #616161);
  }

  .legend-gradient.winners {
    /* White to green for % Winners (0% to 100%) */
    background: linear-gradient(to bottom, #319795, #4fd1c5, #81e6d9, #b2f5ea, #ffffff);
  }

  .legend-gradient.losers {
    /* White to grey for % Losers (0% to 100%) */
    background: linear-gradient(to bottom, #616161, #9e9e9e, #bdbdbd, #e0e0e0, #ffffff);
  }

  .legend-labels {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    font-family: 'Inter', sans-serif;
    font-size: 9px;
    color: #64748b;
  }

  :global(.maplibregl-popup-content) {
    padding: 8px 12px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
</style>
