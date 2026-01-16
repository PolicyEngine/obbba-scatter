<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto, afterNavigate } from '$app/navigation';
  import { browser } from '$app/environment';
  import { districtDatasets } from '$lib/config/datasets.js';
  import ExplorerLayout from '$lib/components/ExplorerLayout.svelte';
  import ScatterPlot from '$lib/components/ScatterPlot.svelte';
  import HouseholdProfile from '$lib/components/HouseholdProfile.svelte';
  import { COLORS } from '$lib/config/colors.js';

  // Data state
  let data = [];
  let isLoading = false;
  let loadError = null;
  let selectedDataset = 'obbba-vs-current-policy';
  let selectedDistrict = null;
  let selectedHousehold = null;

  // Chart reference
  let chartComponent = null;

  // Simple scroll states for the explorer view (no storytelling, just one view)
  const explorerScrollStates = [
    {
      id: 'all',
      title: 'All Households',
      filter: () => true,
      xDomain: [-20, 20],
      yDomain: [0, 500000],
      viewType: 'all'
    }
  ];

  // Generate mock data for testing
  function generateMockData(count = 5000) {
    const states = ['CA', 'TX', 'FL', 'NY', 'PA', 'IL', 'OH', 'GA', 'NC', 'MI'];
    const mockData = [];

    // Congressional districts by state (simplified)
    const districtsByState = {
      'CA': 52, 'TX': 38, 'FL': 28, 'NY': 26, 'PA': 17,
      'IL': 17, 'OH': 15, 'GA': 14, 'NC': 14, 'MI': 13
    };

    const stateFips = {
      'CA': 6, 'TX': 48, 'FL': 12, 'NY': 36, 'PA': 42,
      'IL': 17, 'OH': 39, 'GA': 13, 'NC': 37, 'MI': 26
    };

    for (let i = 0; i < count; i++) {
      const state = states[Math.floor(Math.random() * states.length)];
      const numDistricts = districtsByState[state];
      const districtNum = Math.floor(Math.random() * numDistricts) + 1;
      const fips = stateFips[state];
      const congressionalDistrict = fips * 100 + districtNum;

      // Generate realistic income and tax change values
      const income = Math.exp(Math.random() * 4 + 9); // Log-normal distribution, roughly $8k - $500k
      const baseChange = (Math.random() - 0.4) * 10; // Slightly positive bias
      const incomeEffect = income > 200000 ? -2 : (income < 50000 ? 1.5 : 0);
      const percentChange = baseChange + incomeEffect + (Math.random() - 0.5) * 3;

      mockData.push({
        id: i + 1,
        'Household ID': i + 1,
        'State': state,
        'Congressional District': congressionalDistrict,
        'Market Income': Math.round(income),
        'Gross Income': Math.round(income * 1.1),
        'Household Weight': Math.round(Math.random() * 5000 + 500),
        'Percentage change in net income': Math.round(percentChange * 100) / 100,
        'Total change in net income': Math.round(percentChange * income / 100),
        'Household Size': Math.floor(Math.random() * 4) + 1,
        'Number of Dependents': Math.floor(Math.random() * 3),
        'Age of Head': Math.floor(Math.random() * 50) + 25
      });
    }

    return mockData;
  }

  // Dataset folder mapping
  const datasetFolders = {
    'obbba-vs-current-policy': 'districts/tcja-expiration',
    'obbba-vs-current-law': 'districts/tcja-extension'
  };

  // Cache for loaded district data
  let districtDataCache = {};

  // Load data for a specific district (on-demand)
  async function loadDistrictData(district) {
    if (!district) {
      data = [];
      return;
    }

    const cacheKey = `${selectedDataset}_${district}`;
    if (districtDataCache[cacheKey]) {
      data = districtDataCache[cacheKey];
      console.log(`Using cached data for district ${district}: ${data.length} households`);
      return;
    }

    isLoading = true;
    loadError = null;

    try {
      const folder = datasetFolders[selectedDataset];
      if (!folder) {
        throw new Error(`Unknown dataset: ${selectedDataset}`);
      }

      const basePath = import.meta.env.BASE_URL || '/';
      const normalizedBase = basePath.endsWith('/') ? basePath : basePath + '/';
      const url = `${normalizedBase}${folder}/district_${district}.csv`;

      console.log('Loading district data from:', url);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`District ${district} data not available`);
      }

      const text = await response.text();
      console.log('CSV loaded, size:', (text.length / 1024 / 1024).toFixed(1), 'MB');
      const parsed = parseCSV(text);

      data = parsed;
      districtDataCache[cacheKey] = data;

      console.log(`Loaded ${data.length} households for district ${district}`);

    } catch (error) {
      console.error('Error loading district data:', error);
      loadError = error.message;
      data = [];
    } finally {
      isLoading = false;
    }
  }

  // Simple CSV parser
  function parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',');
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row = {};

      headers.forEach((header, idx) => {
        const val = values[idx];
        // Try to parse as number
        const num = parseFloat(val);
        row[header.trim()] = isNaN(num) ? val : num;
      });

      // Add unique ID if not present
      if (!row.id) {
        row.id = row['Household ID'] || i;
      }

      data.push(row);
    }

    return data;
  }

  // Handle district selection - load data on-demand
  async function handleDistrictChange(event) {
    const newDistrict = event.detail.district;

    // Clear selected household when changing districts
    selectedHousehold = null;

    // Update URL
    const url = new URL(window.location.href);
    if (newDistrict) {
      url.searchParams.set('district', newDistrict);
    } else {
      url.searchParams.delete('district');
    }
    goto(url.pathname + url.search, { replaceState: true, noScroll: true });

    // Update selected district and load data
    selectedDistrict = newDistrict;
    await loadDistrictData(newDistrict);
  }

  // Handle point click
  function handlePointClick(household) {
    selectedHousehold = household;
  }

  // Close household profile
  function closeProfile() {
    selectedHousehold = null;
  }

  // Randomize to a different household
  function randomizeHousehold() {
    const currentData = selectedDistrict
      ? data.filter(d => d['Congressional District'] === selectedDistrict)
      : data;

    if (currentData.length > 0) {
      // Pick a random household (weighted by household weight)
      const totalWeight = currentData.reduce((sum, d) => sum + (d['Household Weight'] || 1), 0);
      let random = Math.random() * totalWeight;
      let cumulative = 0;

      for (const household of currentData) {
        cumulative += household['Household Weight'] || 1;
        if (random <= cumulative) {
          selectedHousehold = household;
          break;
        }
      }
    }
  }

  // Parse URL params on load
  function parseUrlParams() {
    const params = $page.url.searchParams;

    const district = params.get('district');
    if (district) {
      selectedDistrict = parseInt(district, 10);
    } else {
      selectedDistrict = null; // Reset if no district in URL
    }

    const dataset = params.get('dataset');
    if (dataset && districtDatasets[dataset]) {
      selectedDataset = dataset;
    }
  }

  // Load data on mount (only if district is in URL)
  onMount(async () => {
    parseUrlParams();
    if (selectedDistrict) {
      await loadDistrictData(selectedDistrict);
    }
  });

  // Re-render chart when data changes
  $: if (chartComponent && data.length > 0) {
    setTimeout(() => chartComponent.renderVisualization(), 50);
  }
</script>

<svelte:head>
  <title>Explore by District | Tax Reform Impact</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
</svelte:head>

<div class="explore-page">
  <!-- Header -->
  <header class="header">
    <div class="header-left">
      <a href=".." class="back-link">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Back to Story
      </a>
      <h1 class="page-title">Explore by Congressional District</h1>
    </div>
  </header>

  <!-- Baseline selector overlay (bottom right, matching nationwide style) -->
  <div class="baseline-selector-overlay">
    <span class="baseline-label">Baseline:</span>
    <div class="baseline-selector">
      {#each Object.entries(districtDatasets) as [key, config]}
        <button
          class="tab-button"
          class:active={selectedDataset === key}
          on:click={async () => {
            selectedDataset = key;
            // Reload data for current district with new baseline
            if (selectedDistrict) {
              await loadDistrictData(selectedDistrict);
            }
          }}
        >
          {config.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- Main Content -->
  <main class="main-content">
    {#if loadError && !selectedDistrict}
      <div class="error-state">
        <p>Error: {loadError}</p>
      </div>
    {:else}
      <ExplorerLayout
        dataset={selectedDataset}
        bind:selectedDistrict
        on:districtChange={handleDistrictChange}
      >
        <div slot="scatter" class="scatter-wrapper">
          {#if isLoading}
            <div class="loading-state">
              <div class="spinner"></div>
              <p>Loading district data...</p>
            </div>
          {:else if selectedDistrict && data.length > 0}
            <ScatterPlot
              bind:this={chartComponent}
              {data}
              scrollStates={explorerScrollStates}
              currentStateIndex={0}
              previousStateIndex={0}
              isTransitioning={false}
              interpolationT={1}
              randomHouseholds={{}}
              {selectedHousehold}
              onPointClick={handlePointClick}
            />
          {:else}
            <div class="select-district-prompt">
              <div class="prompt-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
                  <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"/>
                </svg>
              </div>
              <h2>Select a Congressional District</h2>
              <p>Click on a district in the map to explore household-level impacts</p>
            </div>
          {/if}
        </div>
      </ExplorerLayout>
    {/if}
  </main>

  <!-- Household Profile Modal -->
  {#if selectedHousehold}
    <div class="profile-overlay" on:click={closeProfile}>
      <div class="profile-modal" on:click|stopPropagation>
        <button class="close-btn" on:click={closeProfile}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        <HouseholdProfile household={selectedHousehold} onRandomize={randomizeHousehold} />
      </div>
    </div>
  {/if}
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: #f8fafc;

    /* Scatter plot colors - match nationwide styling */
    --scatter-positive: #319795; /* Teal for gains */
    --scatter-negative: #6B7280; /* Gray for losses */
  }

  .explore-page {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 24px;
    background: #fff;
    border-bottom: 1px solid #e2e8f0;
    flex-shrink: 0;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .back-link {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #64748b;
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
    transition: color 0.15s ease;
  }

  .back-link:hover {
    color: #319795;
  }

  .page-title {
    font-size: 18px;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
  }

  /* Baseline selector overlay (bottom right, matching nationwide style) */
  .baseline-selector-overlay {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .baseline-label {
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
    font-family: 'Inter', sans-serif;
  }

  .baseline-selector {
    display: flex;
    gap: 8px;
  }

  .tab-button {
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid rgba(226, 232, 240, 0.5);
    color: #64748b;
    font-size: 14px;
    font-weight: 500;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    font-family: 'Inter', sans-serif;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .tab-button:hover:not(.active) {
    background: rgba(255, 255, 255, 1);
    border-color: #cbd5e1;
  }

  .tab-button.active {
    background: #319795;
    color: white;
    border-color: #319795;
    box-shadow: 0 2px 8px rgba(49, 151, 149, 0.3);
  }

  .main-content {
    flex: 1;
    overflow: hidden;
    min-height: 0; /* Important for nested flex containers */
  }

  .main-content > :global(*) {
    height: 100%;
  }

  .scatter-wrapper {
    width: 100%;
    height: 100%;
  }

  .select-district-prompt {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 16px;
    color: #64748b;
    text-align: center;
    padding: 40px;
  }

  .select-district-prompt .prompt-icon {
    color: #cbd5e1;
  }

  .select-district-prompt h2 {
    font-size: 20px;
    font-weight: 600;
    color: #334155;
    margin: 0;
  }

  .select-district-prompt p {
    font-size: 14px;
    color: #64748b;
    margin: 0;
    max-width: 300px;
  }

  .loading-state,
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 16px;
    color: #64748b;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e2e8f0;
    border-top-color: #319795;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-state button {
    padding: 8px 16px;
    background: #319795;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
  }

  /* Profile Modal */
  .profile-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .profile-modal {
    position: relative;
    background: #fff;
    border-radius: 12px;
    width: 90vw;
    max-width: 650px;
    max-height: 85vh;
    overflow: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    padding: 8px;
  }

  .close-btn {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f1f5f9;
    border: none;
    border-radius: 6px;
    color: #64748b;
    cursor: pointer;
    z-index: 1;
  }

  .close-btn:hover {
    background: #e2e8f0;
    color: #334155;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .header {
      padding: 12px 16px;
    }

    .header-left {
      width: 100%;
      justify-content: space-between;
    }

    .page-title {
      font-size: 16px;
    }

    .baseline-selector-overlay {
      bottom: 1rem;
      right: 1rem;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
    }

    .baseline-label {
      font-size: 12px;
    }

    .baseline-selector {
      flex-direction: column;
      gap: 6px;
    }

    .tab-button {
      font-size: 12px;
      padding: 6px 12px;
    }
  }
</style>
