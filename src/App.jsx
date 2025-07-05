import React, { useState, useEffect, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import * as d3 from 'd3';

const App = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [randomHouseholds, setRandomHouseholds] = useState({});
  const svgRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const animatedNumbersRef = useRef(new Map());

  // BASIC DEBUG
  console.log('APP COMPONENT RENDERING');
  
  useEffect(() => {
    console.log('APP MOUNTED');
    alert('App is loading - if you see this, React is working');
  }, []);

  // Define the sections with their income thresholds and messages
  const thresholds = [70000, 120000, 240000, 350000, 500000, 1000000, 2000000, 3000000, 5000000, 7000000];
  const sections = thresholds.map((threshold, i) => ({
    threshold,
    title: `Annotation ${i + 1}`,
    annotationTarget: { income: threshold * 0.5, percentChange: 0 }
  }));

  // Animated number utility function
  const createAnimatedNumber = useCallback((element, startValue, endValue, formatter, duration = 800) => {
    const key = `${element.attr('id') || Math.random()}`;
    
    // Cancel any existing animation for this element
    if (animatedNumbersRef.current.has(key)) {
      animatedNumbersRef.current.get(key).interrupt();
    }
    
    const interpolator = d3.interpolate(startValue, endValue);
    const transition = d3.transition().duration(duration).ease(d3.easeCubicOut);
    
    const animation = transition.tween('text', () => {
      return (t) => {
        const value = interpolator(t);
        element.text(formatter(value));
      };
    });
    
    animatedNumbersRef.current.set(key, animation);
    return animation;
  }, []);

  // Enhanced formatting functions with animation support
  const formatCurrency = useCallback((value) => d3.format('$,.0f')(value), []);
  const formatPercentage = useCallback((value) => (value >= 0 ? '+' : '') + d3.format('.1%')(value / 100), []);
  const formatDollarChange = useCallback((value) => (value >= 0 ? '+' : '') + d3.format('$,.0f')(Math.abs(value)), []);
  const formatInteger = useCallback((value) => Math.round(value), []);

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

        // Select random households for each section
        const randomHouseholdsMap = {};
        sections.forEach((section, index) => {
          const householdsInSection = parsed.filter(d => d['Gross Income'] <= section.threshold);
          if (householdsInSection.length > 0) {
            const randomIndex = Math.floor(Math.random() * householdsInSection.length);
            randomHouseholdsMap[index] = householdsInSection[randomIndex];
          }
        });

        setData(parsed);
        setRandomHouseholds(randomHouseholdsMap);
        setLoading(false);
      } catch (error) {
        console.error('Error loading CSV data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Clear selected point when section changes
  useEffect(() => {
    const scrollState = getScrollState(scrollProgress);
    
    // Clear selection when moving to a new section or during axis animation
    if (selectedPoint && !scrollState.showGroupView) {
      setSelectedPoint(null);
    }
  }, [scrollProgress]);

  // Generate prose summary for a household with animated numbers
  const generateHouseholdSummary = (household, previousHousehold = null) => {
    if (!household) return '';
    
    const income = household['Gross Income'];
    const baselineNetIncome = household['Baseline Net Income'];
    const changeInNetIncome = household['Total Change in Net Income'];
    const percentChange = household['Percentage Change in Net Income'];
    const householdSize = household['Household Size'];
    const isMarried = household['Is Married'];
    const numDependents = household['Number of Dependents'];
    const age = household['Age of Head'];
    const state = household['State'];
    
    const familyStructure = isMarried ? 
      (numDependents > 0 ? `married couple with ${numDependents} dependent${numDependents > 1 ? 's' : ''}` : 'married couple') :
      (numDependents > 0 ? `single parent with ${numDependents} dependent${numDependents > 1 ? 's' : ''}` : 'single person');
    
    const incomeDescription = income < 50000 ? 'low-income' :
                            income < 100000 ? 'middle-income' :
                            income < 500000 ? 'upper-middle-income' : 'high-income';
    
    const changeDescription = Math.abs(changeInNetIncome) < 100 ? 'minimal' :
                            Math.abs(changeInNetIncome) < 1000 ? 'modest' :
                            Math.abs(changeInNetIncome) < 5000 ? 'significant' : 'substantial';
    
    const gainOrLoss = changeInNetIncome > 0 ? 'gains' : 'loses';
    
    return {
      staticText: `This ${incomeDescription} household is a ${familyStructure} living in ${state}. The head of household is ${age} years old. 
      
      Under the baseline tax system, this household has a gross income of `,
      income: income,
      midText: ` and a net income of `,
      baselineNetIncome: baselineNetIncome,
      endText: `.
      
      After the proposed tax reforms, this household ${gainOrLoss} `,
      changeInNetIncome: Math.abs(changeInNetIncome),
      finalText: ` annually, representing a ${changeDescription} ${Math.abs(percentChange).toFixed(1)}% ${changeInNetIncome > 0 ? 'increase' : 'decrease'} in their net income.`
    };
  };

  // Handle scroll events
  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const maxScroll = scrollHeight - clientHeight;
      const progress = Math.min(scrollTop / maxScroll, 1);
      
      console.log('SCROLL EVENT:', scrollTop, maxScroll, progress);
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
    
    // Split each section into two parts:
    // First 50% of each section: show group view with tooltip
    // Next 30%: show individual household view with fade transition
    // Last 20%: animate axis
    const showGroupView = sectionProgress < 0.5;
    const showIndividualView = sectionProgress >= 0.5 && sectionProgress < 0.8;
    const axisAnimationProgress = sectionProgress >= 0.8 ? (sectionProgress - 0.8) / 0.2 : 0;
    
    // Calculate fade opacity for transition between group and individual view
    const individualTransitionProgress = showIndividualView ? (sectionProgress - 0.5) / 0.3 : 0;
    const groupFadeOpacity = showIndividualView ? Math.max(0.1, 1 - individualTransitionProgress) : 1;
    
    let currentDataSection = currentSectionIndex;
    if (axisAnimationProgress > 0 && currentSectionIndex < sections.length - 1) {
      currentDataSection = currentSectionIndex + axisAnimationProgress;
    }
    
    const result = {
      currentSectionIndex,
      showGroupView,
      showIndividualView,
      axisAnimationProgress,
      currentDataSection,
      sectionProgress,
      individualTransitionProgress,
      groupFadeOpacity
    };
    
    // Debug output
    console.log('Section progress:', sectionProgress.toFixed(3), 'Show individual:', showIndividualView);
    console.log('Progress:', progress, 'Current section:', currentSectionIndex);
    
    return result;
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
      const list = data.filter(d => d['Gross Income'] <= sec.threshold);
      const total = list.length;
      if (!total) return { yMax: sec.threshold, gainedPercent: 0, lostPercent: 0, noChangePercent: 0 };
      const gainCount = list.filter(d => d['Total Change in Net Income'] > 0).length;
      const lossCount = list.filter(d => d['Total Change in Net Income'] < 0).length;
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
    prevSectionRef.current = getScrollState(scrollProgress).currentSectionIndex;
    if (!data.length || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = 1200;
    const height = 600;
    const margin = { top: 50, right: 100, bottom: 50, left: 100 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    // Clear previous content
    svg.selectAll('*').remove();
    
    // BASIC DEBUG - THIS SHOULD ALWAYS SHOW
    console.log('VISUALIZATION RENDER CALLED!');

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
      .duration(100)
      .ease(d3.easeQuadOut)
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d));

    // Grid lines are static; X morphs with scroll, Y morphs with axis transition below
    xGrid.attr('x1', d => xScale(d)).attr('x2', d => xScale(d));

    // Add axes (animated during axis animation)
    const xAxisG = g.append('g')
      .attr('transform', `translate(0,${plotHeight})`);

    // X-axis with animated numbers
    xAxisG.transition()
      .duration(100)
      .ease(d3.easeQuadOut)
      .call(d3.axisBottom(xScale).tickFormat(d => `${d}%`))
      .selectAll('text')
      .style('opacity', 0)
      .transition()
      .delay(50)
      .duration(300)
      .style('opacity', 1);

    const yAxisG = g.append('g');
    // Y-axis with animated numbers
    if (prevSectionRef.current === 0 && scrollState.currentSectionIndex === 1 && !yTransitionDone.current) {
      yTransitionDone.current = true;
      d3.select(yAxisG.node())
        .transition()
        .duration(2000)
        .ease(d3.easeQuadIn)
        .call(d3.axisLeft(yScale).ticks(8).tickFormat(d => `${d3.format(',')(d)}`))
        .selectAll('text')
        .style('opacity', 0)
        .transition()
        .delay(500)
        .duration(800)
        .style('opacity', 1);
    } else {
      yAxisG.call(d3.axisLeft(yScale).ticks(8).tickFormat(d => `${d3.format(',')(d)}`))
        .selectAll('text')
        .style('opacity', 0)
        .transition()
        .duration(400)
        .style('opacity', 1);
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
        // Special highlighting for current section's annotated point
        if (d.isAnnotated && d.sectionIndex === scrollState.currentSectionIndex) return 1;
        
        // Handle random household highlighting during individual view
        const randomHousehold = randomHouseholds[scrollState.currentSectionIndex];
        const isRandomHousehold = randomHousehold && d.id === randomHousehold.id;
        
        if (scrollState.showIndividualView && isRandomHousehold) {
          return 1; // Highlight the random household
        }
        
        // Apply group fade opacity during individual view transition
        let baseOpacity = 0.6;
        if (scrollState.showIndividualView && !isRandomHousehold) {
          baseOpacity *= scrollState.groupFadeOpacity;
        }
        
        // Standard income-based fading
        const income = d['Gross Income'];
        if (income > interpolated.threshold) return 0.1;
        const fadeZone = interpolated.threshold * 0.2;
        if (income > interpolated.threshold - fadeZone) {
          return baseOpacity * (1 - (income - (interpolated.threshold - fadeZone)) / fadeZone);
        }
        return baseOpacity;
      })
      .on('click', function(event, d) {
        event.stopPropagation();
        // Only allow selection if group view is visible
        if (scrollState.showGroupView) {
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

    // Add title with animated statistics
    const titleElement = svg.append('text')
      .attr('x', width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .attr('id', 'title-stats');

    // Get previous values for animation
    const prevStats = titleElement.datum() || { gainedPercent: 0, lostPercent: 0, noChangePercent: 0 };
    
    // Store current values for next animation
    titleElement.datum(interpolated);
    
    // Animate the title text
    const titleFormatter = (data) => `Gained Money ${formatInteger(data.gainedPercent)}%  Lost Money ${formatInteger(data.lostPercent)}%  No Change ${formatInteger(data.noChangePercent)}%`;
    
    createAnimatedNumber(titleElement, prevStats, interpolated, titleFormatter, 600);

    // BASIC DEBUG TEXT - THIS SHOULD ALWAYS SHOW
    svg.append('text')
      .attr('x', 10)
      .attr('y', 50)
      .style('font-size', '16px')
      .style('fill', 'red')
      .style('font-weight', 'bold')
      .text('DEBUG: APP IS WORKING');

    // Add click handler to background to clear selection
    svg.on('click', () => {
      if (selectedPoint) {
        setSelectedPoint(null);
      }
    });

    // Add tooltip annotation for group view
    if (scrollState.showGroupView) {
      
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

        // Tooltip content with animated numbers
        const incomeElement = tooltipG.append('text')
          .attr('x', 10)
          .attr('y', 20)
          .style('font-size', '14px')
          .style('font-weight', 'bold')
          .attr('id', 'tooltip-income');
        
        const changeElement = tooltipG.append('text')
          .attr('x', 10)
          .attr('y', 40)
          .style('font-size', '13px')
          .attr('id', 'tooltip-change');
        
        const dollarElement = tooltipG.append('text')
          .attr('x', 10)
          .attr('y', 60)
          .style('font-size', '13px')
          .attr('id', 'tooltip-dollar');

        // Get previous values for animation (from the element's data)
        const prevTooltipData = incomeElement.datum() || { 
          income: 0, 
          changeValue: 0, 
          dollarValue: 0 
        };
        
        const currentTooltipData = {
          income: pointToShow['Gross Income'],
          changeValue: pointToShow['Percentage Change in Net Income'],
          dollarValue: pointToShow['Total Change in Net Income']
        };

        // Store current values for next animation
        incomeElement.datum(currentTooltipData);
        changeElement.datum(currentTooltipData);
        dollarElement.datum(currentTooltipData);
        
        // Animate tooltip numbers
        createAnimatedNumber(incomeElement, prevTooltipData.income, currentTooltipData.income, 
          (val) => `Household Income: ${formatCurrency(val)}`, 500);
        
        createAnimatedNumber(changeElement, prevTooltipData.changeValue, currentTooltipData.changeValue, 
          (val) => `Net Income Change: ${formatPercentage(val)}`, 500);
        
        createAnimatedNumber(dollarElement, prevTooltipData.dollarValue, currentTooltipData.dollarValue, 
          (val) => `Dollar Impact: ${formatDollarChange(val)}`, 500);
        
        tooltipG.append('text')
          .attr('x', 10)
          .attr('y', 85)
          .style('font-size', '11px')
          .style('fill', '#6b7280')
          .text(selectedPoint ? 'Selected household' : 'Example household');
      }
    }

    // Add individual household prose summary
    if (scrollState.showIndividualView) {
      console.log('INDIVIDUAL VIEW TRIGGERED!');
      console.log('Current section:', scrollState.currentSectionIndex);
      console.log('Random households:', randomHouseholds);
      const randomHousehold = randomHouseholds[scrollState.currentSectionIndex];
      console.log('Selected household:', randomHousehold);
      if (randomHousehold && 
          randomHousehold['Percentage Change in Net Income'] >= interpolated.xMin && 
          randomHousehold['Percentage Change in Net Income'] <= interpolated.xMax &&
          randomHousehold['Gross Income'] <= interpolated.yMax) {
        console.log('HOUSEHOLD PANEL SHOULD DISPLAY!');
        
        const x = xScale(randomHousehold['Percentage Change in Net Income']);
        const y = distortY(randomHousehold['Gross Income']);
        
        // Add prose summary panel
        const summaryWidth = 400;
        const summaryHeight = 200;
        const summaryX = plotWidth - summaryWidth - 20;
        const summaryY = 20;
        
        const summaryG = g.append('g')
          .attr('transform', `translate(${summaryX}, ${summaryY})`);

        // Summary background
        summaryG.append('rect')
          .attr('width', summaryWidth)
          .attr('height', summaryHeight)
          .attr('rx', 10)
          .style('fill', 'rgba(255, 255, 255, 0.95)')
          .style('stroke', '#e5e7eb')
          .style('stroke-width', 2)
          .style('filter', 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.15))');

        // Highlight the random household
        g.append('circle')
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', 10)
          .style('fill', 'none')
          .style('stroke', randomHousehold['Percentage Change in Net Income'] > 0 ? '#10b981' : '#ef4444')
          .style('stroke-width', 3)
          .style('opacity', 0.8);

        // Add prose summary text with animated numbers
        const summary = generateHouseholdSummary(randomHousehold);
        const lineHeight = 16;
        let currentY = 25;
        
        summaryG.append('text')
          .attr('x', 15)
          .attr('y', currentY)
          .style('font-size', '14px')
          .style('font-weight', 'bold')
          .style('fill', '#374151')
          .text('Individual Household Profile');
        
        currentY += 25;
        
        // Static text part 1
        const staticText1 = summaryG.append('text')
          .attr('x', 15)
          .attr('y', currentY)
          .style('font-size', '12px')
          .style('fill', '#4b5563')
          .text(summary.staticText);
        
        currentY += lineHeight * 3;
        
        // Animated income value
        const incomeElement = summaryG.append('text')
          .attr('x', 15)
          .attr('y', currentY)
          .style('font-size', '12px')
          .style('fill', '#059669')
          .style('font-weight', 'bold')
          .attr('id', 'summary-income');
        
        const prevIncome = incomeElement.datum() || 0;
        incomeElement.datum(summary.income);
        createAnimatedNumber(incomeElement, prevIncome, summary.income, formatCurrency, 600);
        
        // Middle text
        summaryG.append('text')
          .attr('x', 120)
          .attr('y', currentY)
          .style('font-size', '12px')
          .style('fill', '#4b5563')
          .text(summary.midText);
        
        // Animated baseline income
        const baselineElement = summaryG.append('text')
          .attr('x', 220)
          .attr('y', currentY)
          .style('font-size', '12px')
          .style('fill', '#059669')
          .style('font-weight', 'bold')
          .attr('id', 'summary-baseline');
        
        const prevBaseline = baselineElement.datum() || 0;
        baselineElement.datum(summary.baselineNetIncome);
        createAnimatedNumber(baselineElement, prevBaseline, summary.baselineNetIncome, formatCurrency, 600);
        
        currentY += lineHeight * 2;
        
        // End text part 1
        summaryG.append('text')
          .attr('x', 15)
          .attr('y', currentY)
          .style('font-size', '12px')
          .style('fill', '#4b5563')
          .text(summary.endText);
        
        currentY += lineHeight;
        
        // Animated change amount
        const changeElement = summaryG.append('text')
          .attr('x', 15)
          .attr('y', currentY)
          .style('font-size', '12px')
          .style('fill', summary.changeInNetIncome > 0 ? '#059669' : '#dc2626')
          .style('font-weight', 'bold')
          .attr('id', 'summary-change');
        
        const prevChange = changeElement.datum() || 0;
        changeElement.datum(summary.changeInNetIncome);
        createAnimatedNumber(changeElement, prevChange, summary.changeInNetIncome, formatCurrency, 600);
        
        // Final text
        summaryG.append('text')
          .attr('x', 80)
          .attr('y', currentY)
          .style('font-size', '12px')
          .style('fill', '#4b5563')
          .text(summary.finalText);
      }
    }

    // Add explanatory text at bottom
    if (scrollState.showGroupView || scrollState.showIndividualView) {
      const currentSection = sections[scrollState.currentSectionIndex];
      const viewType = scrollState.showGroupView ? 'Group Overview' : 'Individual Household';
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height - 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', '#4b5563')
        .text(`${currentSection.title} - ${viewType} (Progress: ${scrollState.sectionProgress.toFixed(2)})`);
    }

    // Add debug indicator for individual view
    if (scrollState.showIndividualView) {
      svg.append('rect')
        .attr('x', 10)
        .attr('y', 10)
        .attr('width', 200)
        .attr('height', 30)
        .style('fill', 'red')
        .style('opacity', 0.7);
      
      svg.append('text')
        .attr('x', 15)
        .attr('y', 30)
        .style('font-size', '14px')
        .style('fill', 'white')
        .style('font-weight', 'bold')
        .text('INDIVIDUAL VIEW ACTIVE');
    }

    // Always show debug info
    svg.append('text')
      .attr('x', 10)
      .attr('y', height - 50)
      .style('font-size', '12px')
      .style('fill', 'black')
      .text(`Progress: ${scrollProgress.toFixed(3)} | Section: ${scrollState.currentSectionIndex} | Individual: ${scrollState.showIndividualView}`);
      
    console.log('RENDER UPDATE:', scrollProgress, scrollState.showIndividualView);

  }, [data, scrollProgress, selectedPoint, randomHouseholds]);

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
        <div style={{ height: `${sections.length * 200}vh` }} className="relative">
          {/* Fixed visualization container */}
          <div className="sticky top-0 w-full h-screen flex items-center justify-center">
            <svg
              ref={svgRef}
              viewBox="0 0 1200 600"
              preserveAspectRatio="xMidYMid meet"
              className="w-full h-screen bg-white rounded-lg shadow-lg"
            />
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default App;
