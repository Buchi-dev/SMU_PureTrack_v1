/**
 * Water Quality Constants
 * Matches V2 backend constants exactly for consistent validation
 * Source: server_v2/src/core/configs/constants.config.ts
 */

/**
 * Water quality sensor thresholds based on WHO/EPA guidelines
 * ✅ MUST MATCH BACKEND VALUES EXACTLY
 */
export const SENSOR_THRESHOLDS = {
  pH: {
    min: 6.5,
    max: 8.5,
    critical: {
      min: 6.0,
      max: 9.0,
    },
    ideal: 7.0,
  },
  turbidity: {
    warning: 5, // NTU (Nephelometric Turbidity Units)
    critical: 10, // NTU
    ideal: 1, // NTU
  },
  tds: {
    warning: 500, // ppm (parts per million)
    critical: 1000, // ppm
    ideal: 300, // ppm
  },
} as const;

/**
 * Sensor parameter types
 * ✅ MUST MATCH BACKEND VALUES EXACTLY
 */
export const SENSOR_PARAMETERS = {
  PH: 'pH',
  TURBIDITY: 'Turbidity',
  TDS: 'TDS',
} as const;

/**
 * Water quality parameter definitions with display information
 */
export const WATER_QUALITY_PARAMETERS = {
  pH: {
    name: 'pH Level',
    shortName: 'pH',
    unit: '',
    description: 'Measure of water acidity or alkalinity',
    safe_min: SENSOR_THRESHOLDS.pH.min,
    safe_max: SENSOR_THRESHOLDS.pH.max,
    critical_min: SENSOR_THRESHOLDS.pH.critical.min,
    critical_max: SENSOR_THRESHOLDS.pH.critical.max,
    ideal: SENSOR_THRESHOLDS.pH.ideal,
    icon: '💧',
    color: '#1890ff',
  },
  Turbidity: {
    name: 'Turbidity',
    shortName: 'Turbidity',
    unit: 'NTU',
    description: 'Measure of water clarity',
    warning_threshold: SENSOR_THRESHOLDS.turbidity.warning,
    critical_threshold: SENSOR_THRESHOLDS.turbidity.critical,
    ideal: SENSOR_THRESHOLDS.turbidity.ideal,
    icon: '🌊',
    color: '#52c41a',
  },
  TDS: {
    name: 'Total Dissolved Solids',
    shortName: 'TDS',
    unit: 'ppm',
    description: 'Measure of dissolved substances in water',
    warning_threshold: SENSOR_THRESHOLDS.tds.warning,
    critical_threshold: SENSOR_THRESHOLDS.tds.critical,
    ideal: SENSOR_THRESHOLDS.tds.ideal,
    icon: '⚗️',
    color: '#fa8c16',
  },
} as const;

/**
 * Alert severity levels
 * ✅ MUST MATCH BACKEND VALUES EXACTLY
 */
export const ALERT_SEVERITY = {
  CRITICAL: 'Critical',
  WARNING: 'Warning',
  ADVISORY: 'Advisory',
} as const;

/**
 * Alert status types
 * ✅ MUST MATCH BACKEND VALUES EXACTLY
 */
export const ALERT_STATUS = {
  UNACKNOWLEDGED: 'Unacknowledged',
  ACKNOWLEDGED: 'Acknowledged',
  RESOLVED: 'Resolved',
} as const;

/**
 * Alert cooldown periods (in minutes)
 * ✅ MUST MATCH BACKEND VALUES EXACTLY
 */
export const ALERT_COOLDOWN = {
  Critical: 5, // 5 minutes for critical alerts
  Warning: 15, // 15 minutes for warning alerts
  Advisory: 30, // 30 minutes for advisory alerts
} as const;

/**
 * Alert severity display configuration
 */
export const ALERT_SEVERITY_CONFIG = {
  Critical: {
    color: 'error',
    badge: 'red',
    icon: '🔴',
    priority: 1,
    cooldown: ALERT_COOLDOWN.Critical,
  },
  Warning: {
    color: 'warning',
    badge: 'orange',
    icon: '🟡',
    priority: 2,
    cooldown: ALERT_COOLDOWN.Warning,
  },
  Advisory: {
    color: 'processing',
    badge: 'blue',
    icon: '🔵',
    priority: 3,
    cooldown: ALERT_COOLDOWN.Advisory,
  },
} as const;

/**
 * Alert status display configuration
 */
export const ALERT_STATUS_CONFIG = {
  Unacknowledged: {
    color: 'error',
    badge: 'red',
    icon: '⚠️',
    label: 'Unacknowledged',
  },
  Acknowledged: {
    color: 'warning',
    badge: 'orange',
    icon: '👁️',
    label: 'Acknowledged',
  },
  Resolved: {
    color: 'success',
    badge: 'green',
    icon: '✅',
    label: 'Resolved',
  },
} as const;

/**
 * Parameter value validation helper
 */
export const validateParameterValue = (parameter: keyof typeof WATER_QUALITY_PARAMETERS, value: number): {
  isValid: boolean;
  isCritical: boolean;
  isWarning: boolean;
  isIdeal: boolean;
} => {
  const param = WATER_QUALITY_PARAMETERS[parameter];
  
  if (parameter === 'pH') {
    // pH has min/max ranges
    const phParam = param as typeof WATER_QUALITY_PARAMETERS.pH;
    const critical_min = phParam.critical_min;
    const critical_max = phParam.critical_max;
    const safe_min = phParam.safe_min;
    const safe_max = phParam.safe_max;
    
    return {
      isValid: value >= critical_min && value <= critical_max,
      isCritical: value < safe_min || value > safe_max,
      isWarning: value < safe_min || value > safe_max,
      isIdeal: Math.abs(value - phParam.ideal) < 0.5,
    };
  }
  
  // Turbidity and TDS have threshold-based validation
  const thresholdParam = param as typeof WATER_QUALITY_PARAMETERS.Turbidity | typeof WATER_QUALITY_PARAMETERS.TDS;
  const warning = thresholdParam.warning_threshold;
  const critical = thresholdParam.critical_threshold;
  
  return {
    isValid: true, // No upper limit for validity
    isCritical: value >= critical,
    isWarning: value >= warning && value < critical,
    isIdeal: Math.abs(value - thresholdParam.ideal) < thresholdParam.ideal * 0.1,
  };
};

/**
 * Get parameter display unit
 */
export const getParameterUnit = (parameter: string): string => {
  const param = WATER_QUALITY_PARAMETERS[parameter as keyof typeof WATER_QUALITY_PARAMETERS];
  return param?.unit ?? '';
};

/**
 * Get parameter display name
 */
export const getParameterName = (parameter: string): string => {
  const param = WATER_QUALITY_PARAMETERS[parameter as keyof typeof WATER_QUALITY_PARAMETERS];
  return param?.name ?? parameter;
};

/**
 * Get parameter short name
 */
export const getParameterShortName = (parameter: string): string => {
  const param = WATER_QUALITY_PARAMETERS[parameter as keyof typeof WATER_QUALITY_PARAMETERS];
  return param?.shortName ?? parameter;
};

/**
 * Get severity color for Ant Design
 */
export const getSeverityColor = (severity: string): string => {
  const config = ALERT_SEVERITY_CONFIG[severity as keyof typeof ALERT_SEVERITY_CONFIG];
  return config?.color ?? 'default';
};

/**
 * Get status color for Ant Design
 */
export const getStatusColor = (status: string): string => {
  const config = ALERT_STATUS_CONFIG[status as keyof typeof ALERT_STATUS_CONFIG];
  return config?.color ?? 'default';
};
