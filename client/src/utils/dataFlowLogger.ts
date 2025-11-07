/**
 * Data Flow Logger
 * 
 * Trace data transitions from Firestore → Service Layer → Hooks → UI
 * This helps diagnose when false zeros or offline states are introduced
 * 
 * Enable/disable via environment variable or localStorage flag
 */

const LOG_PREFIX = '[DataFlow]';
const STORAGE_KEY = 'dataflow_logging_enabled';

// Check if logging is enabled
const isLoggingEnabled = (): boolean => {
  // Check localStorage flag (can be toggled in DevTools)
  if (typeof window !== 'undefined' && window.localStorage) {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      return stored === 'true';
    }
  }
  
  // Default: enabled in development, disabled in production
  // Use process.env for better compatibility
  return process.env.NODE_ENV === 'development';
};

export type DataSource = 'Firestore' | 'RTDB' | 'HTTP_API' | 'MQTT_Bridge';
export type FlowLayer = 'Service' | 'Hook' | 'Component';

// Constants for convenience
export const DataSource = {
  FIRESTORE: 'Firestore' as DataSource,
  RTDB: 'RTDB' as DataSource,
  HTTP_API: 'HTTP_API' as DataSource,
  MQTT_BRIDGE: 'MQTT_Bridge' as DataSource,
};

export const FlowLayer = {
  SERVICE: 'Service' as FlowLayer,
  HOOK: 'Hook' as FlowLayer,
  COMPONENT: 'Component' as FlowLayer,
};

interface DataFlowEvent {
  timestamp: number;
  source: DataSource;
  layer: FlowLayer;
  operation: string;
  metadata: Record<string, any>;
}

class DataFlowLogger {
  private static instance: DataFlowLogger;
  private events: DataFlowEvent[] = [];
  private maxEvents = 1000; // Keep last 1000 events

  private constructor() {}

  static getInstance(): DataFlowLogger {
    if (!DataFlowLogger.instance) {
      DataFlowLogger.instance = new DataFlowLogger();
    }
    return DataFlowLogger.instance;
  }

  /**
   * Log a data flow event
   */
  log(
    source: DataSource,
    layer: FlowLayer,
    operation: string,
    metadata: Record<string, any> = {}
  ): void {
    if (!isLoggingEnabled()) return;

    const event: DataFlowEvent = {
      timestamp: Date.now(),
      source,
      layer,
      operation,
      metadata,
    };

    this.events.push(event);
    
    // Trim to max events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Console output with color coding
    const layerColor = {
      [FlowLayer.SERVICE]: 'color: #2196F3', // Blue
      [FlowLayer.HOOK]: 'color: #FF9800', // Orange
      [FlowLayer.COMPONENT]: 'color: #4CAF50', // Green
    }[layer];

    console.log(
      `%c${LOG_PREFIX} [${source}] [${layer}] ${operation}`,
      layerColor,
      metadata
    );
  }

  /**
   * Log a data validation issue
   */
  logValidationIssue(
    source: DataSource,
    layer: FlowLayer,
    issue: string,
    data: any
  ): void {
    if (!isLoggingEnabled()) return;

    console.warn(
      `%c${LOG_PREFIX} [${source}] [${layer}] ⚠️ VALIDATION ISSUE: ${issue}`,
      'color: #F44336; font-weight: bold',
      { data }
    );

    this.log(source, layer, 'VALIDATION_ISSUE', { issue, data });
  }

  /**
   * Log a cache hit (using stale data to prevent UI zeros)
   */
  logCacheHit(
    source: DataSource,
    layer: FlowLayer,
    reason: string,
    cachedData: any
  ): void {
    if (!isLoggingEnabled()) return;

    console.info(
      `%c${LOG_PREFIX} [${source}] [${layer}] 📦 CACHE HIT: ${reason}`,
      'color: #9C27B0',
      { cachedData }
    );

    this.log(source, layer, 'CACHE_HIT', { reason, cachedData });
  }

  /**
   * Log a state rejection (prevented bad data from reaching UI)
   */
  logStateRejection(
    source: DataSource,
    layer: FlowLayer,
    reason: string,
    rejectedData: any,
    maintainedData: any
  ): void {
    if (!isLoggingEnabled()) return;

    console.warn(
      `%c${LOG_PREFIX} [${source}] [${layer}] 🛑 STATE REJECTED: ${reason}`,
      'color: #FF5722; font-weight: bold',
      { rejected: rejectedData, maintained: maintainedData }
    );

    this.log(source, layer, 'STATE_REJECTED', {
      reason,
      rejectedData,
      maintainedData,
    });
  }

  /**
   * Get all events (for debugging)
   */
  getEvents(): DataFlowEvent[] {
    return [...this.events];
  }

  /**
   * Clear event log
   */
  clear(): void {
    this.events = [];
    console.log(`${LOG_PREFIX} Event log cleared`);
  }

  /**
   * Export events as JSON (for bug reports)
   */
  export(): string {
    return JSON.stringify(this.events, null, 2);
  }

  /**
   * Enable/disable logging
   */
  setEnabled(enabled: boolean): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, enabled.toString());
      console.log(`${LOG_PREFIX} Logging ${enabled ? 'enabled' : 'disabled'}`);
    }
  }
}

// Singleton instance
export const dataFlowLogger = DataFlowLogger.getInstance();

// Expose to window for DevTools access
if (typeof window !== 'undefined') {
  (window as any).dataFlowLogger = dataFlowLogger;
  console.log(
    `%c${LOG_PREFIX} Logger initialized. Access via window.dataFlowLogger`,
    'color: #2196F3; font-weight: bold'
  );
  console.log(
    `%c${LOG_PREFIX} Commands: .setEnabled(true|false), .getEvents(), .clear(), .export()`,
    'color: #2196F3'
  );
}

export default dataFlowLogger;
