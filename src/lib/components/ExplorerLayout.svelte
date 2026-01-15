<script>
  import { createEventDispatcher } from 'svelte';
  import DistrictMap from './DistrictMap.svelte';
  import { COLORS } from '../config/colors.js';

  export let data = [];
  export let selectedDistrict = null;

  const dispatch = createEventDispatcher();

  // State FIPS to state code mapping
  const STATE_FIPS_TO_CODE = {
    1: "AL", 2: "AK", 4: "AZ", 5: "AR", 6: "CA", 8: "CO", 9: "CT", 10: "DE",
    11: "DC", 12: "FL", 13: "GA", 15: "HI", 16: "ID", 17: "IL", 18: "IN",
    19: "IA", 20: "KS", 21: "KY", 22: "LA", 23: "ME", 24: "MD", 25: "MA",
    26: "MI", 27: "MN", 28: "MS", 29: "MO", 30: "MT", 31: "NE", 32: "NV",
    33: "NH", 34: "NJ", 35: "NM", 36: "NY", 37: "NC", 38: "ND", 39: "OH",
    40: "OK", 41: "OR", 42: "PA", 44: "RI", 45: "SC", 46: "SD", 47: "TN",
    48: "TX", 49: "UT", 50: "VT", 51: "VA", 53: "WA", 54: "WV", 55: "WI",
    56: "WY"
  };

  const STATE_FIPS_NAMES = {
    1: "Alabama", 2: "Alaska", 4: "Arizona", 5: "Arkansas", 6: "California",
    8: "Colorado", 9: "Connecticut", 10: "Delaware", 11: "District of Columbia",
    12: "Florida", 13: "Georgia", 15: "Hawaii", 16: "Idaho", 17: "Illinois",
    18: "Indiana", 19: "Iowa", 20: "Kansas", 21: "Kentucky", 22: "Louisiana",
    23: "Maine", 24: "Maryland", 25: "Massachusetts", 26: "Michigan",
    27: "Minnesota", 28: "Mississippi", 29: "Missouri", 30: "Montana",
    31: "Nebraska", 32: "Nevada", 33: "New Hampshire", 34: "New Jersey",
    35: "New Mexico", 36: "New York", 37: "North Carolina", 38: "North Dakota",
    39: "Ohio", 40: "Oklahoma", 41: "Oregon", 42: "Pennsylvania",
    44: "Rhode Island", 45: "South Carolina", 46: "South Dakota",
    47: "Tennessee", 48: "Texas", 49: "Utah", 50: "Vermont", 51: "Virginia",
    53: "Washington", 54: "West Virginia", 55: "Wisconsin", 56: "Wyoming"
  };

  // Filter data based on selected district
  $: filteredData = selectedDistrict
    ? data.filter(d => d['Congressional District'] === selectedDistrict)
    : data;

  // Compute stats for the current selection
  $: selectionStats = computeStats(filteredData);

  function computeStats(households) {
    if (!households || households.length === 0) {
      return { total: 0, avgChange: 0, pctWinners: 0, pctLosers: 0 };
    }

    let totalWeight = 0;
    let positiveWeight = 0;
    let negativeWeight = 0;
    let weightedChangeSum = 0;

    households.forEach(d => {
      const weight = d['Household Weight'] || 1;
      const change = d['Percentage change in net income'] || 0;

      totalWeight += weight;
      weightedChangeSum += change * weight;

      if (change > 0.1) {
        positiveWeight += weight;
      } else if (change < -0.1) {
        negativeWeight += weight;
      }
    });

    return {
      total: totalWeight,
      avgChange: totalWeight > 0 ? weightedChangeSum / totalWeight : 0,
      pctWinners: totalWeight > 0 ? (positiveWeight / totalWeight) * 100 : 0,
      pctLosers: totalWeight > 0 ? (negativeWeight / totalWeight) * 100 : 0
    };
  }

  // Format district name
  function formatDistrictName(geoid) {
    if (!geoid) return 'Nationwide';
    const stateFips = Math.floor(geoid / 100);
    const districtNum = geoid % 100;
    const stateCode = STATE_FIPS_TO_CODE[stateFips] || '??';
    return districtNum === 0
      ? `${stateCode}-AL`
      : `${stateCode}-${String(districtNum).padStart(2, '0')}`;
  }

  function formatDistrictFullName(geoid) {
    if (!geoid) return 'All Congressional Districts';
    const stateFips = Math.floor(geoid / 100);
    const districtNum = geoid % 100;
    const stateName = STATE_FIPS_NAMES[stateFips] || 'Unknown';
    return districtNum === 0
      ? `${stateName} (At-Large)`
      : `${stateName} Congressional District ${districtNum}`;
  }

  // Format number with commas
  function formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(0) + 'K';
    }
    return num.toFixed(0);
  }

  // Handle district selection from map
  function handleDistrictSelect(event) {
    selectedDistrict = event.detail.district;
    dispatch('districtChange', { district: selectedDistrict, filteredData });
  }


</script>

<div class="explorer-layout">
  <!-- Map Panel -->
  <div class="map-panel">
    <DistrictMap
      {data}
      {selectedDistrict}
      on:selectDistrict={handleDistrictSelect}
    />
  </div>

  <!-- Scatter Panel -->
  <div class="scatter-panel">
    <!-- Scatter Header with controls -->
    <div class="scatter-header">
      <div class="selection-info">
        {#if selectedDistrict}
          <span class="district-badge">{formatDistrictName(selectedDistrict)}</span>
          <span class="district-name">{formatDistrictFullName(selectedDistrict)}</span>
        {:else}
          <span class="district-badge nationwide">US</span>
          <span class="district-name">Nationwide</span>
        {/if}
      </div>

    </div>

    <!-- Stats Bar -->
    <div class="stats-bar">
      <div class="stat">
        <span class="stat-value">{formatNumber(selectionStats.total)}</span>
        <span class="stat-label">households</span>
      </div>
      <div class="stat">
        <span class="stat-value" class:positive={selectionStats.avgChange > 0} class:negative={selectionStats.avgChange < 0}>
          {selectionStats.avgChange > 0 ? '+' : ''}{selectionStats.avgChange.toFixed(1)}%
        </span>
        <span class="stat-label">avg change</span>
      </div>
      <div class="stat">
        <span class="stat-value positive">{selectionStats.pctWinners.toFixed(0)}%</span>
        <span class="stat-label">gain</span>
      </div>
      <div class="stat">
        <span class="stat-value negative">{selectionStats.pctLosers.toFixed(0)}%</span>
        <span class="stat-label">lose</span>
      </div>
    </div>

    <!-- Scatter Plot Container (slot for the actual scatter) -->
    <div class="scatter-content">
      <slot name="scatter" {filteredData}></slot>
    </div>
  </div>
</div>

<style>
  .explorer-layout {
    display: grid;
    grid-template-columns: 420px 1fr;
    height: 100%;
    gap: 0;
    background: var(--app-background, #fff);
  }


  .map-panel {
    position: relative;
    border-right: 1px solid #e2e8f0;
    overflow: hidden;
    min-height: 0; /* Important for flex/grid children */
  }

  .scatter-panel {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .scatter-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    flex-shrink: 0;
  }

  .selection-info {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .district-badge {
    padding: 4px 10px;
    background: #319795;
    color: #fff;
    font-family: 'Inter', sans-serif;
    font-size: 12px;
    font-weight: 600;
    border-radius: 4px;
    letter-spacing: 0.5px;
  }

  .district-badge.nationwide {
    background: #64748b;
  }

  .district-name {
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 500;
    color: #334155;
  }


  .stats-bar {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 10px 20px;
    background: #fff;
    border-bottom: 1px solid #e2e8f0;
    flex-shrink: 0;
  }

  .stat {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }

  .stat-value {
    font-family: 'Inter', sans-serif;
    font-size: 18px;
    font-weight: 600;
    color: #1e293b;
  }

  .stat-value.positive {
    color: #319795;
  }

  .stat-value.negative {
    color: #64748b;
  }

  .stat-label {
    font-family: 'Inter', sans-serif;
    font-size: 12px;
    color: #94a3b8;
  }

  .scatter-content {
    flex: 1;
    overflow: hidden;
    position: relative;
  }

  /* Responsive */
  @media (max-width: 1024px) {
    .explorer-layout {
      grid-template-columns: 320px 1fr;
    }
  }

  @media (max-width: 768px) {
    .explorer-layout {
      grid-template-columns: 1fr;
    }

    .map-panel {
      display: none;
    }

    .stats-bar {
      flex-wrap: wrap;
      gap: 12px;
    }

    .stat {
      flex: 1 1 45%;
    }
  }
</style>
