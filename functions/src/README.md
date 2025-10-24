# Firebase Functions - Modular Structure

This directory contains all Firebase Cloud Functions for the PureTrack Water Quality Monitoring System, organized in a clean modular structure.

## Directory Structure

```
functions/src/
├── index.ts                    # Main entry point - exports all functions
├── config/
│   ├── firebase.ts             # Firebase Admin & Pub/Sub initialization
│   ├── email.ts                # Email transporter configuration
│   └── alerts.ts               # Default alert thresholds
├── types/
│   └── index.ts                # All TypeScript interfaces and types
├── utils/
│   ├── email-templates.ts      # HTML email templates
│   ├── validators.ts           # Input validation helpers
│   └── helpers.ts              # Shared utility functions
├── auth/
│   ├── beforeCreate.ts         # User creation blocking function
│   └── beforeSignIn.ts         # Sign-in blocking function
├── http/
│   ├── deviceManagement.ts     # Device CRUD operations & commands
│   └── generateReport.ts       # Report generation (Water Quality, Compliance, etc.)
├── pubsub/
│   ├── processSensorData.ts    # Process IoT sensor data & create alerts
│   ├── autoRegisterDevice.ts   # Auto-register devices from MQTT
│   └── monitorDeviceStatus.ts  # Monitor device health status
└── scheduler/
    ├── checkStaleAlerts.ts     # Hourly check for unresolved critical alerts
    └── sendDailyAnalytics.ts   # Daily analytics email at 6:00 AM
```

## Exported Functions

### Authentication Functions
- `beforeCreate` - Initialize user profile on first sign-in
- `beforeSignIn` - Validate user status before sign-in

### HTTP Functions
- `deviceManagement` - Device CRUD and command publishing
- `generateReport` - Generate water quality and compliance reports

### Pub/Sub Functions
- `processSensorData` - Process sensor readings and trigger alerts
- `autoRegisterDevice` - Auto-register devices from MQTT bridge
- `monitorDeviceStatus` - Track device online/offline status

### Scheduler Functions
- `checkStaleAlerts` - Monitor critical alerts (runs hourly)
- `sendDailyAnalytics` - Send daily email reports (runs at 6:00 AM)

## Key Improvements

1. **Modular Organization**: Functions are organized by category (auth, http, pubsub, scheduler)
2. **Clean Separation**: Configuration, types, and utilities are separated from business logic
3. **Reusable Components**: Helper functions and email templates are shared across modules
4. **Type Safety**: All TypeScript interfaces are centralized in `types/index.ts`
5. **No Testing Functions**: Testing and debug functions have been removed for production

## Development

To deploy functions:
```bash
cd functions
npm run build
firebase deploy --only functions
```

To test locally:
```bash
npm run serve
```

## Notes

- All testing functions (testAlertNotification, setupNotificationPreferences, listNotificationPreferences) have been removed
- Functions are production-ready with proper error handling and logging
- Email notifications are configured for water quality alerts
- Scheduler functions run on Asia/Manila timezone
