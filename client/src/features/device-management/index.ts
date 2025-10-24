/**
 * Device Management Feature - Barrel Export
 * Central export point for device management feature
 */

// Services
export * from './services/deviceApiClient';

// Pages
export { default as DeviceManagementPage } from './pages/DeviceManagementPage';

// Components
export { default as AddEditDeviceModal } from './components/AddEditDeviceModal';
export { default as RegisterDeviceModal } from './components/RegisterDeviceModal';
export { default as ViewDeviceModal } from './components/ViewDeviceModal';
