<script>
import { onMount } from 'svelte';
import * as d3 from 'd3';

  let data = [];
  let loading = true;
  let scrollProgress = 0;
  let axisProgress = 0;
  let selectedPoint = null;
  let svgRef;
  let canvasRef;
  let scrollContainer;
  let axisFrame = null;
  let activeSection = null;
  let prevShowTooltip = true;

  const thresholds = [70000,120000,240000,350000,500000,1000000,2000000,3000000,5000000,7000000];
  const sections = thresholds.map((threshold,i)=>({
    threshold,
    title: `Annotation ${i+1}`,
    annotationTarget:{ income: threshold*0.5, percentChange:0 }
  }));

  async function loadData(){
    try {
      const response = await fetch(new URL('./data/household_tax_income_changes_sample.json', import.meta.url));
      const json = await response.json();
      const parsed = json.map((d,i)=>({
        ...d,
        id:i,
        isAnnotated:false,
        sectionIndex:null
      }));
      sections.forEach((section,index)=>{
        let closest=null; let minDistance=Infinity;
        parsed.forEach(d=>{
          const dx=d.pct_change-section.annotationTarget.percentChange;
          const dy=d.income-section.annotationTarget.income;
          const distance=Math.abs(dx)+Math.abs(dy)/1000;
          if(distance<minDistance){minDistance=distance; closest=d;}
        });
        if(closest){closest.isAnnotated=true; closest.sectionIndex=index;}
      });
      data=parsed;
      loading=false;
    } catch(e){
      console.error('Error loading data:',e);
      loading=false;
    }
  }

  onMount(() => {
    loadData();

    const handleScroll = throttle(() => {
      if(!scrollContainer) return;
      const {scrollTop,scrollHeight,clientHeight} = scrollContainer;
      const maxScroll = scrollHeight - clientHeight;
      const progress = Math.min(scrollTop / maxScroll, 1);
      scrollProgress = progress;
    },50);
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  });

  function throttle(fn,wait){
    let last=0; return (...args)=>{const now=Date.now(); if(now-last>=wait){last=now; fn(...args);} };
  }

  $: handleAxisAnimation();

  function handleAxisAnimation(){
    const sectionDuration = 1/sections.length;
    const currentSectionIndex = Math.min(Math.floor(scrollProgress/sectionDuration), sections.length-1);
    const sectionProg = (scrollProgress % sectionDuration)/sectionDuration;
    const showTooltip = sectionProg < 0.3;

    if(!showTooltip && (prevShowTooltip || activeSection !== currentSectionIndex)){
      activeSection = currentSectionIndex;
      const start = performance.now();
      const duration = 3000;
      if(axisFrame) cancelAnimationFrame(axisFrame);
      const animate = now => {
        const t = Math.min((now-start)/duration,1);
        axisProgress = d3.easeExpOut(t);
        if(t<1){ axisFrame = requestAnimationFrame(animate); } else { axisFrame=null; }
      };
      axisFrame = requestAnimationFrame(animate);
    } else if(showTooltip && !prevShowTooltip){
      if(axisFrame){ cancelAnimationFrame(axisFrame); axisFrame=null; }
      axisProgress=0; activeSection=null;
    }
    prevShowTooltip = showTooltip;
  }

  function getScrollState(progress, axisVal = axisProgress){
    const sectionDuration = 1/sections.length;
    const currentSectionIndex = Math.min(Math.floor(progress/sectionDuration), sections.length-1);
    const sectionProgress = (progress % sectionDuration)/sectionDuration;
    const showTooltip = sectionProgress < 0.3;
    const axisAnimationProgress = showTooltip ? 0 : axisVal;
    let currentDataSection=currentSectionIndex;
    if(!showTooltip && currentSectionIndex < sections.length-1){ currentDataSection = currentSectionIndex + axisAnimationProgress; }
    return { currentSectionIndex, showTooltip, axisAnimationProgress, currentDataSection, sectionProgress };
  }

  const fixedXDomains = [[-40,40],[-30,30],[-20,20]];
  const getFixedDomain = idx => (idx<2?fixedXDomains[idx]:fixedXDomains[2]);

  function getInterpolatedValues(sectionProgress){
    const currentIndex = Math.floor(sectionProgress);
    const nextIndex = Math.min(currentIndex+1, sections.length-1);
    const t = sectionProgress - currentIndex;
    const computeStats=i=>{ const sec=sections[i]; const list=data.filter(d=>d.income<=sec.threshold); const total=list.length; if(!total) return {yMax:sec.threshold,gainedPercent:0,lostPercent:0,noChangePercent:0}; const gain=list.filter(d=>d.net_change>0).length; const loss=list.filter(d=>d.net_change<0).length; const yMax=sec.threshold; const gained=Math.round(gain/total*100); const lost=Math.round(loss/total*100); return {yMax,gainedPercent:gained,lostPercent:lost,noChangePercent:100-gained-lost}; };
    const curr=computeStats(currentIndex); const [currMin,currMax]=getFixedDomain(currentIndex);
    if(t>0 && currentIndex!==nextIndex){
      const nextStats=computeStats(nextIndex); const [nextMin,nextMax]=getFixedDomain(nextIndex); const interpY=d3.interpolate(curr.yMax,nextStats.yMax)(t);
      return {
        xMin:d3.interpolate(currMin,nextMin)(t),
        xMax:d3.interpolate(currMax,nextMax)(t),
        yMax:interpY,
        threshold:interpY,
        gainedPercent:Math.round(d3.interpolate(curr.gainedPercent,nextStats.gainedPercent)(t)),
        lostPercent:Math.round(d3.interpolate(curr.lostPercent,nextStats.lostPercent)(t)),
        noChangePercent:Math.round(d3.interpolate(curr.noChangePercent,nextStats.noChangePercent)(t)),
        currentIndex,
        nextIndex,
        t
      };
    }
    return {
      xMin:currMin,
      xMax:currMax,
      yMax:curr.yMax,
      threshold:curr.yMax,
      gainedPercent:curr.gainedPercent,
      lostPercent:curr.lostPercent,
      noChangePercent:curr.noChangePercent,
      currentIndex,
      nextIndex:currentIndex,
      t:0
    };
  }

  $: updateVisualization();

  function updateVisualization(){
    if(!data.length || !svgRef) return;
    const scrollState = getScrollState(scrollProgress, axisProgress);
    const currentSectionIndex = scrollState.currentSectionIndex;
    const svg = d3.select(svgRef);
    const width=1200; const height=600; const margin={top:50,right:100,bottom:50,left:100};
    const plotWidth=width-margin.left-margin.right; const plotHeight=height-margin.top-margin.bottom;
    svg.selectAll('*').remove();
    const interpolated = getInterpolatedValues(scrollState.currentDataSection);
    const xScale = d3.scaleLinear().domain([interpolated.xMin,interpolated.xMax]).range([0,plotWidth]);
    const yScale = d3.scaleLinear().domain([0,interpolated.yMax]).range([plotHeight,0]);
    const distortY=y=>{
      if(scrollState.axisAnimationProgress>0 && interpolated.t>0){
        const normalized=y/interpolated.yMax; const bend=Math.sin(interpolated.t*Math.PI)*0.3; const distortion=Math.pow(normalized,1+bend); return yScale(distortion*interpolated.yMax); }
      return yScale(y);
    };
    const g=svg.append('g').attr('transform',`translate(${margin.left},${margin.top})`);
    const clip=g.append('defs').append('clipPath').attr('id','plot-clip');
    clip.append('rect').attr('width',plotWidth).attr('height',plotHeight);
    const yTicks=yScale.ticks(8);
    g.append('g').attr('class','grid y-grid').selectAll('line').data(yTicks).enter().append('line').attr('x1',0).attr('x2',plotWidth).attr('y1',d=>distortY(d)).attr('y2',d=>distortY(d)).style('stroke','#cbd5e1').style('stroke-width',1.5).style('stroke-dasharray','4,4').style('opacity',0.7);
    const xTicks=xScale.ticks(10);
    const xGrid=g.append('g').attr('class','grid x-grid').selectAll('line').data(xTicks).enter().append('line').attr('x1',d=>xScale(d)).attr('x2',d=>xScale(d)).attr('y1',0).attr('y2',plotHeight).style('stroke','#cbd5e1').style('stroke-width',1.5).style('stroke-dasharray','4,4').style('opacity',0.7).transition().duration(1000).ease(d3.easeExpOut).attr('x1',d=>xScale(d)).attr('x2',d=>xScale(d));
    xGrid.attr('x1',d=>xScale(d)).attr('x2',d=>xScale(d));
    const xAxisG=g.append('g').attr('transform',`translate(0,${plotHeight})`);
    xAxisG.transition().duration(1000).ease(d3.easeExpOut).call(d3.axisBottom(xScale).tickFormat(d=>`${d}%`));
    const yAxisG=g.append('g');
    yAxisG.call(d3.axisLeft(yScale).ticks(8).tickFormat(d=>`${d3.format(',')(d)}`));
    if(scrollState.axisAnimationProgress>0 && interpolated.t>0){
      const zeroLine=d3.line().x(xScale(0)).y((d,i)=>distortY(i*interpolated.yMax/50)).curve(d3.curveMonotoneY);
      g.append('path').datum(d3.range(51)).attr('d',zeroLine).style('stroke','black').style('stroke-width',2).style('fill','none');
    } else {
      g.append('line').attr('x1',xScale(0)).attr('x2',xScale(0)).attr('y1',0).attr('y2',plotHeight).style('stroke','black').style('stroke-width',2);
    }
    const ctx = canvasRef.getContext('2d');
    ctx.clearRect(0,0,width,height);
    const visibleData = data.filter(d=>d.income<=interpolated.threshold*1.2);
    visibleData.forEach(d=>{
      const r=d.isAnnotated && d.sectionIndex===scrollState.currentSectionIndex?5:2;
      const x=margin.left+xScale(d.pct_change);
      const y=margin.top+distortY(d.income);
      let opacity=0.6;
      if(d.isAnnotated && d.sectionIndex===scrollState.currentSectionIndex){opacity=1;}
      else if(d.income>interpolated.threshold){opacity=0.1;}
      else{ const fadeZone=interpolated.threshold*0.2; if(d.income>interpolated.threshold-fadeZone){opacity=0.6*(1-(d.income-(interpolated.threshold-fadeZone))/fadeZone);} }
      ctx.beginPath();
      ctx.arc(x,y,r,0,Math.PI*2);
      ctx.fillStyle=d.pct_change>0?'#10b981':'#ef4444';
      ctx.globalAlpha=opacity;
      ctx.fill();
      if(d.isAnnotated && d.sectionIndex===scrollState.currentSectionIndex){ ctx.lineWidth=2; ctx.strokeStyle='white'; ctx.stroke(); }
    });
    ctx.globalAlpha=1;
    if(selectedPoint){
      const x=margin.left+xScale(selectedPoint.pct_change);
      const y=margin.top+distortY(selectedPoint.income);
      ctx.beginPath();
      ctx.arc(x,y,8,0,Math.PI*2);
      ctx.strokeStyle=selectedPoint.pct_change>0?'#10b981':'#ef4444';
      ctx.lineWidth=2;
      ctx.globalAlpha=0.5;
      ctx.stroke();
      ctx.globalAlpha=1;
    }
    svg.append('text').attr('x',width/2).attr('y',20).attr('text-anchor','middle').style('font-size','16px').style('font-weight','bold').text(`Gained Money ${interpolated.gainedPercent}%  Lost Money ${interpolated.lostPercent}%  No Change ${interpolated.noChangePercent}%`);
    svg.on('click',()=>{ if(selectedPoint){ selectedPoint=null; } });
    if(scrollState.showTooltip){
      let pointToShow=selectedPoint;
      if(pointToShow && pointToShow.income>interpolated.threshold){ pointToShow=null; selectedPoint=null; }
      if(!pointToShow){ pointToShow=data.find(d=>d.isAnnotated && d.sectionIndex===scrollState.currentSectionIndex); }
      if(pointToShow && pointToShow.pct_change>=interpolated.xMin && pointToShow.pct_change<=interpolated.xMax && pointToShow.income<=interpolated.yMax){
        const x=xScale(pointToShow.pct_change); const y=distortY(pointToShow.income);
        const tooltipX = x>plotWidth/2 ? x-260 : x+20; const tooltipY = y<100 ? y+20 : y-120;
        const tooltipG=g.append('g').attr('transform',`translate(${tooltipX}, ${tooltipY})`);
        tooltipG.append('rect').attr('width',240).attr('height',100).attr('rx',5).style('fill','white').style('stroke','#e5e7eb').style('stroke-width',2).style('filter','drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))');
        g.append('line').attr('x1',x).attr('y1',y).attr('x2',tooltipX+(x>plotWidth/2?240:0)).attr('y2',tooltipY+50).style('stroke','#6b7280').style('stroke-width',1).style('stroke-dasharray','2,2');
        const income=d3.format('$,.0f')(pointToShow.income);
        const changeValue=pointToShow.pct_change; const change=(changeValue>=0?'+':'')+d3.format('.1%')(changeValue/100); const dollarValue=pointToShow.net_change; const dollarChange=(dollarValue>=0?'+':'')+d3.format('$,.0f')(Math.abs(dollarValue));
        tooltipG.append('text').attr('x',10).attr('y',20).style('font-size','14px').style('font-weight','bold').text(`Household Income: ${income}`);
        tooltipG.append('text').attr('x',10).attr('y',40).style('font-size','13px').text(`Net Income Change: ${change}`);
        tooltipG.append('text').attr('x',10).attr('y',60).style('font-size','13px').text(`Dollar Impact: ${dollarChange}`);
        tooltipG.append('text').attr('x',10).attr('y',85).style('font-size','11px').style('fill','#6b7280').text(selectedPoint?'Selected household':'Example household');
      }
      svg.append('text').attr('x',width/2).attr('y',height-10).attr('text-anchor','middle').style('font-size','14px').style('fill','#4b5563').text(sections[scrollState.currentSectionIndex].title);
    }
  }

  function handleCanvasClick(event){
    const canvas=canvasRef; const width=1200; const height=600; const margin={top:50,right:100,bottom:50,left:100}; const plotWidth=width-margin.left-margin.right; const plotHeight=height-margin.top-margin.bottom;
    const rect=canvas.getBoundingClientRect(); const scaleX=canvas.width/rect.width; const scaleY=canvas.height/rect.height;
    const xPos=(event.clientX-rect.left)*scaleX - margin.left; const yPos=(event.clientY-rect.top)*scaleY - margin.top;
    const scrollState=getScrollState(scrollProgress,axisProgress); const interpolated=getInterpolatedValues(scrollState.currentDataSection);
    const xScale=d3.scaleLinear().domain([interpolated.xMin,interpolated.xMax]).range([0,plotWidth]);
    const yScale=d3.scaleLinear().domain([0,interpolated.yMax]).range([plotHeight,0]);
    const distortY=y=>{ if(scrollState.axisAnimationProgress>0 && interpolated.t>0){const normalized=y/interpolated.yMax; const bend=Math.sin(interpolated.t*Math.PI)*0.3; const distortion=Math.pow(normalized,1+bend); return yScale(distortion*interpolated.yMax);} return yScale(y); };
    if(!scrollState.showTooltip){ if(selectedPoint) selectedPoint=null; return; }
    const visibleData=data.filter(d=>d.income<=interpolated.threshold*1.2);
    let nearest=null; let minDist=10;
    visibleData.forEach(d=>{ const dx=xScale(d.pct_change)-xPos; const dy=distortY(d.income)-yPos; const dist=Math.sqrt(dx*dx+dy*dy); if(dist<minDist){minDist=dist; nearest=d;} });
    if(nearest){ selectedPoint={...nearest}; } else if(selectedPoint){ selectedPoint=null; }
  }

  onMount(()=>{ canvasRef.addEventListener('click', handleCanvasClick); return ()=>canvasRef.removeEventListener('click',handleCanvasClick); });
</script>

<div class="w-full h-screen bg-gray-50 relative">
  {#if loading}
  <div class="absolute inset-0 flex flex-col items-center justify-center space-y-4 bg-gray-50 z-10">
    <svg class="animate-spin h-12 w-12 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
    <p class="text-gray-600 text-lg">Loading data...</p>
  </div>
  {/if}
  <div bind:this={scrollContainer} class="w-full h-full overflow-y-scroll">
    <div style="height: {sections.length * 150}vh" class="relative">
      <div class="sticky top-0 w-full h-screen flex items-center justify-center">
        <div class="relative w-full h-screen">
          <canvas bind:this={canvasRef} width="1200" height="600" class="absolute top-0 left-0 w-full h-full bg-white rounded-lg shadow-lg"></canvas>
          <svg bind:this={svgRef} viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid meet" class="absolute top-0 left-0 w-full h-full pointer-events-none"></svg>
        </div>
      </div>
    </div>
  </div>
</div>
