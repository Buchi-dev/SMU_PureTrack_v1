/**
 * Cloud Functions Entry Point
 * Exports all Firebase Cloud Functions for deployment
 */

// ===========================
// AUTHENTICATION TRIGGERS
// ===========================
export {beforeCreate} from "./auth/beforeCreate";
export {beforeSignIn} from "./auth/beforeSignIn";

// ===========================
// CALLABLE FUNCTIONS
// ===========================
export {AlertsCalls} from "./callable/Alerts";
export {DevicesCalls} from "./callable/Devices";
export {ReportCalls} from "./callable/Reports";
export {UserCalls} from "./callable/Users";

// ===========================
// PUB/SUB TRIGGERS
// ===========================
export {aggregateAlertsToDigest} from "./pubsub/aggregateAlertsToDigest";
export {autoRegisterDevice} from "./pubsub/autoRegisterDevice";
export {processSensorData} from "./pubsub/processSensorData";

// ===========================
// SCHEDULED FUNCTIONS
// ===========================
export {checkOfflineDevices} from "./schedulers/checkOfflineDevices";
export {checkStaleAlerts} from "./schedulers/checkStaleAlerts";
export {sendAlertDigests} from "./schedulers/sendAlertDigests";
export {sendUnifiedAnalytics} from "./schedulers/send_DWM_Schedulers";
