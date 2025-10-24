/**
 * Firebase Cloud Functions - Main Entry Point
 */

// Authentication Functions
export {beforeCreate} from "./auth/beforeCreate";
export {beforeSignIn} from "./auth/beforeSignIn";

// HTTP Functions
export {deviceManagement} from "./http/deviceManagement";
export {generateReport} from "./http/generateReport";

// Pub/Sub Functions
export {processSensorData} from "./pubsub/processSensorData";
export {autoRegisterDevice} from "./pubsub/autoRegisterDevice";
export {monitorDeviceStatus} from "./pubsub/monitorDeviceStatus";

// Scheduler Functions
export {checkStaleAlerts} from "./scheduler/checkStaleAlerts";
export {sendDailyAnalytics} from "./scheduler/sendDailyAnalytics";
