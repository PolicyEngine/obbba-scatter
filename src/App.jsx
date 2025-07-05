import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

const App = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [axisProgress, setAxisProgress] = useState(0);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const svgRef = useRef(null);
  const canvasRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const axisFrameRef = useRef(null);
  const activeSectionRef = useRef(null);
  const prevShowTooltipRef = useRef(true);

  // Define the sections with their income thresholds and messages
  const thresholds = [70000, 120000, 240000, 350000, 500000, 1000000, 2000000, 3000000, 5000000, 7000000];
  const sections = thresholds.map((threshold, i) => ({
    threshold,
    title: `Annotation ${i + 1}`,
    annotationTarget: { income: threshold * 0.5, percentChange: 0 }
  }));

  // Load and process the dataset
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.BASE_URL}household_tax_income_changes_sample.json`
        );
        const json = await response.json();
        const parsed = json.map((d, i) => ({
          ...d,
          id: i,
          isAnnotated: false,
          sectionIndex: null
        }));

        sections.forEach((section, index) => {
          let closest = null;
          let minDistance = Infinity;
          parsed.forEach(d => {
            const dx = d.pct_change - section.annotationTarget.percentChange;
            const dy = d.income - section.annotationTarget.income;
            const distance = Math.abs(dx) + Math.abs(dy) / 1000;
            if (distance < minDistance) {
              minDistance = distance;
              closest = d;
            }
          });
          if (closest) {
            closest.isAnnotated = true;
            closest.sectionIndex = index;
          }
        });

        setData(parsed);
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Trigger independent axis animation when crossing the tooltip threshold
  useEffect(() => {
    const sectionDuration = 1 / sections.length;
    const currentSectionIndex = Math.min(Math.floor(scrollProgress / sectionDuration), sections.length - 1);
    const sectionProgress = (scrollProgress % sectionDuration) / sectionDuration;
    const showTooltip = sectionProgress < 0.3;

    if (!showTooltip && (prevShowTooltipRef.current || activeSectionRef.current !== currentSectionIndex)) {
      activeSectionRef.current = currentSectionIndex;
      const start = performance.now();
      const duration = 3000;

      if (axisFrameRef.current) cancelAnimationFrame(axisFrameRef.current);

      const animate = (now) => {
        const t = Math.min((now - start) / duration, 1);
        setAxisProgress(d3.easeExpOut(t));
        if (t < 1) {
          axisFrameRef.current = requestAnimationFrame(animate);
        } else {
          axisFrameRef.current = null;
        }
      };
      axisFrameRef.current = requestAnimationFrame(animate);
    } else if (showTooltip && !prevShowTooltipRef.current) {
      if (axisFrameRef.current) {
        cancelAnimationFrame(axisFrameRef.current);
        axisFrameRef.current = null;
      }
      setAxisProgress(0);
      activeSectionRef.current = null;
    }

    prevShowTooltipRef.current = showTooltip;
  }, [scrollProgress, sections.length]);

  // Clear selected point when section changes
  useEffect(() => {
    const scrollState = getScrollState(scrollProgress, axisProgress);
    
    // Clear selection when moving to a new section or during axis animation
    if (selectedPoint && !scrollState.showTooltip) {
      setSelectedPoint(null);
    }
  }, [scrollProgress, axisProgress]);


  // Handle scroll events
  useEffect(() => {
    const throttle = (fn, wait) => {
      let last = 0;
      return (...args) => {
        const now = Date.now();
        if (now - last >= wait) {
          last = now;
          fn(...args);
        }
      };
    };

    const handleScroll = throttle(() => {
      if (!scrollContainerRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const maxScroll = scrollHeight - clientHeight;
      const progress = Math.min(scrollTop / maxScroll, 1);

      setScrollProgress(progress);
    }, 50);

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Calculate current state based on scroll
  const getScrollState = (progress, axisProgressVal = axisProgress) => {
    const sectionDuration = 1 / sections.length;
    const currentSectionIndex = Math.min(Math.floor(progress / sectionDuration), sections.length - 1);
    const sectionProgress = (progress % sectionDuration) / sectionDuration;

    // First 30% of each section: show tooltip
    // Last 70%: animate axis
    const showTooltip = sectionProgress < 0.3;
    const axisAnimationProgress = showTooltip ? 0 : axisProgressVal;
    
    let currentDataSection = currentSectionIndex;
    if (!showTooltip && currentSectionIndex < sections.length - 1) {
      currentDataSection = currentSectionIndex + axisAnimationProgress;
    }
    
    return {
      currentSectionIndex,
      showTooltip,
      axisAnimationProgress,
      currentDataSection,
      sectionProgress
    };
  };

  // Fixed X-axis domains for first three sections, shrinking to [-20,20] thereafter
  const fixedXDomains = [ [-40, 40], [-30, 30], [-20, 20] ];
  const getFixedDomain = (idx) => (idx < 2 ? fixedXDomains[idx] : fixedXDomains[2]);
  const getInterpolatedValues = (sectionProgress) => {
    const currentIndex = Math.floor(sectionProgress);
    const nextIndex = Math.min(currentIndex + 1, sections.length - 1);
    const t = sectionProgress - currentIndex;

    // Compute gain/loss stats for a section
    const computeStats = (i) => {
      const sec = sections[i];
      const list = data.filter(d => d.income <= sec.threshold);
      const total = list.length;
      if (!total) return { yMax: sec.threshold, gainedPercent: 0, lostPercent: 0, noChangePercent: 0 };
      const gainCount = list.filter(d => d.net_change > 0).length;
      const lossCount = list.filter(d => d.net_change < 0).length;
      const yMax = sec.threshold;
      const gainedPercent = Math.round((gainCount / total) * 100);
      const lostPercent = Math.round((lossCount / total) * 100);
      return { yMax, gainedPercent, lostPercent, noChangePercent: 100 - gainedPercent - lostPercent };
    };

    const currStats = computeStats(currentIndex);
    const [currMin, currMax] = getFixedDomain(currentIndex);
    if (t > 0 && currentIndex !== nextIndex) {
      const nextStats = computeStats(nextIndex);
      const [nextMin, nextMax] = getFixedDomain(nextIndex);
      const interpYMax = d3.interpolate(currStats.yMax, nextStats.yMax)(t);
      return {
        xMin: d3.interpolate(currMin, nextMin)(t),
        xMax: d3.interpolate(currMax, nextMax)(t),
        yMax: interpYMax,
        threshold: interpYMax,
        gainedPercent: Math.round(d3.interpolate(currStats.gainedPercent, nextStats.gainedPercent)(t)),
        lostPercent: Math.round(d3.interpolate(currStats.lostPercent, nextStats.lostPercent)(t)),
        noChangePercent: Math.round(d3.interpolate(currStats.noChangePercent, nextStats.noChangePercent)(t)),
        currentIndex,
        nextIndex,
        t
      };
    }

    return {
      xMin: currMin,
      xMax: currMax,
      yMax: currStats.yMax,
      threshold: currStats.yMax,
      gainedPercent: currStats.gainedPercent,
      lostPercent: currStats.lostPercent,
      noChangePercent: currStats.noChangePercent,
      currentIndex,
      nextIndex: currentIndex,
      t: 0
    };
  };

  // Update visualization; track section changes to trigger Y-axis stretch
  const prevSectionRef = useRef(null);
  const yTransitionDone = useRef(false);
  useEffect(() => {
    prevSectionRef.current = getScrollState(scrollProgress, axisProgress).currentSectionIndex;
    if (!data.length || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = 1200;
    const height = 600;
    const margin = { top: 50, right: 100, bottom: 50, left: 100 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    // Clear previous content
    svg.selectAll('*').remove();

    // Get current scroll state
    const scrollState = getScrollState(scrollProgress, axisProgress);
    const interpolated = getInterpolatedValues(scrollState.currentDataSection);

    // Create scales
    const xScale = d3.scaleLinear()
      .domain([interpolated.xMin, interpolated.xMax])
      .range([0, plotWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, interpolated.yMax])
      .range([plotHeight, 0]);

    // Apply distortion during axis animation
    const distortY = (y) => {
      if (scrollState.axisAnimationProgress > 0 && interpolated.t > 0) {
        const normalizedY = y / interpolated.yMax;
        const bendFactor = Math.sin(interpolated.t * Math.PI) * 0.3;
        const distortion = Math.pow(normalizedY, 1 + bendFactor);
        return yScale(distortion * interpolated.yMax);
      }
      return yScale(y);
    };

    // Create main group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add clipping path
    const clip = g.append('defs')
      .append('clipPath')
      .attr('id', 'plot-clip');

    clip.append('rect')
      .attr('width', plotWidth)
      .attr('height', plotHeight);


    // Add grid lines
    const yTicks = yScale.ticks(8);
    g.append('g')
      .attr('class', 'grid y-grid')
      .selectAll('line')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', plotWidth)
      .attr('y1', d => distortY(d))
      .attr('y2', d => distortY(d))
      .style('stroke', '#cbd5e1')
      .style('stroke-width', 1.5)
      .style('stroke-dasharray', '4,4')
      .style('opacity', 0.7);

    const xTicks = xScale.ticks(10);
    const xGrid = g.append('g')
      .attr('class', 'grid x-grid')
      .selectAll('line')
      .data(xTicks)
      .enter()
      .append('line')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', 0)
      .attr('y2', plotHeight)
      .style('stroke', '#cbd5e1')
      .style('stroke-width', 1.5)
      .style('stroke-dasharray', '4,4')
      .style('opacity', 0.7)
      .transition()
      .duration(1000)
      .ease(d3.easeExpOut)
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d));

    // Grid lines are static; X morphs with scroll, Y morphs with axis transition below
    xGrid.attr('x1', d => xScale(d)).attr('x2', d => xScale(d));

    // Add axes (animated during axis animation)
    const xAxisG = g.append('g')
      .attr('transform', `translate(0,${plotHeight})`);

    // X-axis shrinks fluidly via scroll-driven transition
    xAxisG.transition()
      .duration(1000)
      .ease(d3.easeExpOut)
      .call(d3.axisBottom(xScale).tickFormat(d => `${d}%`));

    const yAxisG = g.append('g');
    // Y-axis stretch transition only upon first crossing from section 0 → 1
    if (prevSectionRef.current === 0 && scrollState.currentSectionIndex === 1 && !yTransitionDone.current) {
      yTransitionDone.current = true;
      d3.select(yAxisG.node())
        .transition()
        .duration(3000)
        .ease(d3.easeExpOut)
        .call(d3.axisLeft(yScale).ticks(8).tickFormat(d => `${d3.format(',')(d)}`));
    } else {
      yAxisG.call(d3.axisLeft(yScale).ticks(8).tickFormat(d => `${d3.format(',')(d)}`));
    }

    // Add vertical line at x=0
    if (scrollState.axisAnimationProgress > 0 && interpolated.t > 0) {
      // Curved line during animation
      const zeroLine = d3.line()
        .x(xScale(0))
        .y((d, i) => distortY(i * interpolated.yMax / 50))
        .curve(d3.curveMonotoneY);

      g.append('path')
        .datum(d3.range(51))
        .attr('d', zeroLine)
        .style('stroke', 'black')
        .style('stroke-width', 2)
        .style('fill', 'none');
    } else {
      // Straight line otherwise
      g.append('line')
        .attr('x1', xScale(0))
        .attr('x2', xScale(0))
        .attr('y1', 0)
        .attr('y2', plotHeight)
        .style('stroke', 'black')
        .style('stroke-width', 2);
    }

    // Draw points using canvas for better performance
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    const visibleData = data.filter(d => d.income <= interpolated.threshold * 1.2);

    visibleData.forEach(d => {
      const r = d.isAnnotated && d.sectionIndex === scrollState.currentSectionIndex ? 5 : 2;
      const x = margin.left + xScale(d.pct_change);
      const y = margin.top + distortY(d.income);

      let opacity = 0.6;
      if (d.isAnnotated && d.sectionIndex === scrollState.currentSectionIndex) {
        opacity = 1;
      } else if (d.income > interpolated.threshold) {
        opacity = 0.1;
      } else {
        const fadeZone = interpolated.threshold * 0.2;
        if (d.income > interpolated.threshold - fadeZone) {
          opacity = 0.6 * (1 - (d.income - (interpolated.threshold - fadeZone)) / fadeZone);
        }
      }

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = d.pct_change > 0 ? '#10b981' : '#ef4444';
      ctx.globalAlpha = opacity;
      ctx.fill();
      if (d.isAnnotated && d.sectionIndex === scrollState.currentSectionIndex) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'white';
        ctx.stroke();
      }
    });

    ctx.globalAlpha = 1;

    if (selectedPoint) {
      const x = margin.left + xScale(selectedPoint.pct_change);
      const y = margin.top + distortY(selectedPoint.income);
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.strokeStyle = selectedPoint.pct_change > 0 ? '#10b981' : '#ef4444';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Add title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text(`Gained Money ${interpolated.gainedPercent}%  Lost Money ${interpolated.lostPercent}%  No Change ${interpolated.noChangePercent}%`);

    // Add click handler to background to clear selection
    svg.on('click', () => {
      if (selectedPoint) {
        setSelectedPoint(null);
      }
    });

    // Add tooltip annotation if visible
    if (scrollState.showTooltip) {
      
      // Use selected point if available, otherwise use default annotated point
      let pointToShow = selectedPoint;
      
      // Verify selected point is within current bounds
      if (pointToShow && pointToShow.income > interpolated.threshold) {
        pointToShow = null;
        setSelectedPoint(null);
      }
      
      if (!pointToShow) {
        pointToShow = data.find(d => d.isAnnotated && d.sectionIndex === scrollState.currentSectionIndex);
      }
      
      if (pointToShow &&
          pointToShow.pct_change >= interpolated.xMin &&
          pointToShow.pct_change <= interpolated.xMax &&
          pointToShow.income <= interpolated.yMax) {
        const x = xScale(pointToShow.pct_change);
        const y = distortY(pointToShow.income);
        
        // Calculate tooltip position to avoid edges
        const tooltipX = x > plotWidth / 2 ? x - 260 : x + 20;
        const tooltipY = y < 100 ? y + 20 : y - 120;
        
        const tooltipG = g.append('g')
          .attr('transform', `translate(${tooltipX}, ${tooltipY})`);

        // Tooltip background
        tooltipG.append('rect')
          .attr('width', 240)
          .attr('height', 100)
          .attr('rx', 5)
          .style('fill', 'white')
          .style('stroke', '#e5e7eb')
          .style('stroke-width', 2)
          .style('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))');

        // Connector line from point to tooltip
        g.append('line')
          .attr('x1', x)
          .attr('y1', y)
          .attr('x2', tooltipX + (x > plotWidth / 2 ? 240 : 0))
          .attr('y2', tooltipY + 50)
          .style('stroke', '#6b7280')
          .style('stroke-width', 1)
          .style('stroke-dasharray', '2,2');



        // Tooltip content
        const income = d3.format('$,.0f')(pointToShow.income);
        const changeValue = pointToShow.pct_change;
        const change = (changeValue >= 0 ? '+' : '') + d3.format('.1%')(changeValue / 100);
        const dollarValue = pointToShow.net_change;
        const dollarChange = (dollarValue >= 0 ? '+' : '') + d3.format('$,.0f')(Math.abs(dollarValue));
        
        tooltipG.append('text')
          .attr('x', 10)
          .attr('y', 20)
          .style('font-size', '14px')
          .style('font-weight', 'bold')
          .text(`Household Income: ${income}`);
        
        tooltipG.append('text')
          .attr('x', 10)
          .attr('y', 40)
          .style('font-size', '13px')
          .text(`Net Income Change: ${change}`);
        
        tooltipG.append('text')
          .attr('x', 10)
          .attr('y', 60)
          .style('font-size', '13px')
          .text(`Dollar Impact: ${dollarChange}`);
        
        tooltipG.append('text')
          .attr('x', 10)
          .attr('y', 85)
          .style('font-size', '11px')
          .style('fill', '#6b7280')
          .text(selectedPoint ? 'Selected household' : 'Example household');
      }
    }

    // Add explanatory text at bottom
    if (scrollState.showTooltip) {
      const currentSection = sections[scrollState.currentSectionIndex];
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height - 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', '#4b5563')
        .text(currentSection.title);
    }

  }, [data, scrollProgress, axisProgress, selectedPoint]);

  // Canvas interaction for selecting points
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const width = 1200;
    const height = 600;
    const margin = { top: 50, right: 100, bottom: 50, left: 100 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    const handleClick = (event) => {
      const rect = canvas.getBoundingClientRect();
      const xPos = event.clientX - rect.left - margin.left;
      const yPos = event.clientY - rect.top - margin.top;

      const scrollState = getScrollState(scrollProgress, axisProgress);
      const interpolated = getInterpolatedValues(scrollState.currentDataSection);

      const xScale = d3.scaleLinear()
        .domain([interpolated.xMin, interpolated.xMax])
        .range([0, plotWidth]);
      const yScale = d3.scaleLinear()
        .domain([0, interpolated.yMax])
        .range([plotHeight, 0]);

      const distortY = (y) => {
        if (scrollState.axisAnimationProgress > 0 && interpolated.t > 0) {
          const normalizedY = y / interpolated.yMax;
          const bendFactor = Math.sin(interpolated.t * Math.PI) * 0.3;
          const distortion = Math.pow(normalizedY, 1 + bendFactor);
          return yScale(distortion * interpolated.yMax);
        }
        return yScale(y);
      };

      if (!scrollState.showTooltip) {
        if (selectedPoint) setSelectedPoint(null);
        return;
      }

      const visibleData = data.filter(d => d.income <= interpolated.threshold * 1.2);
      let nearest = null;
      let minDist = 10;
      visibleData.forEach(d => {
        const dx = xScale(d.pct_change) - xPos;
        const dy = distortY(d.income) - yPos;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          nearest = d;
        }
      });

      if (nearest) {
        setSelectedPoint({ ...nearest });
      } else if (selectedPoint) {
        setSelectedPoint(null);
      }
    };

    canvas.addEventListener('click', handleClick);
    return () => canvas.removeEventListener('click', handleClick);
  }, [data, scrollProgress, axisProgress, selectedPoint]);

  return (
    <div className="w-full h-screen bg-gray-50 relative">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 bg-gray-50 z-10">
          <svg
            className="animate-spin h-12 w-12 text-gray-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          <p className="text-gray-600 text-lg">Loading data...</p>
        </div>
      )}
      <div 
        ref={scrollContainerRef}
        className="w-full h-full overflow-y-scroll"
      >
        {/* Scroll content - creates the scrollable height */}
        <div style={{ height: `${sections.length * 150}vh` }} className="relative">
          {/* Fixed visualization container */}
          <div className="sticky top-0 w-full h-screen flex items-center justify-center">
            <div className="relative w-full h-screen">
              <svg
                ref={svgRef}
                viewBox="0 0 1200 600"
                preserveAspectRatio="xMidYMid meet"
                className="absolute top-0 left-0 w-full h-full"
              />
              <canvas
                ref={canvasRef}
                width={1200}
                height={600}
                className="absolute top-0 left-0 w-full h-full bg-white rounded-lg shadow-lg"
              />
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default App;
