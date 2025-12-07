/**
 * Feature Module Index
 * Barrel exports for all feature entities
 * 
 * @module feature
 */

// Export routes
export { default as alertRoutes } from './alerts/alert.routes';
export { default as userRoutes } from './users/user.routes';
export { default as deviceRoutes } from './devices/device.routes';
export { default as sensorReadingRoutes } from './sensorReadings/sensorReading.routes';
export { default as reportRoutes } from './reports/report.routes';
export { default as healthRoutes } from './health/health.routes';

// Export services
export { default as alertService } from './alerts/alert.service';
export { default as userService } from './users/user.service';
export { default as deviceService } from './devices/device.service';
export { default as sensorReadingService } from './sensorReadings/sensorReading.service';
export { default as reportService } from './reports/report.service';
export { default as healthService } from './health/health.service';

// Export models
export { default as Alert } from './alerts/alert.model';
export { default as User } from './users/user.model';
export { default as Device } from './devices/device.model';
export { default as SensorReading } from './sensorReadings/sensorReading.model';
export { default as Report } from './reports/report.model';
