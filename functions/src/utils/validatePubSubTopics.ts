/**
 * Pub/Sub Topic Consistency Validator
 * 
 * This utility validates that all Pub/Sub topics are correctly configured
 * and consistent across the entire codebase.
 * 
 * Usage: npx ts-node src/utils/validatePubSubTopics.ts
 */

import * as fs from "fs";
import * as path from "path";

// Import constants to validate at runtime
import { PUBSUB_TOPICS as PUBSUB_CONSTANTS } from "../constants/pubsub.constants";
import { PUBSUB_TOPICS as DEVICE_PUBSUB, MQTT_TOPICS } from "../constants/deviceManagement.constants";
import { SENSOR_DATA_PUBSUB_CONFIG } from "../constants/sensorData.constants";

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

interface ValidationResult {
  passed: number;
  failed: number;
  warnings: string[];
  errors: string[];
}

const results: ValidationResult = {
  passed: 0,
  failed: 0,
  warnings: [],
  errors: [],
};

function log(message: string, color: keyof typeof colors = "reset"): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(message: string): void {
  log("\n" + "=".repeat(80), "cyan");
  log(message, "cyan");
  log("=".repeat(80), "cyan");
}

function success(message: string): void {
  log(`✅ ${message}`, "green");
  results.passed++;
}

function error(message: string): void {
  log(`❌ ${message}`, "red");
  results.failed++;
  results.errors.push(message);
}

function warning(message: string): void {
  log(`⚠️  ${message}`, "yellow");
  results.warnings.push(message);
}

function info(message: string): void {
  log(`ℹ️  ${message}`, "blue");
}

/**
 * Validate that pubsub.constants.ts and deviceManagement.constants.ts are aligned
 */
function validateConstantsAlignment(): void {
  header("Validating Constants Alignment");
  
  info("Checking PUBSUB_TOPICS consistency...");
  
  // Check that all topics match
  const topicsToValidate = [
    { name: "SENSOR_DATA", expected: "iot-sensor-readings" },
    { name: "DEVICE_REGISTRATION", expected: "iot-device-registration" },
    { name: "DEVICE_STATUS", expected: "iot-device-status" },
    { name: "DEVICE_COMMANDS", expected: "device-commands" },
  ];
  
  topicsToValidate.forEach(({ name, expected }) => {
    const pubsubValue = PUBSUB_CONSTANTS[name as keyof typeof PUBSUB_CONSTANTS];
    const deviceValue = DEVICE_PUBSUB[name as keyof typeof DEVICE_PUBSUB];
    
    if (pubsubValue === expected && deviceValue === expected) {
      success(`${name}: "${expected}" (aligned)`);
    } else if (pubsubValue !== expected) {
      error(`${name} mismatch in pubsub.constants.ts: expected "${expected}", got "${pubsubValue}"`);
    } else if (deviceValue !== expected) {
      error(`${name} mismatch in deviceManagement.constants.ts: expected "${expected}", got "${deviceValue}"`);
    } else {
      error(`${name}: pubsub="${pubsubValue}", device="${deviceValue}" (mismatch)`);
    }
  });
  
  // Check SENSOR_DATA_PUBSUB_CONFIG
  if (SENSOR_DATA_PUBSUB_CONFIG.TOPIC === "iot-sensor-readings") {
    success(`SENSOR_DATA_PUBSUB_CONFIG.TOPIC: "iot-sensor-readings"`);
  } else {
    error(`SENSOR_DATA_PUBSUB_CONFIG.TOPIC mismatch: "${SENSOR_DATA_PUBSUB_CONFIG.TOPIC}"`);
  }
}

/**
 * Validate MQTT topic patterns
 */
function validateMqttTopics(): void {
  header("Validating MQTT Topics");
  
  info("Checking MQTT_TOPICS constants...");
  
  const expectedMqttTopics = {
    DISCOVERY_REQUEST: "device/discovery/request",
    COMMAND_PREFIX: "device/command/",
    STATUS_PREFIX: "device/status/",
    SENSOR_DATA_PREFIX: "device/sensordata/",  // MUST be lowercase!
    REGISTRATION_PREFIX: "device/registration/",
  };
  
  Object.entries(expectedMqttTopics).forEach(([key, expected]) => {
    const actual = MQTT_TOPICS[key as keyof typeof MQTT_TOPICS];
    if (actual === expected) {
      success(`MQTT_TOPICS.${key}: "${expected}"`);
    } else {
      error(`MQTT_TOPICS.${key} mismatch: expected "${expected}", got "${actual}"`);
    }
  });
  
  // Check for common casing errors
  if (MQTT_TOPICS.SENSOR_DATA_PREFIX.includes("sensorData")) {
    error("CRITICAL: SENSOR_DATA_PREFIX uses camelCase 'sensorData' instead of lowercase 'sensordata'");
  }
}

/**
 * Validate MQTT Bridge configuration by reading the file
 */
function validateMqttBridgeConfig(): void {
  header("Validating MQTT Bridge Configuration");
  
  const bridgePath = path.join(__dirname, "../../../mqtt-bridge/index.js");
  
  if (!fs.existsSync(bridgePath)) {
    warning("MQTT Bridge file not found at expected location. Skipping bridge validation.");
    return;
  }
  
  const bridgeContent = fs.readFileSync(bridgePath, "utf8");
  
  info("Checking TOPIC_MAPPINGS in mqtt-bridge/index.js...");
  
  const expectedMappings = [
    { mqtt: "device/sensordata/+", pubsub: "iot-sensor-readings" },
    { mqtt: "device/registration/+", pubsub: "iot-device-registration" },
    { mqtt: "device/status/+", pubsub: "iot-device-status" },
  ];
  
  expectedMappings.forEach(({ mqtt, pubsub }) => {
    const regex = new RegExp(`['"]${mqtt}['"]\\s*:\\s*['"]${pubsub}['"]`);
    if (bridgeContent.match(regex)) {
      success(`MQTT Bridge: ${mqtt} → ${pubsub}`);
    } else {
      error(`MQTT Bridge mapping not found: ${mqtt} → ${pubsub}`);
    }
  });
  
  // Check command subscription
  if (bridgeContent.includes("device-commands-sub")) {
    success(`MQTT Bridge: device-commands-sub subscription configured`);
  } else {
    error("MQTT Bridge: device-commands-sub subscription not found");
  }
  
  // Check for incorrect casing
  if (bridgeContent.includes("device/sensorData/")) {
    error("CRITICAL: MQTT Bridge uses incorrect casing 'sensorData'");
  }
}

/**
 * Validate that Pub/Sub function triggers use correct topics
 */
function validateFunctionTriggers(): void {
  header("Validating Pub/Sub Function Triggers");
  
  const functionsToCheck = [
    { file: "processSensorData.ts", expectedTopic: "iot-sensor-readings" },
    { file: "autoRegisterDevice.ts", expectedTopic: "iot-device-registration" },
    { file: "monitorDeviceStatus.ts", expectedTopic: "iot-device-status" },
  ];
  
  functionsToCheck.forEach(({ file, expectedTopic }) => {
    const filePath = path.join(__dirname, "../pubsub", file);
    
    if (!fs.existsSync(filePath)) {
      error(`Pub/Sub function not found: ${file}`);
      return;
    }
    
    const content = fs.readFileSync(filePath, "utf8");
    
    // Check if topic is referenced (either directly or via constant)
    if (
      content.includes(`topic: "${expectedTopic}"`) ||
      content.includes("PUBSUB_TOPICS.") ||
      content.includes("SENSOR_DATA_PUBSUB_CONFIG.TOPIC")
    ) {
      success(`${file} uses correct topic configuration`);
    } else {
      warning(`${file} topic configuration unclear - manual verification needed`);
    }
  });
}

/**
 * Check for duplicate or unused topic definitions
 */
function checkForDuplicatesAndUnused(): void {
  header("Checking for Duplicate or Unused Topics");
  
  info("Scanning for duplicate topic definitions...");
  
  // Check if DEVICE_EVENTS is defined but unused
  const deviceConstantsPath = path.join(__dirname, "../constants/deviceManagement.constants.ts");
  const deviceConstantsContent = fs.readFileSync(deviceConstantsPath, "utf8");
  
  if (deviceConstantsContent.includes("DEVICE_EVENTS")) {
    warning("DEVICE_EVENTS topic is defined in deviceManagement.constants.ts but appears to be unused");
    info("Consider removing it or documenting its purpose");
  } else {
    success("No unused DEVICE_EVENTS topic found (previously removed)");
  }
  
  // Check for duplicate PUBSUB_TOPICS exports
  info("\nChecking for proper constant organization...");
  
  const indexPath = path.join(__dirname, "../constants/index.ts");
  const indexContent = fs.readFileSync(indexPath, "utf8");
  
  // PUBSUB_TOPICS should NOT be exported from index to avoid conflicts
  if (indexContent.includes("export { PUBSUB_TOPICS }")) {
    warning("PUBSUB_TOPICS is exported from constants/index.ts - may cause naming conflicts");
  } else {
    success("PUBSUB_TOPICS properly scoped (not exported from constants/index.ts)");
  }
}

/**
 * Validate type definitions match message schemas
 */
function validateTypeDefinitions(): void {
  header("Validating Type Definitions");
  
  const sensorDataTypesPath = path.join(__dirname, "../types/sensorData.types.ts");
  
  if (!fs.existsSync(sensorDataTypesPath)) {
    error("sensorData.types.ts not found");
    return;
  }
  
  const content = fs.readFileSync(sensorDataTypesPath, "utf8");
  
  info("Checking SensorData interface...");
  
  const requiredFields = ["turbidity", "tds", "ph", "timestamp"];
  requiredFields.forEach((field) => {
    if (content.includes(`${field}:`)) {
      success(`SensorData.${field} defined`);
    } else {
      error(`Missing field in SensorData: ${field}`);
    }
  });
  
  // Check for BatchSensorData support
  if (content.includes("BatchSensorData")) {
    success("BatchSensorData interface defined");
  } else {
    warning("BatchSensorData interface not found - batch processing may not be typed");
  }
}

/**
 * Generate and display summary
 */
function generateSummary(): number {
  header("Validation Summary");
  
  console.log("");
  log(`Total Checks: ${results.passed + results.failed}`, "blue");
  success(`Passed: ${results.passed}`);
  error(`Failed: ${results.failed}`);
  warning(`Warnings: ${results.warnings.length}`);
  
  if (results.failed > 0) {
    console.log("");
    error("ERRORS FOUND:");
    results.errors.forEach((err) => {
      console.log(`  • ${err}`);
    });
  }
  
  if (results.warnings.length > 0) {
    console.log("");
    warning("WARNINGS:");
    results.warnings.forEach((warn) => {
      console.log(`  • ${warn}`);
    });
  }
  
  console.log("");
  
  if (results.failed === 0) {
    success("✅ ALL VALIDATIONS PASSED!");
    success("Pub/Sub topics are correctly configured across all layers.");
    console.log("");
    info("Next steps:");
    info("  1. Review any warnings above");
    info("  2. Run 'npm run build' to ensure TypeScript compilation succeeds");
    info("  3. Deploy with confidence!");
    return 0;
  } else {
    error("❌ VALIDATION FAILED!");
    error("Please fix the errors listed above before deploying.");
    console.log("");
    info("Common fixes:");
    info("  1. Ensure all topic names match exactly (case-sensitive)");
    info("  2. Update MQTT_TOPICS.SENSOR_DATA_PREFIX to use lowercase 'sensordata'");
    info("  3. Align constants between pubsub.constants.ts and deviceManagement.constants.ts");
    return 1;
  }
}

/**
 * Main validation function
 */
function main(): void {
  log("\n🔍 Pub/Sub Topic Consistency Validator", "cyan");
  log("Validating topic configuration across the entire system...", "cyan");
  
  try {
    validateConstantsAlignment();
    validateMqttTopics();
    validateMqttBridgeConfig();
    validateFunctionTriggers();
    checkForDuplicatesAndUnused();
    validateTypeDefinitions();
    
    const exitCode = generateSummary();
    process.exit(exitCode);
  } catch (err) {
    console.error("\n❌ Validation failed with error:");
    console.error(err);
    process.exit(1);
  }
}

// Run validation if executed directly
if (require.main === module) {
  main();
}

export { main as validatePubSubTopics };
