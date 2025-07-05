<script>
  import { onMount } from 'svelte';
  import Papa from 'papaparse';
  import * as d3 from 'd3';

  let data = [];
  let loading = true;
  let scrollProgress = 0;
  let selectedPoint = null;
  let selectedData = null;
  let canvasRef;
  let svgRef;
  let scrollContainer;
  let currentSectionIndex = 0;
  let renderedPoints = []; // Store positions for hit detection

  const scrollStates = [
    {
      id: 'intro',
      title: "How tax changes affect every American household",
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
      title: "Middle-class families see mixed results",
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
      title: "Upper-middle class faces the biggest swings", 
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
      title: "High earners see significant increases",
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
      title: "The ultra-wealthy face the largest changes",
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


    // Clean intersection observer setup (backup method)
    const textColumn = document.querySelector('.text-column');
    if (!textColumn) return;

    intersectionObserver = new IntersectionObserver(
      (entries) => {
        let mostVisibleEntry = null;
        let maxRatio = 0;

        entries.forEach((entry) => {
          const index = parseInt(entry.target.dataset.index);
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            mostVisibleEntry = { entry, index };
          }
        });

        if (mostVisibleEntry && mostVisibleEntry.index !== currentStateIndex && !isTransitioning) {
          transitionToState(mostVisibleEntry.index);
        }
      },
      {
        root: textColumn,
        threshold: [0, 0.1, 0.3, 0.5, 0.7, 0.9, 1],
        rootMargin: '-30% 0px -30% 0px'
      }
    );

    textSections.forEach((section, index) => {
      if (section) {
        section.dataset.index = index.toString();
        intersectionObserver.observe(section);
      }
    });
  }

  function transitionToState(newIndex) {
    if (newIndex === currentStateIndex || isTransitioning) return;
    
    isTransitioning = true;
    const fromState = scrollStates[currentStateIndex];
    const toState = scrollStates[newIndex];
    
    animateScales({
      from: fromState.view,
      to: toState.view,
      duration: 800,
      onComplete: () => {
        currentStateIndex = newIndex;
        isTransitioning = false;
      }
    });
  }

  function animateScales({ from, to, duration, onComplete }) {
    const startTime = performance.now();
    
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Cubic easing for smooth transitions
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      
      renderVisualization(from, to, eased);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    }
    
    requestAnimationFrame(animate);
  }

  function renderVisualization(fromView = null, toView = null, t = 0) {
    if (!data.length || !canvasRef) return;

    const canvas = canvasRef;
    const ctx = canvas.getContext('2d', { alpha: false });
    
    // Set up high-DPI canvas
    const devicePixelRatio = window.devicePixelRatio || 1;
    const displayWidth = 800;
    const displayHeight = 600;
    
    canvas.width = displayWidth * devicePixelRatio;
    canvas.height = displayHeight * devicePixelRatio;
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
    
    ctx.scale(devicePixelRatio, devicePixelRatio);
    
    const width = displayWidth;
    const height = displayHeight;
    const margin = { top: 80, right: 120, bottom: 100, left: 100 };

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

    // Don't filter data here - let points fade in/out during rendering
    // Include all data that might be visible in either current or target view
    let allRelevantData = data;
    if (isTransitioning && fromView && toView) {
      // During transition, include data visible in either view
      allRelevantData = data.filter(d => {
        const inFrom = fromView.filter ? fromView.filter(d) : true;
        const inTo = toView.filter ? toView.filter(d) : true;
        return inFrom || inTo;
      });
    } else {
      // Static view - include current view data plus wider buffer for smooth transitions
      const currentState = currentView;
      allRelevantData = data.filter(d => {
        // Include a much wider range so we can fade points in/out smoothly
        return d['Gross Income'] >= 0 && d['Gross Income'] <= 15000000 &&
               d['Percentage Change in Net Income'] >= -100 && 
               d['Percentage Change in Net Income'] <= 100;
      });
    }

    // Create scales
    const xScale = d3.scaleLinear()
      .domain([xMin, xMax])
      .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
      .domain([yMin, yMax])
      .range([height - margin.bottom, margin.top]);

    // Draw NYT-style grid lines
    ctx.strokeStyle = '#DFDFDF';
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

    // Clear rendered points for hit detection
    renderedPoints = [];

    // Enhanced point rendering with smooth fade animations
    allRelevantData.forEach(d => {
      const x = xScale(d['Percentage Change in Net Income']);
      const y = yScale(d['Gross Income']);
      
      // Skip if outside canvas bounds
      if (x < margin.left || x > width - margin.right || y < margin.top || y > height - margin.bottom) return;

      // Calculate fade opacity based on filter transitions
      let fadeOpacity = 1;
      
      if (isTransitioning && fromView && toView && interpolationT !== undefined) {
        const visibleInFrom = fromView.filter ? fromView.filter(d) : true;
        const visibleInTo = toView.filter ? toView.filter(d) : true;
        
        if (visibleInFrom && visibleInTo) {
          fadeOpacity = 1; // Always visible
        } else if (visibleInFrom && !visibleInTo) {
          // Fade out with smooth easing: start at 1, end at 0
          const easedProgress = interpolationT * interpolationT; // Quadratic ease-in
          fadeOpacity = 1 - easedProgress;
        } else if (!visibleInFrom && visibleInTo) {
          // Fade in with smooth easing: start at 0, end at 1
          const easedProgress = interpolationT * (2 - interpolationT); // Quadratic ease-out
          fadeOpacity = easedProgress;
        } else {
          fadeOpacity = 0; // Never visible
        }
      } else {
        // Static view - check if point should be visible
        const currentState = currentView;
        const shouldBeVisible = currentState.filter ? currentState.filter(d) : true;
        fadeOpacity = shouldBeVisible ? 1 : 0;
      }

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

      // Point sizing and final opacity
      const isHighlighted = d.isHighlighted && d.stateIndex === currentStateIndex;
      const radius = isHighlighted ? 4 : 2;
      const baseOpacity = isHighlighted ? 1 : 0.7;
      const finalOpacity = baseOpacity * fadeOpacity;

      if (finalOpacity > 0.02) { // Only render if sufficiently visible
        // Store point for hit detection
        renderedPoints.push({
          x: x,
          y: y,
          radius: radius,
          data: d,
          opacity: finalOpacity
        });

        ctx.globalAlpha = finalOpacity;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fill();

        // Highlight stroke for featured points or selected point
        if ((isHighlighted && finalOpacity > 0.5) || (selectedData && selectedData.id === d.id)) {
          ctx.globalAlpha = finalOpacity;
          ctx.strokeStyle = selectedData && selectedData.id === d.id ? '#0066cc' : '#000000';
          ctx.lineWidth = selectedData && selectedData.id === d.id ? 2 : 1;
          ctx.stroke();
        }
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
        .style('font-family', 'Roboto Mono, monospace')
        .style('font-size', '10px')
        .style('color', '#121212');

      // Y-axis  
      const yAxis = g.append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale).ticks(6).tickFormat(d => d3.format('$,')(d)))
        .style('font-family', 'Roboto Mono, monospace')
        .style('font-size', '10px')
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
        .style('font-family', 'Roboto Serif, serif')
        .style('font-size', '16px')
        .style('font-weight', '400')
        .style('fill', '#666666')
        .text('Change in income →');

      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', 25)
        .attr('text-anchor', 'middle')
        .style('font-family', 'Roboto Serif, serif')
        .style('font-size', '16px')
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
    
    // Query sections directly from DOM
    const domSections = container.querySelectorAll('.text-section');
    const sectionsToCheck = Array.from(domSections);
    
    // Find which section's center is closest to viewport center
    let activeSection = 0;
    let minDistance = Infinity;
    
    sectionsToCheck.forEach((section, index) => {
      if (section) {
        const rect = section.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        const sectionTop = rect.top - containerRect.top + scrollTop;
        const sectionCenter = sectionTop + rect.height / 2;
        const viewportCenter = scrollTop + containerHeight / 2;
        const distance = Math.abs(sectionCenter - viewportCenter);
        
        if (distance < minDistance) {
          minDistance = distance;
          activeSection = index;
        }
      }
    });
    
    if (activeSection !== currentStateIndex && minDistance !== Infinity) {
      transitionToState(activeSection);
    }
  }

  // Canvas click handler for dot selection
  function handleCanvasClick(event) {
    if (!canvasRef || !renderedPoints.length) return;
    
    const rect = canvasRef.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    
    // Find the closest point within click radius
    let closestPoint = null;
    let minDistance = Infinity;
    const maxClickDistance = 8; // pixels
    
    for (const point of renderedPoints) {
      if (point.opacity < 0.1) continue; // Skip nearly invisible points
      
      const dx = clickX - point.x;
      const dy = clickY - point.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= point.radius + maxClickDistance && distance < minDistance) {
        minDistance = distance;
        closestPoint = point;
      }
    }
    
    if (closestPoint) {
      selectedData = closestPoint.data;
      // Trigger re-render to show selection
      if (!isTransitioning) {
        renderVisualization();
      }
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
      font-family: nyt-franklin, helvetica, arial, sans-serif;
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
          on:click={handleCanvasClick}
        ></canvas>
        <svg 
          bind:this={svgRef} 
          width="800" 
          height="600"
          class="overlay-svg"
        ></svg>
        
      </div>
    </div>
  </div>

  <!-- Data table for selected point -->
  {#if selectedData}
    <div class="data-table-container">
      <h3>Selected Household Data</h3>
      <table class="data-table">
        <tbody>
          {#each Object.entries(selectedData) as [key, value]}
            {#if key !== 'id' && key !== 'isAnnotated' && key !== 'sectionIndex' && key !== 'isHighlighted' && key !== 'highlightGroup' && key !== 'stateIndex'}
              <tr>
                <td class="key-column">{key}</td>
                <td class="value-column">
                  {#if typeof value === 'number'}
                    {#if key.includes('Income') || key.includes('Taxes') || key.includes('Net Income Change')}
                      ${value.toLocaleString()}
                    {:else if key.includes('Percentage')}
                      {value > 0 ? '+' : ''}{value.toFixed(2)}%
                    {:else}
                      {value.toLocaleString()}
                    {/if}
                  {:else}
                    {value}
                  {/if}
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
      <button class="close-table" on:click={() => selectedData = null}>×</button>
    </div>
  {/if}
</div>

<style>
  :root {
    --nyt-background: #FFFFFF;
    --nyt-text-primary: #121212;
    --nyt-text-secondary: #666666;
    --nyt-axis-grid: #000000;
    --nyt-grid-lines: #DFDFDF;
    --nyt-scatter-positive: #1a9658;
    --nyt-scatter-negative: #d75442;
    --nyt-scatter-neutral: #999999;
    --nyt-border: #DFDFDF;
    --nyt-hover: #EBEBEB;
    --nyt-font-sans: 'Roboto', sans-serif;
    --nyt-font-serif: 'Roboto Serif', serif;
    --nyt-font-mono: 'Roboto Mono', monospace;
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
    cursor: crosshair;
  }

  .overlay-svg {
    position: absolute;
    pointer-events: none;
  }

  .text-section {
    min-height: 60vh;
    padding: 60px 40px;
    display: flex;
    align-items: center;
    border-bottom: 1px solid var(--nyt-border);
    transition: background-color 0.3s ease;
  }

  .text-section.active {
    background: var(--nyt-hover);
  }

  .section-content {
    max-width: 500px;
  }

  .text-section h2 {
    font-family: var(--nyt-font-serif);
    font-size: 1.8rem;
    font-weight: 700;
    line-height: 1.2;
    color: var(--nyt-text-primary);
    margin: 0 0 1rem 0;
  }

  .text-section p {
    font-family: var(--nyt-font-sans);
    font-size: 16px;
    line-height: 1.5;
    color: var(--nyt-text-secondary);
    margin: 24px 0 0 0;
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

  /* Data table styles */
  .data-table-container {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--nyt-background);
    border: 1px solid var(--nyt-border);
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    padding: 20px;
    max-width: 500px;
    max-height: 60vh;
    overflow-y: auto;
    z-index: 1000;
  }

  .data-table-container h3 {
    font-family: var(--nyt-font-serif);
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--nyt-text-primary);
    margin: 0 0 15px 0;
    padding-right: 30px;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--nyt-font-mono);
    font-size: 12px;
  }

  .data-table tr {
    border-bottom: 1px solid var(--nyt-grid-lines);
  }

  .data-table tr:last-child {
    border-bottom: none;
  }

  .key-column {
    padding: 8px 12px 8px 0;
    color: var(--nyt-text-secondary);
    vertical-align: top;
    font-weight: 500;
    width: 60%;
  }

  .value-column {
    padding: 8px 0;
    color: var(--nyt-text-primary);
    font-weight: 600;
    text-align: right;
  }

  .close-table {
    position: absolute;
    top: 10px;
    right: 10px;
    background: none;
    border: none;
    font-size: 20px;
    color: var(--nyt-text-secondary);
    cursor: pointer;
    width: 25px;
    height: 25px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background-color 0.2s;
  }

  .close-table:hover {
    background-color: var(--nyt-hover);
    color: var(--nyt-text-primary);
  }

  /* Mobile responsive for data table */
  @media (max-width: 768px) {
    .data-table-container {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      transform: none;
      max-width: none;
      border-radius: 8px 8px 0 0;
      max-height: 50vh;
    }

    .data-table {
      font-size: 11px;
    }

    .key-column {
      width: 55%;
    }
  }


</style>