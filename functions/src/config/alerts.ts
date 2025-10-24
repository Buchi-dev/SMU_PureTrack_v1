import type {AlertThresholds} from "../types";

// Default threshold configuration
export const DEFAULT_THRESHOLDS: AlertThresholds = {
  tds: {
    warningMin: 0,
    warningMax: 500,
    criticalMin: 0,
    criticalMax: 1000,
    unit: "ppm",
  },
  ph: {
    warningMin: 6.0,
    warningMax: 8.5,
    criticalMin: 5.5,
    criticalMax: 9.0,
    unit: "",
  },
  turbidity: {
    warningMin: 0,
    warningMax: 5,
    criticalMin: 0,
    criticalMax: 10,
    unit: "NTU",
  },
  trendDetection: {
    enabled: true,
    thresholdPercentage: 15,
    timeWindowMinutes: 30,
  },
};
