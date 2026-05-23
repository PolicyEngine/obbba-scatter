// PolicyEngine Design System Colors (matching policyengine-app-v2)
export const COLORS = {
  // Core colors
  BLACK: "#000000",
  WHITE: "#FFFFFF",

  // Primary (Teal)
  PRIMARY_50: "#E6FFFA",
  PRIMARY_100: "#B2F5EA",
  PRIMARY_200: "#81E6D9",
  PRIMARY_300: "#4FD1C5",
  PRIMARY_400: "#38B2AC",
  PRIMARY_500: "#319795",  // Main brand color
  PRIMARY_600: "#2C7A7B",
  PRIMARY_700: "#285E61",
  PRIMARY_800: "#234E52",
  PRIMARY_900: "#1D4044",

  // Secondary
  SECONDARY_50: "#F0F9FF",
  SECONDARY_100: "#F2F4F7",
  SECONDARY_200: "#E2E8F0",
  SECONDARY_300: "#CBD5E1",
  SECONDARY_400: "#94A3B8",
  SECONDARY_500: "#64748B",
  SECONDARY_600: "#475569",
  SECONDARY_700: "#344054",
  SECONDARY_800: "#1E293B",
  SECONDARY_900: "#101828",

  // Blue
  BLUE_50: "#F0F9FF",
  BLUE_100: "#E0F2FE",
  BLUE_200: "#BAE6FD",
  BLUE_300: "#7DD3FC",
  BLUE_400: "#38BDF8",
  BLUE_500: "#0EA5E9",
  BLUE_600: "#0284C7",
  BLUE_700: "#026AA2",
  BLUE_800: "#075985",
  BLUE_900: "#0C4A6E",

  // Gray
  GRAY_50: "#F9FAFB",
  GRAY_100: "#F2F4F7",
  GRAY_200: "#E2E8F0",
  GRAY_300: "#D1D5DB",
  GRAY_400: "#9CA3AF",
  GRAY_500: "#6B7280",
  GRAY_600: "#4B5563",
  GRAY_700: "#344054",
  GRAY_800: "#1F2937",
  GRAY_900: "#101828",

  // Semantic
  SUCCESS: "#22C55E",
  WARNING: "#FEC601",
  ERROR: "#EF4444",
  INFO: "#1890FF",

  // Legacy aliases (for backwards compatibility)
  DARK_GRAY: "#5A5A5A",
  DARKEST_BLUE: "#000000",
  MEDIUM_DARK_GRAY: "#D1D5DB",
  GRID_LINES: "#E2E8F0",
  TEAL_MEDIUM: "#319795"
};

// Application Color Mappings
export const APP_COLORS = {
  background: COLORS.WHITE,
  textPrimary: COLORS.BLACK,
  textSecondary: "#5A5A5A",
  textTertiary: COLORS.GRAY_400,
  axisGrid: COLORS.BLACK,
  gridLines: COLORS.GRAY_200,
  scatterPositive: COLORS.PRIMARY_500,  // Teal for gains
  scatterNegative: COLORS.GRAY_500,     // Gray for losses
  scatterNeutral: COLORS.GRAY_300,
  border: COLORS.GRAY_200,
  borderMedium: COLORS.GRAY_300,
  borderDark: COLORS.GRAY_400,
  hover: COLORS.GRAY_50,
  success: COLORS.SUCCESS,
  error: COLORS.ERROR
};

// Get color for data point based on change value
export function getPointColor(change) {
  // Handle edge cases
  if (change === null || change === undefined || isNaN(change) || typeof change !== 'number') {
    return APP_COLORS.scatterNeutral;
  }
  
  if (Math.abs(change) < 0.1) {
    return APP_COLORS.scatterNeutral;
  } else if (change > 0) {
    return APP_COLORS.scatterPositive;
  } else {
    return APP_COLORS.scatterNegative;
  }
}