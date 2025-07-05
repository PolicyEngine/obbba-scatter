<script>
  import { onMount } from 'svelte';
  import Papa from 'papaparse';
  import * as d3 from 'd3';

  let data = [];
  let loading = true;
  let scrollProgress = 0;
  let selectedPoint = null;
  let canvasRef;
  let svgRef;
  let scrollContainer;
  let currentSectionIndex = 0;

  const scrollStates = [
    {
      id: 'intro',
      title: "How Tax Changes Affect Every American Household",
      text: "Each dot represents a household, positioned by their income and how much they gain or lose under the proposed tax changes. Green dots show households that benefit, red shows those that face increases.",
      view: {
        xDomain: [-15, 15],
        yDomain: [0, 350000],
        filter: d => d['Gross Income'] < 350000,
        highlightGroup: null
      }
    },
    {
      id: 'middle-class', 
      title: "Middle-Class Families See Mixed Results",
      text: "For families earning between $50,000 and $150,000 — the heart of America's middle class — the picture is complex. While some see modest gains, others face tax increases that could impact their family budgets.",
      view: {
        xDomain: [-10, 20],
        yDomain: [50000, 150000],
        filter: d => d['Gross Income'] >= 50000 && d['Gross Income'] < 150000,
        highlightGroup: 'middle'
      }
    },
    {
      id: 'upper-middle',
      title: "Upper-Middle Class Faces the Biggest Swings", 
      text: "Households earning $150,000 to $400,000 experience the most dramatic variation in outcomes. This group includes many professionals, small business owners, and dual-income families in expensive areas.",
      view: {
        xDomain: [-25, 25],
        yDomain: [150000, 400000],
        filter: d => d['Gross Income'] >= 150000 && d['Gross Income'] < 400000,
        highlightGroup: 'upper-middle'
      }
    },
    {
      id: 'high-earners',
      title: "High Earners See Significant Increases",
      text: "The top 5% of earners — those making $400,000 to $1 million — face substantial tax increases under most scenarios. This group contributes a large share of total tax revenue.",
      view: {
        xDomain: [-40, 40], 
        yDomain: [400000, 1000000],
        filter: d => d['Gross Income'] >= 400000 && d['Gross Income'] < 1000000,
        highlightGroup: 'high'
      }
    },
    {
      id: 'ultra-wealthy',
      title: "The Ultra-Wealthy Face the Largest Changes",
      text: "Millionaire households represent less than 1% of Americans but show the most extreme policy effects. Some face tax increases exceeding 50% of their current liability.",
      view: {
        xDomain: [-60, 60],
        yDomain: [1000000, 10000000],
        filter: d => d['Gross Income'] >= 1000000,
        highlightGroup: 'ultra'
      }
    }
  ];

  // Load data
  onMount(async () => {
    try {
      const response = await fetch('/household_tax_income_changes_senate_current_law_baseline.csv');
      const raw = await response.text();
      const result = Papa.parse(raw, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true
      });
      
      data = result.data.map((d, i) => ({
        ...d,
        id: i,
        isAnnotated: false,
        sectionIndex: null
      }));

      // Find representative points for each scroll state
      scrollStates.forEach((state, index) => {
        const filteredData = data.filter(state.view.filter);
        if (filteredData.length > 0) {
          // Find a representative point near the center of the view
          const centerY = (state.view.yDomain[0] + state.view.yDomain[1]) / 2;
          const centerX = (state.view.xDomain[0] + state.view.xDomain[1]) / 2;
          
          let closest = null;
          let minDistance = Infinity;
          filteredData.forEach(d => {
            const dx = (d['Percentage Change in Net Income'] - centerX) / (state.view.xDomain[1] - state.view.xDomain[0]);
            const dy = (d['Gross Income'] - centerY) / (state.view.yDomain[1] - state.view.yDomain[0]);
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < minDistance) {
              minDistance = distance;
              closest = d;
            }
          });
          if (closest) {
            closest.isHighlighted = true;
            closest.highlightGroup = state.view.highlightGroup;
            closest.stateIndex = index;
          }
        }
      });

      loading = false;
    } catch (error) {
      console.error('Error loading data:', error);
      loading = false;
    }
  });

  // Scroll handling with intersection observer pattern
  let textSections = [];
  let currentStateIndex = 0;
  let isTransitioning = false;
  let intersectionObserver;

  function setupIntersectionObserver() {
    if (intersectionObserver) {
      intersectionObserver.disconnect();
    }

    console.log('Setting up intersection observer with', textSections.length, 'sections');

    // Find the text column element to use as root
    const textColumn = document.querySelector('.text-column');
    if (!textColumn) {
      console.error('Text column not found for intersection observer');
      return;
    }

    intersectionObserver = new IntersectionObserver(
      (entries) => {
        let mostVisibleEntry = null;
        let maxRatio = 0;

        entries.forEach((entry) => {
          const index = parseInt(entry.target.dataset.index);
          console.log(`Section ${index}: intersecting=${entry.isIntersecting}, ratio=${entry.intersectionRatio.toFixed(2)}`);
          
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            mostVisibleEntry = { entry, index };
          }
        });

        if (mostVisibleEntry && mostVisibleEntry.index !== currentStateIndex && !isTransitioning) {
          console.log(`Transitioning from ${currentStateIndex} to ${mostVisibleEntry.index}`);
          transitionToState(mostVisibleEntry.index);
        }
      },
      {
        root: textColumn,
        threshold: [0, 0.1, 0.3, 0.5, 0.7, 0.9, 1],
        rootMargin: '-30% 0px -30% 0px'
      }
    );

    // Observe all text sections
    textSections.forEach((section, index) => {
      if (section) {
        section.dataset.index = index.toString();
        intersectionObserver.observe(section);
        console.log(`Observing section ${index}`);
      }
    });
  }

  function transitionToState(newIndex) {
    if (newIndex === currentStateIndex || isTransitioning) {
      console.log('Transition blocked:', { newIndex, currentStateIndex, isTransitioning });
      return;
    }
    
    console.log('Starting transition from', currentStateIndex, 'to', newIndex);
    isTransitioning = true;
    const fromState = scrollStates[currentStateIndex];
    const toState = scrollStates[newIndex];
    
    console.log('From state:', fromState.id, 'To state:', toState.id);
    
    animateScales({
      from: fromState.view,
      to: toState.view,
      duration: 800,
      onComplete: () => {
        console.log('Transition completed to state', newIndex);
        currentStateIndex = newIndex;
        isTransitioning = false;
      }
    });
  }

  function animateScales({ from, to, duration, onComplete }) {
    const startTime = performance.now();
    console.log('Animation started');
    
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Cubic easing for smooth transitions
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      
      console.log('Animation progress:', progress.toFixed(2), 'eased:', eased.toFixed(2));
      renderVisualization(from, to, eased);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        console.log('Animation complete');
        onComplete();
      }
    }
    
    requestAnimationFrame(animate);
  }

  function renderVisualization(fromView = null, toView = null, t = 0) {
    if (!data.length || !canvasRef) return;

    const canvas = canvasRef;
    const ctx = canvas.getContext('2d', { alpha: false });
    const width = canvas.width;
    const height = canvas.height;
    const margin = { top: 60, right: 100, bottom: 80, left: 100 };

    // Determine current view and interpolation
    let currentView, targetView, interpolationT;
    
    if (isTransitioning && fromView !== null && toView !== null) {
      currentView = fromView;
      targetView = toView;
      interpolationT = t;
    } else {
      currentView = scrollStates[currentStateIndex].view;
      targetView = currentView;
      interpolationT = 0;
    }

    // Interpolate between views with D3
    const yMin = d3.interpolate(currentView.yDomain[0], targetView.yDomain[0])(interpolationT);
    const yMax = d3.interpolate(currentView.yDomain[1], targetView.yDomain[1])(interpolationT);
    const xMin = d3.interpolate(currentView.xDomain[0], targetView.xDomain[0])(interpolationT);
    const xMax = d3.interpolate(currentView.xDomain[1], targetView.xDomain[1])(interpolationT);
    
    // Clear canvas with NYT-style background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Filter data based on current view
    const currentState = isTransitioning ? targetView : currentView;
    const visibleData = data.filter(currentState.filter || (d => 
      d['Gross Income'] >= yMin && 
      d['Gross Income'] <= yMax && 
      d['Percentage Change in Net Income'] >= xMin && 
      d['Percentage Change in Net Income'] <= xMax
    ));

    // Create scales
    const xScale = d3.scaleLinear()
      .domain([xMin, xMax])
      .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
      .domain([yMin, yMax])
      .range([height - margin.bottom, margin.top]);

    // Draw NYT-style grid lines
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([]);
    
    // Vertical grid lines
    const xTickInterval = Math.max(5, Math.floor((xMax - xMin) / 10));
    for (let i = Math.ceil(xMin / xTickInterval) * xTickInterval; i <= xMax; i += xTickInterval) {
      const x = xScale(i);
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, height - margin.bottom);
      ctx.stroke();
    }
    
    // Horizontal grid lines
    const yTicks = yScale.ticks(6);
    yTicks.forEach(tick => {
      const y = yScale(tick);
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(width - margin.right, y);
      ctx.stroke();
    });

    // NYT-style point rendering with proper colors
    visibleData.forEach(d => {
      const x = xScale(d['Percentage Change in Net Income']);
      const y = yScale(d['Gross Income']);
      
      // Skip if outside canvas bounds
      if (x < margin.left || x > width - margin.right || y < margin.top || y > height - margin.bottom) return;

      // NYT color scheme
      let color;
      const change = d['Percentage Change in Net Income'];
      if (Math.abs(change) < 0.1) {
        color = '#999999'; // gray for no change
      } else if (change > 0) {
        color = '#1a9658'; // green for gains
      } else {
        color = '#d75442'; // red for losses
      }

      // Point sizing and opacity
      const isHighlighted = d.isHighlighted && d.stateIndex === currentStateIndex;
      const radius = isHighlighted ? 4 : 2;
      const opacity = isHighlighted ? 1 : 0.6;

      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fill();

      // Highlight stroke for featured points
      if (isHighlighted) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    ctx.globalAlpha = 1;

    // Draw zero line (NYT style)
    if (xMin <= 0 && xMax >= 0) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(xScale(0), margin.top);
      ctx.lineTo(xScale(0), height - margin.bottom);
      ctx.stroke();
    }

    // Draw axes using SVG overlay (NYT style)
    if (svgRef) {
      const svg = d3.select(svgRef);
      svg.selectAll('*').remove();

      const g = svg.append('g');

      // X-axis
      const xAxis = g.append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(xScale).tickFormat(d => `${d > 0 ? '+' : ''}${d}%`))
        .style('font-family', 'nyt-franklin, helvetica, arial, sans-serif')
        .style('font-size', '11px')
        .style('color', '#121212');

      // Y-axis  
      const yAxis = g.append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale).ticks(6).tickFormat(d => d3.format('$,')(d)))
        .style('font-family', 'nyt-franklin, helvetica, arial, sans-serif')
        .style('font-size', '11px')
        .style('color', '#121212');

      // Style axes lines
      xAxis.select('.domain').style('stroke', '#000000').style('stroke-width', 1);
      yAxis.select('.domain').style('stroke', '#000000').style('stroke-width', 1);
      
      // Style tick lines
      xAxis.selectAll('.tick line').style('stroke', '#000000').style('stroke-width', 0.5);
      yAxis.selectAll('.tick line').style('stroke', '#000000').style('stroke-width', 0.5);

      // Axis labels (NYT style)
      g.append('text')
        .attr('x', width / 2)
        .attr('y', height - 15)
        .attr('text-anchor', 'middle')
        .style('font-family', 'nyt-franklin, helvetica, arial, sans-serif')
        .style('font-size', '12px')
        .style('font-weight', '400')
        .style('fill', '#666666')
        .text('Change in income →');

      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', 25)
        .attr('text-anchor', 'middle')
        .style('font-family', 'nyt-franklin, helvetica, arial, sans-serif')
        .style('font-size', '12px')
        .style('font-weight', '400')
        .style('fill', '#666666')
        .text('← Annual household income');
    }
  }

  // Reactive statements for rendering
  $: if (data.length && canvasRef && !isTransitioning) {
    renderVisualization();
  }

  // Initialize text sections and intersection observer
  onMount(() => {
    textSections = new Array(scrollStates.length);
    
    // Set up intersection observer after DOM is ready
    setTimeout(() => {
      setupIntersectionObserver();
      // Initial render
      if (data.length && canvasRef) {
        renderVisualization();
      }
    }, 200);
    
    return () => {
      if (intersectionObserver) {
        intersectionObserver.disconnect();
      }
    };
  });

  // Throttled scroll handler
  let scrollTimeout;
  function handleScroll(event) {
    if (!textSections.length) return;
    
    // Throttle scroll events
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      checkActiveSection(event.target);
    }, 50);
  }

  function checkActiveSection(container) {
    if (isTransitioning) return;
    
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    
    console.log('Checking active section - scrollTop:', scrollTop);
    
    // Always query sections directly from DOM for reliability
    const domSections = container.querySelectorAll('.text-section');
    const sectionsToCheck = Array.from(domSections);
    console.log('Found sections via DOM query:', sectionsToCheck.length);
    
    console.log('Sections to check:', sectionsToCheck.map((s, i) => ({ index: i, exists: !!s, tagName: s?.tagName })));
    
    // Simple approach: find which section's top is closest to being in view
    let activeSection = 0;
    let minDistance = Infinity;
    let sectionsFound = 0;
    
    sectionsToCheck.forEach((section, index) => {
      console.log(`Checking section ${index}:`, section, 'exists:', !!section, 'type:', typeof section);
      
      if (section) {
        sectionsFound++;
        const rect = section.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        console.log(`Section ${index} rects:`, { 
          section: { top: rect.top, height: rect.height }, 
          container: { top: containerRect.top, height: containerRect.height }
        });
        
        // Calculate absolute position in the scrollable area
        const sectionTop = rect.top - containerRect.top + scrollTop;
        const sectionCenter = sectionTop + rect.height / 2;
        const viewportCenter = scrollTop + containerHeight / 2;
        
        // Distance from section center to viewport center
        const distance = Math.abs(sectionCenter - viewportCenter);
        
        console.log(`Section ${index}: top=${sectionTop.toFixed(0)}, center=${sectionCenter.toFixed(0)}, distance=${distance.toFixed(0)}`);
        
        if (distance < minDistance) {
          minDistance = distance;
          activeSection = index;
        }
      } else {
        console.log(`Section ${index}: null/undefined`);
      }
    });
    
    console.log(`Found ${sectionsFound} valid sections. Closest section:`, activeSection, 'distance:', minDistance === Infinity ? 'Infinity' : minDistance.toFixed(0));
    
    if (activeSection !== currentStateIndex && minDistance !== Infinity) {
      console.log('Transitioning from', currentStateIndex, 'to', activeSection);
      transitionToState(activeSection);
    }
  }

  // Watch for text sections being bound
  $: if (textSections.length > 0 && textSections.every(el => el)) {
    setTimeout(() => {
      setupIntersectionObserver();
    }, 50);
  }
</script>

<svelte:head>
  <title>NYT-Style Scatterplot</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
  </style>
</svelte:head>

<div class="app">
  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading data...</p>
    </div>
  {/if}

  <div class="nyt-container">
    <!-- NYT-style layout: text on left, viz on right -->
    <div class="text-column" on:scroll={handleScroll}>
      {#each scrollStates as state, i}
        <section 
          class="text-section" 
          class:active={i === currentStateIndex}
          bind:this={textSections[i]}
          data-index={i}
        >
          <div class="section-content">
            <h2>{state.title}</h2>
            <p>{@html state.text}</p>
          </div>
        </section>
      {/each}
    </div>
    
    <div class="viz-column">
      <div class="viz-sticky">
        <canvas 
          bind:this={canvasRef} 
          width="800" 
          height="600"
          class="main-canvas"
        ></canvas>
        <svg 
          bind:this={svgRef} 
          width="800" 
          height="600"
          class="overlay-svg"
        ></svg>
        
        <!-- Debug controls -->
        <div class="debug-controls">
          <p>Current State: {currentStateIndex} - {scrollStates[currentStateIndex]?.id}</p>
          <p>Is Transitioning: {isTransitioning}</p>
          <p>Text Sections: {textSections.filter(el => el).length} / {textSections.length}</p>
          <p>Observer: {intersectionObserver ? 'Active' : 'Inactive'}</p>
          <div>
            {#each scrollStates as state, i}
              <button on:click={() => transitionToState(i)} class:active={i === currentStateIndex}>
                {i}: {state.id}
              </button>
            {/each}
          </div>
          <button on:click={() => console.log('Text sections:', textSections)}>
            Log Sections
          </button>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  :root {
    --nyt-background: #ffffff;
    --nyt-text-primary: #121212;
    --nyt-text-secondary: #666666;
    --nyt-scatter-positive: #1a9658;
    --nyt-scatter-negative: #d75442;
    --nyt-scatter-neutral: #999999;
    --nyt-font-sans: nyt-franklin, helvetica, arial, sans-serif;
  }

  .app {
    width: 100%;
    min-height: 100vh;
    background: var(--nyt-background);
    font-family: var(--nyt-font-sans);
  }

  .loading {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    z-index: 1000;
    background: rgba(255, 255, 255, 0.95);
    padding: 40px;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid var(--nyt-text-secondary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .nyt-container {
    display: flex;
    max-width: 1200px;
    margin: 0 auto;
  }

  .text-column {
    flex: 0 0 40%;
    background: var(--nyt-background);
    height: 100vh;
    overflow-y: auto;
  }

  .viz-column {
    flex: 0 0 60%;
    background: var(--nyt-background);
  }

  .viz-sticky {
    position: sticky;
    top: 60px;
    height: calc(100vh - 120px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .main-canvas {
    background: var(--nyt-background);
    border: 1px solid #e0e0e0;
  }

  .overlay-svg {
    position: absolute;
    pointer-events: none;
  }

  .text-section {
    min-height: 60vh;
    padding: 3rem 2rem;
    display: flex;
    align-items: center;
    border-bottom: 1px solid #f0f0f0;
    transition: background-color 0.3s ease;
  }

  .text-section.active {
    background: #f8f9fa;
  }

  .section-content {
    max-width: 500px;
  }

  .text-section h2 {
    font-family: var(--nyt-font-sans);
    font-size: 1.8rem;
    font-weight: 700;
    line-height: 1.2;
    color: var(--nyt-text-primary);
    margin: 0 0 1rem 0;
  }

  .text-section p {
    font-family: var(--nyt-font-sans);
    font-size: 1.1rem;
    line-height: 1.6;
    color: var(--nyt-text-secondary);
    margin: 0;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .nyt-container {
      flex-direction: column;
    }
    
    .text-column {
      flex: none;
      order: 2;
    }
    
    .viz-column {
      flex: none;
      order: 1;
    }
    
    .viz-sticky {
      position: relative;
      top: 0;
      height: 50vh;
    }
    
    .main-canvas {
      max-width: 100%;
      max-height: 100%;
    }
    
    .text-section {
      min-height: 40vh;
      padding: 2rem 1rem;
    }
    
    .text-section h2 {
      font-size: 1.5rem;
    }
    
    .text-section p {
      font-size: 1rem;
    }
  }

  .debug-controls {
    position: absolute;
    top: 10px;
    left: 10px;
    background: rgba(255, 255, 255, 0.9);
    padding: 10px;
    border: 1px solid #ccc;
    font-size: 12px;
  }

  .debug-controls button {
    margin: 2px;
    padding: 4px 8px;
    border: 1px solid #ccc;
    background: white;
    cursor: pointer;
  }

  .debug-controls button.active {
    background: #007bff;
    color: white;
  }

</style>