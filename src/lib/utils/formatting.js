// Consistent number formatters
export const fmtUSD = new Intl.NumberFormat('en-US', { 
  style: 'currency', 
  currency: 'USD', 
  maximumFractionDigits: 0 
});

export const fmtPct = new Intl.NumberFormat('en-US', { 
  style: 'percent', 
  minimumFractionDigits: 1, 
  maximumFractionDigits: 1 
});

// Formatting functions
export function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return '$0';
  }
  return fmtUSD.format(value);
}

export function formatPercentage(value) {
  if (!value || value === 0) return '0.0%';
  const formatted = fmtPct.format(value / 100); // Convert to decimal for Intl formatter
  return value > 0 ? '+' + formatted : formatted;
}

export function formatDollarChange(value) {
  if (value === null || value === undefined || value === 0) {
    return '$0';
  }
  const formatted = fmtUSD.format(Math.abs(value));
  return value > 0 ? '+' + formatted : '-' + formatted;
}

// Get font family from type (PolicyEngine Design System)
export function getFontFamily(type = 'sans') {
  const fontMap = {
    'sans': "var(--pe-font-family-primary)",
    'body': "var(--pe-font-family-primary)",
    'serif': "var(--pe-font-family-primary)",
    'chart': "var(--pe-font-family-primary)",
    'mono': "'JetBrains Mono', 'Fira Code', Consolas, monospace"
  };
  return fontMap[type] || fontMap['sans'];
}

// Number formatter
export function formatNumber(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0
  }).format(value);
}