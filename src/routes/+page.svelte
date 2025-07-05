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

  const thresholds = [70000, 120000, 240000, 350000, 500000, 1000000, 2000000, 3000000, 5000000, 7000000];
  const sections = [
    { threshold: 70000, title: "Lower Income", description: "Households earning up to $70,000 show varied impacts from policy changes." },
    { threshold: 120000, title: "Middle Income", description: "Middle-class families see mixed results, with some gaining and others losing." },
    { threshold: 240000, title: "Upper Middle", description: "Higher earning households experience more significant changes." },
    { threshold: 350000, title: "High Income", description: "Wealthy families face different policy implications." },
    { threshold: 500000, title: "Very High Income", description: "The highest earners show distinct patterns." },
    { threshold: 1000000, title: "Top 1%", description: "Millionaire households reveal unique policy effects." },
    { threshold: 2000000, title: "Ultra-Wealthy", description: "Multi-millionaire families experience dramatic changes." },
    { threshold: 3000000, title: "Elite Income", description: "The financial elite face substantial policy impacts." },
    { threshold: 5000000, title: "Top 0.1%", description: "Extreme wealth brackets show exceptional patterns." },
    { threshold: 7000000, title: "Highest Earners", description: "The very top income tier reveals policy extremes." }
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

      // Find annotation points for each section
      sections.forEach((section, index) => {
        let closest = null;
        let minDistance = Infinity;
        data.forEach(d => {
          if (d['Gross Income'] <= section.threshold) {
            const dx = d['Percentage Change in Net Income'];
            const dy = d['Gross Income'] - section.threshold * 0.5;
            const distance = Math.abs(dx) + Math.abs(dy) / 1000;
            if (distance < minDistance) {
              minDistance = distance;
              closest = d;
            }
          }
        });
        if (closest) {
          closest.isAnnotated = true;
          closest.sectionIndex = index;
        }
      });

      loading = false;
    } catch (error) {
      console.error('Error loading data:', error);
      loading = false;
    }
  });

  // Scroll handler
  function handleScroll() {
    if (!scrollContainer) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
    const maxScroll = scrollHeight - clientHeight;
    scrollProgress = Math.min(scrollTop / maxScroll, 1);
    
    const sectionDuration = 1 / sections.length;
    const newSectionIndex = Math.min(Math.floor(scrollProgress / sectionDuration), sections.length - 1);
    
    // Smooth transition between sections
    if (newSectionIndex !== currentSectionIndex) {
      currentSectionIndex = newSectionIndex;
    }
    
    // Use requestAnimationFrame for smooth rendering
    requestAnimationFrame(() => {
      renderVisualization();
    });
  }

  function renderVisualization() {
    if (!data.length || !canvasRef) return;

    const canvas = canvasRef;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const margin = { top: 50, right: 100, bottom: 50, left: 100 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    // Get scroll state
    const sectionDuration = 1 / sections.length;
    const sectionProgress = (scrollProgress % sectionDuration) / sectionDuration;
    const currentSection = sections[currentSectionIndex];
    const nextSection = sections[Math.min(currentSectionIndex + 1, sections.length - 1)];

    // Smooth interpolation between sections
    const t = Math.min(sectionProgress, 1);
    const threshold = d3.interpolate(currentSection.threshold, nextSection.threshold)(t);
    const xDomainMax = d3.interpolate(40 - (currentSectionIndex * 2), 40 - (Math.min(currentSectionIndex + 1, sections.length - 1) * 2))(t);
    
    // Clear canvas with smooth background
    ctx.clearRect(0, 0, width, height);
    
    // Draw subtle gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#f8fafc');
    gradient.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Get visible data with smooth transition
    const visibleData = data.filter(d => d['Gross Income'] <= threshold * 1.1);

    // Create scales
    const xScale = d3.scaleLinear()
      .domain([-xDomainMax, xDomainMax])
      .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
      .domain([0, threshold])
      .range([height - margin.bottom, margin.top]);

    // Draw grid lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    
    // Vertical grid lines
    for (let i = -xDomainMax; i <= xDomainMax; i += 10) {
      const x = xScale(i);
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, height - margin.bottom);
      ctx.stroke();
    }
    
    // Horizontal grid lines
    const yTicks = yScale.ticks(8);
    yTicks.forEach(tick => {
      const y = yScale(tick);
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(width - margin.right, y);
      ctx.stroke();
    });

    ctx.setLineDash([]);

    // Optimized point rendering with batching
    const positivePoints = [];
    const negativePoints = [];
    const highlightedPoints = [];

    visibleData.forEach(d => {
      const x = xScale(d['Percentage Change in Net Income']);
      const y = yScale(d['Gross Income']);
      
      // Skip if outside canvas bounds
      if (x < margin.left || x > width - margin.right || y < margin.top || y > height - margin.bottom) return;

      // Calculate opacity with smooth easing
      const income = d['Gross Income'];
      let opacity = 0.7;
      if (income > threshold) {
        opacity = 0.1;
      } else if (income > threshold * 0.8) {
        const fadeProgress = (income - threshold * 0.8) / (threshold * 0.2);
        // Use easing function for smooth fade
        const easedProgress = fadeProgress * fadeProgress * (3 - 2 * fadeProgress);
        opacity = 0.7 * (1 - easedProgress);
      }

      const radius = d.isAnnotated && d.sectionIndex === currentSectionIndex ? 4 : 1.5;
      const point = { x, y, radius, opacity };

      if (d.isAnnotated && d.sectionIndex === currentSectionIndex) {
        highlightedPoints.push(point);
      } else if (d['Percentage Change in Net Income'] > 0) {
        positivePoints.push(point);
      } else {
        negativePoints.push(point);
      }
    });

    // Batch render positive points
    ctx.fillStyle = '#10b981';
    positivePoints.forEach(point => {
      ctx.globalAlpha = point.opacity;
      ctx.beginPath();
      ctx.arc(point.x, point.y, point.radius, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Batch render negative points
    ctx.fillStyle = '#ef4444';
    negativePoints.forEach(point => {
      ctx.globalAlpha = point.opacity;
      ctx.beginPath();
      ctx.arc(point.x, point.y, point.radius, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Render highlighted points with animation
    highlightedPoints.forEach(point => {
      ctx.globalAlpha = 1;
      
      // Pulsing effect for highlighted points
      const pulseRadius = point.radius + Math.sin(Date.now() * 0.005) * 0.5;
      
      ctx.beginPath();
      ctx.arc(point.x, point.y, pulseRadius, 0, 2 * Math.PI);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();

      // White outline
      ctx.beginPath();
      ctx.arc(point.x, point.y, pulseRadius + 2, 0, 2 * Math.PI);
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    ctx.globalAlpha = 1;

    // Draw zero line
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xScale(0), margin.top);
    ctx.lineTo(xScale(0), height - margin.bottom);
    ctx.stroke();

    // Draw axes using SVG overlay
    if (svgRef) {
      const svg = d3.select(svgRef);
      svg.selectAll('*').remove();

      const g = svg.append('g');

      // X-axis
      g.append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(xScale).tickFormat(d => `${d}%`))
        .style('font-family', 'system-ui, -apple-system, sans-serif')
        .style('font-size', '12px');

      // Y-axis
      g.append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale).ticks(8).tickFormat(d => `${d3.format(',')(d)}`))
        .style('font-family', 'system-ui, -apple-system, sans-serif')
        .style('font-size', '12px');

      // Axis labels
      g.append('text')
        .attr('x', width / 2)
        .attr('y', height - 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', '500')
        .text('Percentage Change in Net Income');

      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', '500')
        .text('Gross Income ($)');
    }
  }

  $: if (data.length && canvasRef) {
    renderVisualization();
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

  <div class="scroll-container" bind:this={scrollContainer} on:scroll={handleScroll}>
    <div class="content" style="height: {sections.length * 150}vh;">
      <div class="visualization-container">
        <canvas 
          bind:this={canvasRef} 
          width="1200" 
          height="600"
          class="main-canvas"
        ></canvas>
        <svg 
          bind:this={svgRef} 
          width="1200" 
          height="600"
          class="overlay-svg"
        ></svg>
        
        <div class="narrative-panel">
          <div class="narrative-content">
            <h2>{sections[currentSectionIndex]?.title}</h2>
            <p>{sections[currentSectionIndex]?.description}</p>
            <div class="progress-indicator">
              <div class="progress-bar" style="width: {(currentSectionIndex + 1) / sections.length * 100}%"></div>
            </div>
            <div class="section-counter">
              {currentSectionIndex + 1} of {sections.length}
            </div>
          </div>
        </div>

        <!-- Floating narrative sections -->
        {#each sections as section, i}
          <div 
            class="floating-narrative" 
            class:active={i === currentSectionIndex}
            style="top: {20 + i * 60}px; right: 20px;"
          >
            <div class="narrative-dot"></div>
            <div class="narrative-text">
              <h3>{section.title}</h3>
              <p>{d3.format('$,')(section.threshold)}</p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .app {
    width: 100%;
    height: 100vh;
    overflow: hidden;
  }

  .loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    z-index: 10;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .scroll-container {
    width: 100%;
    height: 100vh;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .content {
    position: relative;
  }

  .visualization-container {
    position: sticky;
    top: 0;
    width: 100%;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
  }

  .main-canvas {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .overlay-svg {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  .narrative-panel {
    position: absolute;
    top: 20px;
    left: 20px;
    width: 300px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    padding: 24px;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    transition: all 0.3s ease;
  }

  .narrative-content h2 {
    margin: 0 0 16px 0;
    font-size: 24px;
    font-weight: 700;
    color: #1f2937;
  }

  .narrative-content p {
    margin: 0 0 20px 0;
    font-size: 16px;
    line-height: 1.5;
    color: #4b5563;
  }

  .progress-indicator {
    width: 100%;
    height: 4px;
    background: #e5e7eb;
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 12px;
  }

  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #10b981);
    transition: width 0.3s ease;
  }

  .section-counter {
    font-size: 14px;
    color: #6b7280;
    font-weight: 500;
  }

  .floating-narrative {
    position: absolute;
    display: flex;
    align-items: center;
    opacity: 0.4;
    transition: all 0.3s ease;
    pointer-events: none;
  }

  .floating-narrative.active {
    opacity: 1;
    transform: scale(1.1);
  }

  .narrative-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #6b7280;
    margin-right: 12px;
    transition: all 0.3s ease;
  }

  .floating-narrative.active .narrative-dot {
    background: #3b82f6;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
  }

  .narrative-text {
    background: rgba(255, 255, 255, 0.9);
    padding: 8px 12px;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .narrative-text h3 {
    margin: 0 0 4px 0;
    font-size: 12px;
    font-weight: 600;
    color: #1f2937;
  }

  .narrative-text p {
    margin: 0;
    font-size: 10px;
    color: #6b7280;
  }
</style>