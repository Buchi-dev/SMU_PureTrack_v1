/**
 * Global Water Quality Standards and Thresholds
 * Based on WHO (World Health Organization) Guidelines for Drinking Water Quality
 * 
 * These standards are used across the entire application for:
 * - Alert generation
 * - Status calculations
 * - Report generation
 * - Data visualization
 * 
 * Reference: WHO Guidelines for drinking-water quality, 4th edition
 * https://www.who.int/publications/i/item/9789241549950
 */

/**
 * Water Quality Thresholds (WHO/EPA Guidelines)
 * 
 * Structure:
 * - min/max: Warning level thresholds (yellow alert)
 * - critical.min/max: Critical level thresholds (red alert)
 */
const WATER_QUALITY_THRESHOLDS = {
  pH: {
    // Normal/Warning range
    min: 6.5,
    max: 8.5,
    // Critical range
    critical: {
      min: 6.0,
      max: 9.0,
    },
    unit: 'pH',
    description: 'Acidity/Alkalinity level',
  },
  turbidity: {
    // Warning threshold
    warning: 5, // NTU (Nephelometric Turbidity Units)
    // Critical threshold
    critical: 10, // NTU
    unit: 'NTU',
    description: 'Water clarity indicator',
  },
  tds: {
    // Warning threshold
    warning: 500, // ppm (parts per million)
    // Critical threshold
    critical: 1000, // ppm
    unit: 'ppm',
    description: 'Total Dissolved Solids',
  },
};

/**
 * Detailed quality assessment ranges
 * Used for more granular quality status reporting
 */
const QUALITY_RANGES = {
  pH: {
    optimal: { min: 6.5, max: 8.5, label: 'Optimal' },
    acceptable: { min: 6.0, max: 9.0, label: 'Acceptable' },
    critical: { label: 'Critical' }, // Outside acceptable range
  },
  tds: {
    excellent: { max: 300, label: 'Excellent' },
    good: { max: 500, label: 'Good' },
    fair: { max: 1000, label: 'Fair' },
    poor: { label: 'Poor' }, // Above 1000
  },
  turbidity: {
    excellent: { max: 1, label: 'Excellent' },
    good: { max: 5, label: 'Good' },
    poor: { label: 'Poor' }, // Above 5
  },
};

/**
 * WHO Standards reference for documentation
 */
const WHO_STANDARDS = {
  pH: {
    guideline: '6.5 - 8.5',
    source: 'WHO Guidelines for Drinking Water',
    note: 'Aesthetic quality and corrosion prevention',
  },
  turbidity: {
    guideline: '< 5 NTU',
    source: 'WHO Guidelines for Drinking Water',
    note: 'Aesthetic quality indicator',
  },
  tds: {
    guideline: '< 500 ppm',
    source: 'WHO Guidelines for Drinking Water',
    note: 'Taste and health indicator',
  },
};

/**
 * Helper function to check if a reading is within normal range
 * @param {string} parameter - Parameter name ('ph', 'tds', 'turbidity')
 * @param {number} value - Reading value
 * @returns {object} Status object with level and message
 */
function getParameterStatus(parameter, value) {
  switch (parameter.toLowerCase()) {
    case 'ph':
      if (value < WATER_QUALITY_THRESHOLDS.pH.critical.min || 
          value > WATER_QUALITY_THRESHOLDS.pH.critical.max) {
        return { level: 'critical', message: 'pH level is critically out of range' };
      }
      if (value < WATER_QUALITY_THRESHOLDS.pH.min || 
          value > WATER_QUALITY_THRESHOLDS.pH.max) {
        return { level: 'warning', message: 'pH level is outside normal range' };
      }
      return { level: 'normal', message: 'pH level is within normal range' };
    
    case 'turbidity':
      if (value > WATER_QUALITY_THRESHOLDS.turbidity.critical) {
        return { level: 'critical', message: 'Turbidity is critically high' };
      }
      if (value > WATER_QUALITY_THRESHOLDS.turbidity.warning) {
        return { level: 'warning', message: 'Turbidity is above normal' };
      }
      return { level: 'normal', message: 'Turbidity is within normal range' };
    
    case 'tds':
      if (value > WATER_QUALITY_THRESHOLDS.tds.critical) {
        return { level: 'critical', message: 'TDS is critically high' };
      }
      if (value > WATER_QUALITY_THRESHOLDS.tds.warning) {
        return { level: 'warning', message: 'TDS is above normal' };
      }
      return { level: 'normal', message: 'TDS is within normal range' };
    
    default:
      return { level: 'unknown', message: 'Unknown parameter' };
  }
}

module.exports = {
  WATER_QUALITY_THRESHOLDS,
  QUALITY_RANGES,
  WHO_STANDARDS,
  getParameterStatus,
};
