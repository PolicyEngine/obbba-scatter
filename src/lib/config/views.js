export const introMethodology =
  "Household resources equal cash net income plus Medicaid, CHIP, and enrollee-assigned ACA premium tax credits valued at program cost. Estimates compare OBBBA with a TCJA-expiration counterfactual. Apart from three imposed reduced-form participation scenarios for SNAP, ACA, and Medicaid, the model holds labor supply, savings, and economic conditions fixed. Provision bars are marginal effects in the paper's forward stacking order, so interacting provisions can receive different attributions in another order. Income-band views begin at $0 of market income; national totals include records with negative market income. Results use policyengine.py 5.0.1, PolicyEngine US 1.764.6, and Microcosm Build P. These are modeled public-use records, not identifiable families. <a href='https://github.com/PolicyEngine/obbba-paper' target='_blank' rel='noopener noreferrer'>Read the paper and reproducibility files</a>.";

// Base view configurations for scroll states
export const baseViews = [
  {
    id: 'intro',
    title: 'The One Big Beautiful Bill Act, household by household',
    groupText:
      "On July 4, President Donald Trump signed into law the One Big Beautiful Bill Act (OBBBA). The Act extended the 2017 tax cuts, enacted additional tax reforms, and reduced participation in programs including Medicaid.<br><br>Explore 57,240 modeled records from PolicyEngine's certified Microcosm Build P. Their calibrated weights represent 124.6 million US households in 2026. Across those households, OBBBA increases resources by $546.1 billion, or $4,384 per household on average. Each record shows the total change in household resources and the marginal contribution of 21 modeled provisions.",
    view: {
      xDomain: [-20, 20],
      yDomain: [0, 350000],
      filter: (d) => d['Market Income'] < 350000,
      highlightGroup: null
    }
  },
  {
    id: 'lower-income',
    title: 'Households with income below $50,000',
    groupText: null, // Will be dynamically generated with statistics
    view: {
      xDomain: [-20, 20],
      yDomain: [0, 50000],
      filter: (d) => d['Market Income'] >= 0 && d['Market Income'] < 50000,
      highlightGroup: 'lower'
    }
  },
  {
    id: 'middle-income',
    title: 'Households with income $50,000 to $200,000',
    groupText: null, // Will be dynamically generated with statistics
    view: {
      xDomain: [-20, 20],
      yDomain: [50000, 200000],
      filter: (d) => d['Market Income'] >= 50000 && d['Market Income'] < 200000,
      highlightGroup: 'middle'
    }
  },
  {
    id: 'upper-income',
    title: 'Households with income $200,000 to $1 million',
    groupText: null, // Will be dynamically generated with statistics
    view: {
      xDomain: [-20, 20],
      yDomain: [200000, 1000000],
      filter: (d) => d['Market Income'] >= 200000 && d['Market Income'] < 1000000,
      highlightGroup: 'upper'
    }
  },
  {
    id: 'highest-income',
    title: 'Households with income over $1 million',
    groupText: null, // Will be dynamically generated with statistics
    view: {
      xDomain: [-20, 20],
      yDomain: [1000000, 10000000],
      filter: (d) => d['Market Income'] >= 1000000,
      highlightGroup: 'highest'
    }
  },
  {
    id: 'all-households',
    title: 'All households',
    groupText:
      "Overall, OBBBA changes household resources by more than $1 for {totalPercentage}% of households. The weighted median change is {medianImpact}% of baseline household resources.<br><br>Click any dot to inspect the modeled household and expand its provision breakdown. Visit <a href='https://policyengine.org' target='_blank' rel='noopener noreferrer' style='color: var(--primary-blue); text-decoration: underline;'>PolicyEngine.org</a> to calculate a household impact, design a custom reform, or analyze population-wide effects.",
    view: {
      xDomain: [-20, 20],
      yDomain: [0, 10000000],
      filter: (d) => true,
      highlightGroup: null
    }
  }
];

// Generate scroll states from base views (group + individual views)
export function generateScrollStates() {
  const scrollStates = [];

  baseViews.forEach((baseView) => {
    // Add group view
    scrollStates.push({
      id: baseView.id,
      ...baseView.view,
      title: baseView.title,
      description: baseView.groupText,
      viewType: 'group'
    });

    // Skip individual views - all income sections now have integrated profiles
  });

  return scrollStates;
}

// Export the generated scroll states
export const scrollStates = generateScrollStates();
