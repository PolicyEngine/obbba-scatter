import { y as ensure_array_like, z as head, A as attr_class, F as attr, x as escape_html, G as stringify, v as pop, t as push } from "../../chunks/index.js";
import "papaparse";
import "d3";
function html(value) {
  var html2 = String(value ?? "");
  var open = "<!---->";
  return open + html2 + "<!---->";
}
function _page($$payload, $$props) {
  push();
  let data = [];
  let randomHouseholds = {};
  let animatedNumbers = /* @__PURE__ */ new Map();
  const baseViews = [
    {
      id: "intro",
      title: "How tax changes affect every American household",
      groupText: "Each dot represents a household, positioned by their income and how much they gain or lose under the proposed tax changes. Green dots show households that benefit, red shows those that face increases.",
      view: {
        xDomain: [-15, 15],
        yDomain: [0, 35e4],
        filter: (d) => d["Gross Income"] < 35e4,
        highlightGroup: null
      }
    },
    {
      id: "middle-class",
      title: "Middle-class families see mixed results",
      groupText: "For families earning between $50,000 and $150,000 — the heart of America's middle class — the picture is complex. While some see modest gains, others face tax increases that could impact their family budgets.",
      view: {
        xDomain: [-10, 20],
        yDomain: [5e4, 15e4],
        filter: (d) => d["Gross Income"] >= 5e4 && d["Gross Income"] < 15e4,
        highlightGroup: "middle"
      }
    },
    {
      id: "upper-middle",
      title: "Upper-middle class faces the biggest swings",
      groupText: "Households earning $150,000 to $400,000 experience the most dramatic variation in outcomes. This group includes many professionals, small business owners, and dual-income families in expensive areas.",
      view: {
        xDomain: [-25, 25],
        yDomain: [15e4, 4e5],
        filter: (d) => d["Gross Income"] >= 15e4 && d["Gross Income"] < 4e5,
        highlightGroup: "upper-middle"
      }
    },
    {
      id: "high-earners",
      title: "High earners see significant increases",
      groupText: "The top 5% of earners — those making $400,000 to $1 million — face substantial tax increases under most scenarios. This group contributes a large share of total tax revenue.",
      view: {
        xDomain: [-40, 40],
        yDomain: [4e5, 1e6],
        filter: (d) => d["Gross Income"] >= 4e5 && d["Gross Income"] < 1e6,
        highlightGroup: "high"
      }
    },
    {
      id: "ultra-wealthy",
      title: "The ultra-wealthy face the largest changes",
      groupText: "Millionaire households represent less than 1% of Americans but show the most extreme policy effects. Some face tax increases exceeding 50% of their current liability.",
      view: {
        xDomain: [-60, 60],
        yDomain: [1e6, 1e7],
        filter: (d) => d["Gross Income"] >= 1e6,
        highlightGroup: "ultra"
      }
    }
  ];
  const scrollStates = [];
  baseViews.forEach((baseView, index) => {
    scrollStates.push({ ...baseView, text: baseView.groupText, viewType: "group" });
    if (index > 0) {
      scrollStates.push({
        ...baseView,
        id: baseView.id + "-individual",
        title: baseView.title + " — individual profile",
        text: "Meet a specific household affected by these changes.",
        viewType: "individual"
      });
    }
  });
  function createAnimatedNumber(elementId, startValue, endValue, formatter, duration = 800) {
    if (animatedNumbers.has(elementId)) {
      clearInterval(animatedNumbers.get(elementId));
    }
    const element = document.getElementById(elementId);
    if (!element) return;
    const startTime = performance.now();
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (endValue - startValue) * eased;
      element.textContent = formatter(currentValue);
      if (progress < 1) {
        const animationId2 = requestAnimationFrame(animate);
        animatedNumbers.set(elementId, animationId2);
      } else {
        animatedNumbers.delete(elementId);
      }
    }
    const animationId = requestAnimationFrame(animate);
    animatedNumbers.set(elementId, animationId);
  }
  function formatCurrency(value) {
    return "$" + Math.round(value).toLocaleString();
  }
  function formatPercentage(value) {
    const sign = value >= 0 ? "+" : "";
    return sign + value.toFixed(1) + "%";
  }
  function formatDollarChange(value) {
    const sign = value >= 0 ? "+" : "";
    return sign + "$" + Math.abs(Math.round(value)).toLocaleString();
  }
  function generateHouseholdSummary(household) {
    if (!household) return "";
    const income = household["Gross Income"];
    const baselineNetIncome = household["Baseline Net Income"];
    const changeInNetIncome = household["Total Change in Net Income"];
    const percentChange = household["Percentage Change in Net Income"];
    household["Household Size"];
    const isMarried = household["Is Married"];
    const numDependents = household["Number of Dependents"];
    const age = household["Age of Head"];
    const state = household["State"];
    const familyStructure = isMarried ? numDependents > 0 ? `married couple with ${numDependents} dependent${numDependents > 1 ? "s" : ""}` : "married couple" : numDependents > 0 ? `single parent with ${numDependents} dependent${numDependents > 1 ? "s" : ""}` : "single person";
    const incomeDescription = income < 5e4 ? "low-income" : income < 1e5 ? "middle-income" : income < 5e5 ? "upper-middle-income" : "high-income";
    const changeDescription = Math.abs(changeInNetIncome) < 100 ? "minimal" : Math.abs(changeInNetIncome) < 1e3 ? "modest" : Math.abs(changeInNetIncome) < 5e3 ? "significant" : "substantial";
    const gainOrLoss = changeInNetIncome > 0 ? "gains" : "loses";
    return `This ${incomeDescription} household is a ${familyStructure} living in ${state}. The head of household is ${age} years old. Under the baseline tax system, this household has a gross income of $${income.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} and a net income of $${baselineNetIncome.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. After the proposed tax reforms, this household ${gainOrLoss} $${Math.abs(changeInNetIncome).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} annually, representing a ${changeDescription} ${Math.abs(percentChange).toFixed(1)}% ${changeInNetIncome > 0 ? "increase" : "decrease"} in their net income.`;
  }
  let textSections = [];
  let currentStateIndex = 0;
  let isTransitioning = false;
  let intersectionObserver;
  function setupIntersectionObserver() {
    if (intersectionObserver) {
      intersectionObserver.disconnect();
    }
    const textColumn = document.querySelector(".text-column");
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
        rootMargin: "-30% 0px -30% 0px"
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
    if (toState.viewType === "individual") {
      const baseViewId = baseViews[Math.floor(newIndex / 2)]?.id;
      const filteredData = data.filter(baseViews[Math.floor(newIndex / 2)]?.view?.filter || (() => true));
      if (filteredData.length > 0) {
        const randomIndex = Math.floor(Math.random() * filteredData.length);
        randomHouseholds[baseViewId] = filteredData[randomIndex];
        randomHouseholds = { ...randomHouseholds };
      }
    }
    currentStateIndex = newIndex;
    animateScales({
      from: fromState.view,
      to: toState.view,
      duration: 1200,
      onComplete: () => {
        isTransitioning = false;
      }
    });
  }
  function animateScales({ from, to, duration, onComplete }) {
    const startTime = performance.now();
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    }
    requestAnimationFrame(animate);
  }
  let previousHouseholds = {};
  {
    if (typeof window !== "undefined") {
      Object.keys(randomHouseholds).forEach((viewId) => {
        const currentHousehold = randomHouseholds[viewId];
        const previousHousehold = previousHouseholds[viewId];
        if (currentHousehold && previousHousehold && currentHousehold.id !== previousHousehold.id) {
          const sectionIndex = scrollStates.findIndex((state) => state.viewType === "individual" && baseViews[Math.floor(scrollStates.indexOf(state) / 2)]?.id === viewId);
          if (sectionIndex >= 0) {
            setTimeout(
              () => {
                createAnimatedNumber(`gross-income-${sectionIndex}`, previousHousehold["Gross Income"], currentHousehold["Gross Income"], formatCurrency, 600);
              },
              100
            );
            setTimeout(
              () => {
                createAnimatedNumber(`net-change-${sectionIndex}`, previousHousehold["Total Change in Net Income"], currentHousehold["Total Change in Net Income"], formatDollarChange, 600);
              },
              200
            );
            setTimeout(
              () => {
                createAnimatedNumber(`percent-change-${sectionIndex}`, previousHousehold["Percentage Change in Net Income"], currentHousehold["Percentage Change in Net Income"], formatPercentage, 600);
              },
              300
            );
          }
        }
      });
      previousHouseholds = { ...randomHouseholds };
    }
  }
  if (textSections.length > 0 && textSections.every((el) => el)) {
    setTimeout(
      () => {
        setupIntersectionObserver();
      },
      50
    );
  }
  const each_array = ensure_array_like(scrollStates);
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>NYT-Style Scatterplot</title>`;
    $$payload2.out += `<style class="svelte-r8z2b2">
    body {
      margin: 0;
      padding: 0;
      font-family: nyt-franklin, helvetica, arial, sans-serif;
    }
  </style>`;
  });
  $$payload.out += `<div class="app svelte-r8z2b2">`;
  {
    $$payload.out += "<!--[-->";
    $$payload.out += `<div class="loading svelte-r8z2b2"><div class="spinner svelte-r8z2b2"></div> <p class="svelte-r8z2b2">Loading data...</p></div>`;
  }
  $$payload.out += `<!--]--> <div class="nyt-container svelte-r8z2b2"><div class="text-column svelte-r8z2b2"><!--[-->`;
  for (let i = 0, $$length = each_array.length; i < $$length; i++) {
    let state = each_array[i];
    $$payload.out += `<section${attr_class("text-section svelte-r8z2b2", void 0, { "active": i === currentStateIndex })}${attr("data-index", i)}><div class="section-content svelte-r8z2b2"><h2 class="svelte-r8z2b2">${escape_html(state.title)}</h2> <p class="svelte-r8z2b2">${html(state.text)}</p> `;
    if (state.viewType === "individual") {
      $$payload.out += "<!--[-->";
      const baseViewId = baseViews[Math.floor(i / 2)]?.id;
      const randomHousehold = randomHouseholds[baseViewId];
      if (randomHousehold) {
        $$payload.out += "<!--[-->";
        $$payload.out += `<div class="household-profile svelte-r8z2b2"><h3 class="svelte-r8z2b2">Individual household profile</h3> <div class="household-summary svelte-r8z2b2"><p class="svelte-r8z2b2">${escape_html(generateHouseholdSummary(randomHousehold))}</p></div> <div class="household-details svelte-r8z2b2"><div class="detail-item svelte-r8z2b2"><span class="label svelte-r8z2b2">Gross income:</span> <span class="value svelte-r8z2b2"${attr("id", `gross-income-${stringify(i)}`)}>${escape_html(formatCurrency(randomHousehold["Gross Income"]))}</span></div> <div class="detail-item svelte-r8z2b2"><span class="label svelte-r8z2b2">Net income change:</span> <span${attr_class(`value ${stringify(randomHousehold["Total Change in Net Income"] > 0 ? "positive" : "negative")}`, "svelte-r8z2b2")}${attr("id", `net-change-${stringify(i)}`)}>${escape_html(formatDollarChange(randomHousehold["Total Change in Net Income"]))}</span></div> <div class="detail-item svelte-r8z2b2"><span class="label svelte-r8z2b2">Percentage change:</span> <span${attr_class(`value ${stringify(randomHousehold["Percentage Change in Net Income"] > 0 ? "positive" : "negative")}`, "svelte-r8z2b2")}${attr("id", `percent-change-${stringify(i)}`)}>${escape_html(formatPercentage(randomHousehold["Percentage Change in Net Income"]))}</span></div></div></div>`;
      } else {
        $$payload.out += "<!--[!-->";
      }
      $$payload.out += `<!--]-->`;
    } else {
      $$payload.out += "<!--[!-->";
    }
    $$payload.out += `<!--]--></div></section>`;
  }
  $$payload.out += `<!--]--></div> <div class="viz-column svelte-r8z2b2"><div class="viz-sticky svelte-r8z2b2"><canvas width="800" height="600" class="main-canvas svelte-r8z2b2"></canvas> <svg width="800" height="600" class="overlay-svg svelte-r8z2b2"></svg></div></div></div> `;
  {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--></div>`;
  pop();
}
export {
  _page as default
};
