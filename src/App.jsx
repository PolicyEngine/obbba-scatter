import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import * as d3 from 'd3';

const App = () => {
  const [data, setData] = useState([]);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const svgRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Define the sections with their income thresholds and messages
  const sections = [
    {
      threshold: 75000,
      title: "Here's how the bill will affect families with household income of less than $75k, including benefits and taxes.",
      gainedPercent: 73,
      lostPercent: 27,
      noChangePercent: 0,
      yMax: 75000,
      xDomain: [-30, 10],
      // Annotation target: low-income family that benefits
      annotationTarget: { income: 35000, percentChange: 3.5 }
    },
    {
      threshold: 200000,
      title: "Middle-income families see mixed results, with many benefiting from the standard deduction changes.",
      gainedPercent: 83,
      lostPercent: 17,
      noChangePercent: 0,
      yMax: 250000,
      xDomain: [-15, 5],
      // Annotation target: middle-income family with small loss
      annotationTarget: { income: 120000, percentChange: -2.5 }
    },
    {
      threshold: Infinity,
      title: "High-income households face larger tax increases due to SALT limitations and rate changes.",
      gainedPercent: 85,
      lostPercent: 15,
      noChangePercent: 0,
      yMax: 500000,
      xDomain: [-10, 5],
      // Annotation target: high-income family with significant loss
      annotationTarget: { income: 350000, percentChange: -4.8 }
    }
  ];

  // Load and process the CSV data
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.BASE_URL}household_tax_income_changes_senate_current_law_baseline.csv`
        );
        const raw = await response.text();
        const result = Papa.parse(raw, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true
        });
        const parsed = result.data.map((d, i) => ({
          ...d,
          id: i,
          isAnnotated: false,
          sectionIndex: null
        }));

        sections.forEach((section, index) => {
          let closest = null;
          let minDistance = Infinity;
          parsed.forEach(d => {
            const dx = d['Percentage Change in Net Income'] - section.annotationTarget.percentChange;
            const dy = d['Gross Income'] - section.annotationTarget.income;
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
      } catch (error) {
        console.error('Error loading CSV data:', error);
      }
    };

    loadData();
  }, []);

  // Clear selected point when section changes
  useEffect(() => {
    const scrollState = getScrollState(scrollProgress);
    
    // Clear selection when moving to a new section or during axis animation
    if (selectedPoint && !scrollState.showTooltip) {
      setSelectedPoint(null);
    }
  }, [scrollProgress]);


  // Handle scroll events
  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const maxScroll = scrollHeight - clientHeight;
      const progress = Math.min(scrollTop / maxScroll, 1);
      
      setScrollProgress(progress);
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Calculate current state based on scroll
  const getScrollState = (progress) => {
    const sectionDuration = 1 / sections.length;
    const currentSectionIndex = Math.min(Math.floor(progress / sectionDuration), sections.length - 1);
    const sectionProgress = (progress % sectionDuration) / sectionDuration;
    
    // First 70% of each section: show tooltip
    // Last 30%: animate axis
    const showTooltip = sectionProgress < 0.7;
    const axisAnimationProgress = showTooltip ? 0 : (sectionProgress - 0.7) / 0.3;
    
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

  // Interpolate between sections for axis animation
  const getInterpolatedValues = (sectionProgress) => {
    const currentIndex = Math.floor(sectionProgress);
    const nextIndex = Math.min(currentIndex + 1, sections.length - 1);
    const t = sectionProgress - currentIndex;
    
    if (currentIndex >= sections.length) {
      const last = sections[sections.length - 1];
      return {
        yMax: last.yMax,
        xMin: last.xDomain[0],
        xMax: last.xDomain[1],
        threshold: last.threshold === Infinity ? 500000 : last.threshold,
        gainedPercent: last.gainedPercent,
        lostPercent: last.lostPercent,
        currentIndex: sections.length - 1,
        nextIndex: sections.length - 1,
        t: 0
      };
    }
    
    const current = sections[currentIndex];
    const next = sections[nextIndex];
    
    // Only interpolate if we're animating between sections
    if (t > 0 && currentIndex !== nextIndex) {
      return {
        yMax: d3.interpolate(current.yMax, next.yMax)(t),
        xMin: d3.interpolate(current.xDomain[0], next.xDomain[0])(t),
        xMax: d3.interpolate(current.xDomain[1], next.xDomain[1])(t),
        threshold: current.threshold === Infinity ? 500000 : d3.interpolate(current.threshold, next.threshold === Infinity ? 500000 : next.threshold)(t),
        gainedPercent: Math.round(d3.interpolate(current.gainedPercent, next.gainedPercent)(t)),
        lostPercent: Math.round(d3.interpolate(current.lostPercent, next.lostPercent)(t)),
        currentIndex,
        nextIndex,
        t
      };
    }
    
    // No interpolation needed
    return {
      yMax: current.yMax,
      xMin: current.xDomain[0],
      xMax: current.xDomain[1],
      threshold: current.threshold === Infinity ? 500000 : current.threshold,
      gainedPercent: current.gainedPercent,
      lostPercent: current.lostPercent,
      currentIndex,
      nextIndex: currentIndex,
      t: 0
    };
  };

  // Update visualization
  useEffect(() => {
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
    const scrollState = getScrollState(scrollProgress);
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
      .attr('class', 'grid')
      .selectAll('line')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', plotWidth)
      .attr('y1', d => distortY(d))
      .attr('y2', d => distortY(d))
      .style('stroke', '#e5e7eb')
      .style('stroke-dasharray', '3,3')
      .style('opacity', 0.5);

    const xTicks = xScale.ticks(10);
    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(xTicks)
      .enter()
      .append('line')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', 0)
      .attr('y2', plotHeight)
      .style('stroke', '#e5e7eb')
      .style('stroke-dasharray', '3,3')
      .style('opacity', 0.5);

    // Add axes (animated during axis animation)
    const xAxisG = g.append('g')
      .attr('transform', `translate(0,${plotHeight})`);

    if (scrollState.axisAnimationProgress > 0) {
      xAxisG.transition()
        .duration(600)
        .ease(d3.easeCubicInOut)
        .call(d3.axisBottom(xScale)
          .tickFormat(d => `${d}%`)
        );
    } else {
      xAxisG.call(d3.axisBottom(xScale)
        .tickFormat(d => `${d}%`)
      );
    }

    const yAxisG = g.append('g');
    if (scrollState.axisAnimationProgress > 0) {
      yAxisG.transition()
        .duration(600)
        .ease(d3.easeCubicInOut)
        .call(d3.axisLeft(yScale)
          .ticks(8)
          .tickFormat(d => `${d3.format(',')(d)}`)
        );
    } else {
      yAxisG.call(d3.axisLeft(yScale)
        .ticks(8)
        .tickFormat(d => `${d3.format(',')(d)}`)
      );
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

    // Add points
    const pointsGroup = g.append('g')
      .attr('clip-path', 'url(#plot-clip)');

    const visibleData = data.filter(d => d['Gross Income'] <= interpolated.threshold * 1.2);

    const points = pointsGroup.selectAll('.point')
      .data(visibleData, d => d.id);

    points.enter()
      .append('circle')
      .attr('class', 'point')
      .attr('r', d => d.isAnnotated && d.sectionIndex === scrollState.currentSectionIndex ? 5 : 2)
      .style('fill', d => d['Percentage Change in Net Income'] > 0 ? '#10b981' : '#ef4444')
      .style('stroke', d => d.isAnnotated && d.sectionIndex === scrollState.currentSectionIndex ? 'white' : 'none')
      .style('stroke-width', 2)
      .style('cursor', 'pointer')
      .merge(points)
      .attr('cx', d => xScale(d['Percentage Change in Net Income']))
      .attr('cy', d => distortY(d['Gross Income']))
      .style('opacity', d => {
        if (d.isAnnotated && d.sectionIndex === scrollState.currentSectionIndex) return 1;
        const income = d['Gross Income'];
        if (income > interpolated.threshold) return 0.1;
        const fadeZone = interpolated.threshold * 0.2;
        if (income > interpolated.threshold - fadeZone) {
          return 0.6 * (1 - (income - (interpolated.threshold - fadeZone)) / fadeZone);
        }
        return 0.6;
      })
      .on('click', function(event, d) {
        event.stopPropagation();
        // Only allow selection if tooltip is visible
        if (scrollState.showTooltip) {
          // Force update by creating new object reference
          setSelectedPoint({ ...d });
        }
      })
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(100)
          .attr('r', d.isAnnotated && d.sectionIndex === scrollState.currentSectionIndex ? 6 : 4);
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .transition()
          .duration(100)
          .attr('r', d.isAnnotated && d.sectionIndex === scrollState.currentSectionIndex ? 5 : 2);
      });

    points.exit().remove();

    // Add title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text(`Gained Money ${interpolated.gainedPercent}% Lost Money ${interpolated.lostPercent}% No Change 0%`);

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
      if (pointToShow && pointToShow['Gross Income'] > interpolated.threshold) {
        pointToShow = null;
        setSelectedPoint(null);
      }
      
      if (!pointToShow) {
        pointToShow = data.find(d => d.isAnnotated && d.sectionIndex === scrollState.currentSectionIndex);
      }
      
      if (pointToShow && 
          pointToShow['Percentage Change in Net Income'] >= interpolated.xMin && 
          pointToShow['Percentage Change in Net Income'] <= interpolated.xMax &&
          pointToShow['Gross Income'] <= interpolated.yMax) {
        const x = xScale(pointToShow['Percentage Change in Net Income']);
        const y = distortY(pointToShow['Gross Income']);
        
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

        // Highlight the selected point
        if (selectedPoint) {
          g.append('circle')
            .attr('cx', x)
            .attr('cy', y)
            .attr('r', 8)
            .style('fill', 'none')
            .style('stroke', pointToShow['Percentage Change in Net Income'] > 0 ? '#10b981' : '#ef4444')
            .style('stroke-width', 2)
            .style('opacity', 0.5);
        }

        // Tooltip content
        const income = d3.format('$,.0f')(pointToShow['Gross Income']);
        const changeValue = pointToShow['Percentage Change in Net Income'];
        const change = (changeValue >= 0 ? '+' : '') + d3.format('.1%')(changeValue / 100);
        const dollarValue = pointToShow['Total Change in Net Income'];
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

  }, [data, scrollProgress, selectedPoint]);

  return (
    <div className="w-full h-screen bg-gray-50 relative">
      {/* Loading indicator */}
      {!data.length && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-lg text-gray-500">Loading data...</p>
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
            <svg
              ref={svgRef}
              width={1200}
              height={600}
              className="bg-white rounded-lg shadow-lg"
            />
          </div>
          
          {/* Progress indicator */}
          <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg">
            <div className="text-sm text-gray-600">Scroll Progress</div>
            <div className="w-32 h-2 bg-gray-200 rounded-full mt-2">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${scrollProgress * 100}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Section {Math.min(Math.floor(scrollProgress * sections.length) + 1, sections.length)} of {sections.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
