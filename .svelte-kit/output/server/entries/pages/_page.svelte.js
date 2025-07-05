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
        filter: (d) => d["Gross income"] < 35e4,
        highlightGroup: null
      }
    },
    {
      id: "lower-income",
      title: "Lower-income households under $50,000",
      groupText: "Households earning under $50,000 see varied outcomes. While many benefit from Child Tax Credit expansions and TCJA extensions, some undocumented families lose access to credits due to new SSN requirements. The bill reduces poverty by 5.5% overall, with the bottom decile gaining an average of $342.",
      view: {
        xDomain: [-10, 15],
        yDomain: [0, 5e4],
        filter: (d) => d["Gross income"] >= 0 && d["Gross income"] < 5e4,
        highlightGroup: "lower"
      }
    },
    {
      id: "middle-income",
      title: "Middle-income households ($50,000 - $200,000)",
      groupText: "This broad middle class benefits significantly from TCJA extensions, enhanced Child Tax Credits, and new deductions for tips and overtime pay. Seniors in this range gain substantially from the additional $6,000 senior deduction. These households typically see net income increases from the tax provisions.",
      view: {
        xDomain: [-15, 25],
        yDomain: [5e4, 2e5],
        filter: (d) => d["Gross income"] >= 5e4 && d["Gross income"] < 2e5,
        highlightGroup: "middle"
      }
    },
    {
      id: "upper-income",
      title: "Upper-income households ($200,000 - $1 million)",
      groupText: "Higher earners face more complex outcomes as they benefit from TCJA extensions but encounter new limitations. The $40,000 SALT cap provides relief compared to the current $10,000 limit, but itemized deduction limitations at the 35% bracket reduce benefits. Many still see net gains, but the effects vary widely based on deduction usage.",
      view: {
        xDomain: [-30, 30],
        yDomain: [2e5, 1e6],
        filter: (d) => d["Gross income"] >= 2e5 && d["Gross income"] < 1e6,
        highlightGroup: "upper"
      }
    },
    {
      id: "highest-income",
      title: "Highest-income households ($1 million+)",
      groupText: "The wealthiest households experience the largest absolute gains but face the most limitations. While they benefit from rate reductions and QBID provisions, new restrictions on itemized deductions and charitable contribution floors reduce their benefits. The top 10% gains most in absolute terms, averaging $13,231, contributing to a 0.4% increase in income inequality.",
      view: {
        xDomain: [-50, 50],
        yDomain: [1e6, 1e7],
        filter: (d) => d["Gross income"] >= 1e6,
        highlightGroup: "highest"
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
    const income = household["Gross income"];
    const baselineNetIncome = household["Baseline net income"];
    const changeInNetIncome = household["Total change in net income"];
    const percentChange = household["Percentage change in net income"];
    household["Household size"];
    const isMarried = household["Is married"];
    const numDependents = household["Number of dependents"];
    const age = household["Age of head"];
    const state = household["State"];
    const familyStructure = isMarried ? numDependents > 0 ? `married couple with ${numDependents} dependent${numDependents > 1 ? "s" : ""}` : "married couple" : numDependents > 0 ? `single parent with ${numDependents} dependent${numDependents > 1 ? "s" : ""}` : "single person";
    const gainOrLoss = changeInNetIncome > 0 ? "gains" : "loses";
    return `This household is a ${familyStructure} living in ${state}. The head of household is ${age} years old. Under the baseline tax system, this household has a gross income of $${income.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} and a net income of $${baselineNetIncome.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. After the proposed tax reforms, this household ${gainOrLoss} $${Math.abs(changeInNetIncome).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} annually, representing a ${Math.abs(percentChange).toFixed(1)}% ${changeInNetIncome > 0 ? "increase" : "decrease"} in their net income.`;
  }
  function getProvisionBreakdown(household) {
    if (!household) return [];
    const provisions = [
      {
        name: "Tax rate reform",
        key: "Change in net income after tax rate reform"
      },
      {
        name: "Standard deduction reform",
        key: "Change in net income after standard deduction reform"
      },
      {
        name: "Exemption reform",
        key: "Change in net income after exemption reform"
      },
      {
        name: "Child Tax Credit reform",
        key: "Change in net income after CTC reform"
      },
      {
        name: "QBID reform",
        key: "Change in net income after QBID reform"
      },
      {
        name: "AMT reform",
        key: "Change in net income after AMT reform"
      },
      {
        name: "Miscellaneous reform",
        key: "Change in net income after miscellaneous reform"
      },
      {
        name: "Other itemized deductions reform",
        key: "Change in net income after other itemized deductions reform"
      },
      {
        name: "Limitation on itemized deductions reform",
        key: "Change in net income after limitation on itemized deductions reform"
      },
      {
        name: "Estate tax reform",
        key: "Change in net income after estate tax reform"
      },
      {
        name: "Senior deduction reform",
        key: "Change in net income after senior deduction reform"
      },
      {
        name: "Tip income exempt",
        key: "Change in net income after tip income exempt"
      },
      {
        name: "Overtime income exempt",
        key: "Change in net income after overtime income exempt"
      },
      {
        name: "Auto loan interest ALD",
        key: "Change in net income after auto loan interest ALD"
      },
      {
        name: "SALT reform",
        key: "Change in net income after SALT reform"
      },
      {
        name: "CDCC reform",
        key: "Change in net income after CDCC reform"
      },
      {
        name: "ACA enhanced subsidies reform",
        key: "Change in net income after ACA enhanced subsidies reform"
      },
      {
        name: "SNAP takeup reform",
        key: "Change in net income after SNAP takeup reform"
      },
      {
        name: "ACA takeup reform",
        key: "Change in net income after ACA takeup reform"
      },
      {
        name: "Medicaid takeup reform",
        key: "Change in net income after Medicaid takeup reform"
      }
    ];
    return provisions.map((provision, index) => ({
      name: provision.name,
      value: household[provision.key] || 0,
      index
      // Add index for unique IDs
    })).filter((provision) => Math.abs(provision.value) > 0.01).sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
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
        const randomHousehold = getRandomWeightedHousehold(filteredData);
        if (randomHousehold) {
          randomHouseholds[baseViewId] = randomHousehold;
          randomHouseholds = { ...randomHouseholds };
        }
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
  function getRandomWeightedHousehold(filteredData) {
    if (!filteredData || filteredData.length === 0) return null;
    const totalWeight = filteredData.reduce((sum, household) => sum + (household["Household weight"] || 1), 0);
    let randomWeight = Math.random() * totalWeight;
    for (const household of filteredData) {
      randomWeight -= household["Household weight"] || 1;
      if (randomWeight <= 0) {
        return household;
      }
    }
    return filteredData[filteredData.length - 1];
  }
  {
    if (typeof window !== "undefined") {
      Object.keys(randomHouseholds).forEach((viewId) => {
        const currentHousehold = randomHouseholds[viewId];
        const previousHousehold = previousHouseholds[viewId];
        if (currentHousehold && previousHousehold && currentHousehold.id !== previousHousehold.id) {
          const sectionIndex = scrollStates.findIndex((state) => state.viewType === "individual" && baseViews[Math.floor(scrollStates.indexOf(state) / 2)]?.id === viewId);
          if (sectionIndex >= 0) {
            const isCurrentSection = sectionIndex === currentStateIndex;
            const animationDelay = isCurrentSection ? 50 : 100;
            const animationDuration = isCurrentSection ? 400 : 600;
            setTimeout(
              () => {
                createAnimatedNumber(`gross-income-${sectionIndex}`, previousHousehold["Gross income"], currentHousehold["Gross income"], formatCurrency, animationDuration);
              },
              animationDelay
            );
            setTimeout(
              () => {
                createAnimatedNumber(`net-change-${sectionIndex}`, previousHousehold["Total change in net income"], currentHousehold["Total change in net income"], formatDollarChange, animationDuration);
              },
              animationDelay + 100
            );
            setTimeout(
              () => {
                createAnimatedNumber(`percent-change-${sectionIndex}`, previousHousehold["Percentage change in net income"], currentHousehold["Percentage change in net income"], formatPercentage, animationDuration);
              },
              animationDelay + 200
            );
            const currentProvisions = getProvisionBreakdown(currentHousehold);
            const previousProvisions = getProvisionBreakdown(previousHousehold);
            currentProvisions.forEach((currentProv, provIndex) => {
              const prevProv = previousProvisions.find((p) => p.index === currentProv.index);
              const prevValue = prevProv ? prevProv.value : 0;
              setTimeout(
                () => {
                  createAnimatedNumber(`provision-${sectionIndex}-${currentProv.index}`, prevValue, currentProv.value, formatDollarChange, animationDuration);
                },
                animationDelay + 300 + provIndex * 20
              );
            });
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
    $$payload2.out += `<style class="svelte-2bseyx">
    body {
      margin: 0;
      padding: 0;
      font-family: nyt-franklin, helvetica, arial, sans-serif;
    }
  </style>`;
  });
  $$payload.out += `<div class="app svelte-2bseyx">`;
  {
    $$payload.out += "<!--[-->";
    $$payload.out += `<div class="loading svelte-2bseyx"><div class="spinner svelte-2bseyx"></div> <p class="svelte-2bseyx">Loading data...</p></div>`;
  }
  $$payload.out += `<!--]--> <div class="nyt-container svelte-2bseyx"><div class="text-column svelte-2bseyx"><!--[-->`;
  for (let i = 0, $$length = each_array.length; i < $$length; i++) {
    let state = each_array[i];
    $$payload.out += `<section${attr_class("text-section svelte-2bseyx", void 0, { "active": i === currentStateIndex })}${attr("data-index", i)}><div class="section-content svelte-2bseyx"><h2 class="svelte-2bseyx">${escape_html(state.title)}</h2> <p class="svelte-2bseyx">${html(state.text)}</p> `;
    if (state.viewType === "individual") {
      $$payload.out += "<!--[-->";
      const baseViewId = baseViews[Math.floor(i / 2)]?.id;
      const randomHousehold = randomHouseholds[baseViewId];
      if (randomHousehold) {
        $$payload.out += "<!--[-->";
        const provisionBreakdown = getProvisionBreakdown(randomHousehold);
        $$payload.out += `<div class="household-profile svelte-2bseyx"><h3 class="svelte-2bseyx">Individual household profile <div class="header-buttons svelte-2bseyx"><button class="action-button random-button svelte-2bseyx" title="Pick a new random household">🎲</button> <button class="action-button info-button svelte-2bseyx" title="Show detailed data for this household">ⓘ</button></div></h3> <div class="household-summary svelte-2bseyx"><p class="svelte-2bseyx">${escape_html(generateHouseholdSummary(randomHousehold))}</p></div> <div class="household-details svelte-2bseyx"><div class="detail-item svelte-2bseyx"><span class="label svelte-2bseyx">Gross income:</span> <span class="value svelte-2bseyx"${attr("id", `gross-income-${stringify(i)}`)}>${escape_html(formatCurrency(randomHousehold["Gross income"]))}</span></div> <div class="detail-item svelte-2bseyx"><span class="label svelte-2bseyx">Net income change:</span> <span${attr_class(`value ${stringify(randomHousehold["Total change in net income"] > 0 ? "positive" : "negative")}`, "svelte-2bseyx")}${attr("id", `net-change-${stringify(i)}`)}>${escape_html(formatDollarChange(randomHousehold["Total change in net income"]))}</span></div> <div class="detail-item svelte-2bseyx"><span class="label svelte-2bseyx">Percentage change:</span> <span${attr_class(`value ${stringify(randomHousehold["Percentage change in net income"] > 0 ? "positive" : "negative")}`, "svelte-2bseyx")}${attr("id", `percent-change-${stringify(i)}`)}>${escape_html(formatPercentage(randomHousehold["Percentage change in net income"]))}</span></div></div> `;
        if (provisionBreakdown.length > 0) {
          $$payload.out += "<!--[-->";
          const each_array_1 = ensure_array_like(provisionBreakdown);
          $$payload.out += `<div class="provision-breakdown svelte-2bseyx"><h4 class="svelte-2bseyx">Breakdown by provision</h4> <div class="provision-list svelte-2bseyx"><!--[-->`;
          for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
            let provision = each_array_1[$$index];
            $$payload.out += `<div class="provision-item svelte-2bseyx"><span class="provision-name svelte-2bseyx">${escape_html(provision.name)}:</span> <span${attr_class(
              `provision-value ${stringify(provision.value > 0 ? "positive" : provision.value < 0 ? "negative" : "neutral")}`,
              "svelte-2bseyx"
            )}${attr("id", `provision-${stringify(i)}-${stringify(provision.index)}`)}>${escape_html(formatDollarChange(provision.value))}</span></div>`;
          }
          $$payload.out += `<!--]--></div></div>`;
        } else {
          $$payload.out += "<!--[!-->";
          $$payload.out += `<div class="provision-breakdown svelte-2bseyx"><h4 class="svelte-2bseyx">Breakdown by provision</h4> <p class="no-provisions svelte-2bseyx">No policy provisions affect this household.</p></div>`;
        }
        $$payload.out += `<!--]--></div>`;
      } else {
        $$payload.out += "<!--[!-->";
      }
      $$payload.out += `<!--]-->`;
    } else {
      $$payload.out += "<!--[!-->";
    }
    $$payload.out += `<!--]--></div></section>`;
  }
  $$payload.out += `<!--]--></div> <div class="viz-column svelte-2bseyx"><div class="viz-sticky svelte-2bseyx"><canvas width="800" height="600" class="main-canvas svelte-2bseyx"></canvas> <svg width="800" height="600" class="overlay-svg svelte-2bseyx"></svg></div></div></div> `;
  {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--></div>`;
  pop();
}
export {
  _page as default
};
