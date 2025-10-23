# 🛠️ System Development Guide
## Water Quality Monitoring and Management System

**Document Version**: 1.0  
**Last Updated**: October 23, 2025  
**System Version**: 2.0.0  

---

## 📋 Table of Contents

1. [Google Authentication Page](#1-google-authentication-page)
2. [Account Completion Page](#2-account-completion-page)
3. [Account Pending Page](#3-account-pending-page)
4. [Account Inactive/Suspended Page](#4-account-inactivesuspended-page)
5. [Admin Dashboard Page](#5-admin-dashboard-page)
6. [Admin Device Management Page](#6-admin-device-management-page)
7. [Admin Sensor Reading Page](#7-admin-sensor-reading-page)
8. [Admin Analytics Page](#8-admin-analytics-page)
9. [Admin Alerts Page](#9-admin-alerts-page)
10. [Admin User Management Page](#10-admin-user-management-page)
11. [Admin Reports Page](#11-admin-reports-page)
12. [Admin Settings Page](#12-admin-settings-page)
13. [Staff Dashboard Page](#13-staff-dashboard-page)
14. [Staff Devices Page](#14-staff-devices-page)
15. [Staff Readings Page](#15-staff-readings-page)
16. [Staff Analytics Page](#16-staff-analytics-page)
17. [Technical Implementation](#technical-implementation)
18. [Database Schema](#database-schema)
19. [Security Implementation](#security-implementation)
20. [Deployment Guide](#deployment-guide)

---

## 1. Google Authentication Page

**File Location**: `client/src/pages/auth/GoogleAuth.tsx`  
**Route**: `/auth/login`  
**Access**: Public (unauthenticated users only)

The Google Authentication Page is the main entry point to the Water Quality Monitoring and Management System. It uses Google Login through Firebase Authentication (Gen 2) for secure and efficient user authentication. The system ensures that only verified school members with an @smu.edu.ph email address can log in. When a user visits this page, they are presented with a clean and professional login interface displaying the system logo, a welcome message, and a prominent "Sign in with Google" button.

When a user clicks the "Sign in with Google" button, the system opens a Google OAuth popup window. This popup prompts the user to select their Google account or enter their credentials if they are not already signed in to Google. Behind the scenes, Firebase Authentication handles the entire OAuth flow, securely communicating with Google's authentication servers to verify the user's identity. The popup method provides a seamless user experience, keeping the user on the same page while authenticating through Google's secure interface.

Once the user successfully authenticates with Google, Firebase returns a credential object containing the user's email address, unique identifier (UID), display name, and profile picture. The system immediately validates the email domain to ensure it ends with @smu.edu.ph. This validation is performed both on the client side and server side through a Cloud Function called `beforeUserSignedIn`. If the email does not match the required domain, the authentication is rejected, and the user sees an error message explaining that only @smu.edu.ph email addresses are allowed to access the system.

After successful domain validation, the system checks whether the user is new or existing by querying the Firestore database for a user document matching the authenticated user's UID. If no document exists, the user is identified as new and is automatically redirected to the Account Completion Page. For existing users, the system retrieves their profile data from Firestore, including their role (Admin or Staff) and status (Pending, Approved, or Suspended). Based on this information, the system makes a routing decision. Approved users are redirected directly to their appropriate dashboard—Admin users go to `/admin/dashboard` and Staff users go to `/staff/dashboard`. Users with Pending status are redirected to the Account Pending Page, and suspended users are sent to the Account Inactive Page with a message explaining that their account has been disabled.

The page includes comprehensive error handling to manage various authentication scenarios. If the user closes the Google popup before completing authentication, the system displays a friendly message allowing them to try again. If the browser blocks popups, the system detects this and instructs the user to allow popups for the site. Network errors, too many authentication attempts, and other Firebase-specific errors are all handled gracefully with clear, actionable error messages displayed to the user.

Throughout the authentication process, the page shows appropriate loading states with animated spinners, ensuring users understand that the system is processing their request. The interface is fully responsive, adapting to different screen sizes from desktop monitors to mobile phones. The page utilizes the system's theme configuration, supporting both light and dark modes based on user preference or system settings.

---

## 2. Account Completion Page

**File Location**: `client/src/pages/auth/AccountCompletion.tsx`  
**Route**: `/auth/complete-account`  
**Access**: Authenticated users with incomplete profiles

The Account Completion Page is the section where new users must provide more details that are not available from their Google account. When a user first signs in with Google and their account is created in the system, only basic information is captured—their email address and Google display name. However, the organization requires additional information to maintain complete and accurate user records. This page serves as a mandatory step for new users before they can proceed to use the system.

Upon arriving at this page, users see a welcoming message explaining that they need to complete their profile to continue. The page displays a clean, well-organized form with clearly labeled input fields. The form requests the following information: First Name, Last Name, Middle Name (optional), Department, and Phone Number. Each field includes helpful placeholder text and validation rules to guide users in providing correctly formatted information. For example, the phone number field expects a specific format and provides visual feedback if the entered number doesn't match the expected pattern.

The Department field is presented as a dropdown selection list containing all the departments within the organization. This ensures consistency in department naming and prevents spelling variations that could complicate data analysis and reporting. Common departments might include Engineering, Information Technology, Health Sciences, Business Administration, Education, and others relevant to the institution. The system administrator can configure the list of available departments through the Admin Settings Page.

If the user's Google account already provided a display name, the system intelligently pre-fills the First Name and Last Name fields by parsing the display name. For example, if the Google display name is "John Doe", the system automatically populates "John" in the First Name field and "Doe" in the Last Name field. Users can modify these pre-filled values if needed. This smart pre-filling reduces the amount of typing required and speeds up the completion process.

The form includes real-time validation on all required fields. As users type, the system provides immediate feedback about whether their input meets the requirements. For instance, if the phone number format is incorrect, a red error message appears below the field explaining the expected format. Once all required fields are correctly filled and the form passes validation, the "Complete Profile" button becomes active and clickable. If required fields are empty or contain invalid data, the button remains disabled, preventing incomplete submissions.

When the user clicks the "Complete Profile" button, the system validates the entire form one final time to ensure data integrity. If validation passes, the system sends the profile information to Firestore, updating the user document with the provided details. The update includes setting the user's status to "Pending" since all new users require administrator approval before gaining full access to the system. The system also records a timestamp indicating when the profile was completed. After the Firestore update completes successfully, a success message briefly appears, and the user is automatically redirected to the Account Pending Page.

The page handles various error scenarios gracefully. If there's a network error during form submission, the system displays an error message and allows the user to try again without losing the information they entered. If a user somehow navigates to this page after already completing their profile, the system detects this by checking for existing profile data in Firestore and automatically redirects them to the appropriate page based on their account status. This prevents duplicate profile submissions and ensures a smooth user experience.

Throughout the profile completion process, users can see their Google profile picture displayed at the top of the form, providing visual confirmation that they're logged in with the correct account. The page includes a "Sign Out" option in case users need to switch to a different Google account. The interface is fully responsive, ensuring that users completing their profiles on mobile devices have the same smooth experience as desktop users.

---

## 3. Account Pending Page

**File Location**: `client/src/pages/auth/PendingApproval.tsx`  
**Route**: `/auth/pending-approval`  
**Access**: Authenticated users with Pending status

The Account Pending Page acts as a waiting area for newly registered users whose accounts are still under review. After completing their profile on the Account Completion Page, users are automatically redirected here. This page serves as a holding area that prevents access to the main system while clearly communicating to users that their account is being processed. The page is designed to set appropriate expectations and provide users with information about what happens next.

When users arrive at this page, they see a large clock icon and a prominent message stating "Account Pending Approval". Below this heading, the page displays a personalized message addressing the user by name, such as "Hello, John Doe! Your account is currently pending administrator approval." This personalization helps users confirm they're viewing information about their own account. The page explains that an administrator needs to review and approve their account before they can access the system features.

The page displays the user's email address and the date and time when they registered, providing context about when their approval request was submitted. This information helps users understand how long they've been waiting and gives them reference information if they need to contact an administrator about their account status. The page also includes estimated approval time information, explaining that account reviews typically occur within 24 hours during business days, though actual approval times may vary.

Every new user is automatically assigned a default data structure upon registration. The default data includes fields such as department, email, name, phone number, role, and account status. Typically, the role will be "Staff" and the status will be "Pending" until an administrator reviews and approves the user. The system also records a unique user identifier (UUID) and the last login timestamp. This default structure ensures that all user records in the database follow a consistent format and contain all necessary information for the approval process.

One of the most important features of the Account Pending Page is its real-time status monitoring capability. The page establishes a real-time connection to Firestore using a snapshot listener on the user's document. This listener continuously monitors the user's account status field in the database. When an administrator changes the user's status from "Pending" to "Approved" in the Admin User Management Page, the change is immediately detected by the listener. Within milliseconds, the Account Pending Page automatically processes this change and redirects the user to their appropriate dashboard without requiring them to refresh the page or take any action.

This real-time update mechanism provides a seamless experience. If a user leaves this page open in their browser while an administrator approves their account in another location, the user will be automatically redirected to the dashboard as soon as the approval occurs. The system determines which dashboard to display based on the user's assigned role—Admin users are sent to `/admin/dashboard` while Staff users go to `/staff/dashboard`. If for some reason the status changes to "Suspended" instead of "Approved", the page redirects the user to the Account Inactive Page.

The page includes a "Refresh Status" button that users can click to manually trigger a status check. While the real-time listener typically makes this unnecessary, the manual refresh option provides users with a sense of control and can be useful in rare cases where the real-time connection is interrupted. When clicked, the button queries Firestore for the latest user document and updates the page accordingly. A loading spinner appears during the refresh to provide visual feedback.

For convenience, the page includes a "Sign Out" button that allows users to log out of their account. Some users may prefer to sign out and check their email for a notification rather than leaving the page open. The sign-out functionality uses Firebase Authentication's signOut method, which terminates the user's session and redirects them back to the Google Authentication Page. The page also provides contact information for technical support or administrative inquiries, giving users a way to follow up if their approval takes longer than expected.

The user interface uses calming colors and clear typography to create a professional waiting experience. The page includes subtle animations, such as a gently pulsing clock icon, to indicate that the system is actively monitoring for changes. Empty space is used effectively to avoid overwhelming users with too much information. The design ensures that users understand they're in a temporary holding state and that action is being taken on their account, reducing anxiety about whether their registration was successful.

---

## 4. Account Inactive/Suspended Page

**File Location**: `client/src/pages/auth/AccountInactive.tsx` and `AccountSuspended.tsx`  
**Route**: `/auth/account-inactive` and `/auth/account-suspended`  
**Access**: Authenticated users with Suspended status

The Account Inactive or Account Suspended Page is displayed when a user attempts to access the system but their account has been suspended by an administrator. This page serves as a clear notification that the user's access has been restricted and explains the situation without granting any access to system features. Account suspension is an administrative action typically taken when a user violates system policies, is no longer employed by the organization, or requires temporary access restriction for security or compliance reasons.

When a suspended user attempts to sign in, the Cloud Function `beforeUserSignedIn` detects the suspended status and can either block the sign-in entirely or allow authentication but restrict access. In the current implementation, suspended users can authenticate (so their identity is verified) but are immediately redirected to this page when they try to access any protected route. This approach provides a better user experience by explaining why access is denied rather than showing a generic authentication error.

The page displays a prominent "stop" or "warning" icon in red, immediately communicating that there's an issue with the account. The main heading reads "Account Suspended" or "Account Inactive" depending on the specific page. Below the heading, a message explains that the user's account access has been restricted. The message maintains a professional tone while being direct about the situation: "Your account has been suspended. You cannot access the system at this time."

The page includes information about why an account might be suspended, such as policy violations, inactivity, security concerns, or administrative decisions. While the page doesn't reveal specific reasons for the suspension (as this information should be communicated privately through email or in-person conversation), it does provide general categories to help users understand possible causes. This prevents confusion and reduces support inquiries from users who are uncertain about what happened.

Contact information is prominently displayed on the page, directing suspended users to reach out to the system administrator or IT department for more information about their account status. The page shows an email address (such as admin@smu.edu.ph) and possibly a phone number for administrative support. Users are encouraged to contact these resources to learn more about their suspension, discuss any concerns, and potentially work toward account reinstatement if appropriate.

The page includes a "Sign Out" button that allows users to end their session. This is the only interactive element on the page besides the support contact information. Once signed out, users return to the Google Authentication Page. The suspended status prevents them from accessing any other pages in the system—if they try to navigate to a protected route, they are immediately redirected back to this account inactive page.

From a technical perspective, this page works in conjunction with the authentication context and route protection system. The `useAuth` hook in the authentication context provides an `isSuspended` computed property that returns true when the user's status field equals "Suspended". Protected route components check this property and redirect suspended users to this page. Additionally, the route configuration includes this page in a way that it's accessible to authenticated users regardless of their status, ensuring suspended users can see the explanation rather than encountering errors.

If an administrator changes a user's status from "Suspended" back to "Approved", and the user is currently viewing this page with an active session, the real-time Firestore listener in the authentication context detects the change. The user is then automatically redirected to their appropriate dashboard without needing to sign out and sign back in. This provides a smooth experience if an administrator reinstates access while the user is actively checking their status.

The page uses alert colors and iconography that clearly communicate the negative status without being overly harsh. The design maintains the system's overall aesthetic while appropriately conveying seriousness. The typography is clear and readable, and the spacing provides a calm, organized layout despite the negative message. The page is fully responsive, displaying correctly on all device sizes.

---

## 5. Admin Dashboard Page

**File Location**: `client/src/pages/admin/AdminDashboard.tsx`  
**Route**: `/admin/dashboard`  
**Access**: Approved Admin users only

The Admin Dashboard Page serves as the central control area for system administrators. It is the first page administrators see after signing in and provides a comprehensive overview of the entire water quality monitoring system. This page is designed to give administrators a complete snapshot of system performance, water quality conditions, and active alerts at a glance, enabling quick assessment and informed decision-making. The dashboard centralizes key metrics and provides navigation pathways to all major administrative functions.

At the top of the dashboard, administrators see a row of statistics cards displaying critical system metrics. The first card shows the total number of registered devices in the system, with separate counts for devices that are currently online, offline, in error state, or under maintenance. This device status overview helps administrators immediately identify if there are connectivity issues across the monitoring network. Each status category uses distinct color coding—green for online devices, gray for offline, red for errors, and yellow for maintenance mode—making it easy to spot problems at a glance.

The second statistics card displays the total number of active alerts currently requiring attention. This count includes all unresolved water quality alerts across all monitored locations. The card shows a breakdown by severity level: Critical alerts (displayed in red), Warning alerts (in orange), and Advisory alerts (in blue). Administrators can immediately see if there are any critical water quality issues demanding urgent attention. Clicking on the alerts card navigates directly to the Admin Alerts Page for detailed investigation.

Additional statistics cards show the total number of sensor readings received in the last 24 hours, the number of registered users in the system, and the number of reports generated this month. These metrics provide administrators with a sense of system activity levels and help identify trends over time. For example, a sudden drop in sensor readings might indicate device connectivity issues, while an increase in users might suggest growing adoption of the monitoring system.

Below the statistics cards, the dashboard displays a real-time alerts panel showing the most recent water quality alerts. This panel typically displays the last 5-10 alerts in a list or table format. Each alert entry shows the device name and location, the parameter that triggered the alert (TDS, pH, or turbidity), the current value, the threshold that was exceeded, the severity level, and the time the alert was created. Color-coded badges make it easy to identify alert severity at a glance. Administrators can click on any alert to view more details or take action such as acknowledging or resolving the alert.

The dashboard includes an interactive data visualization section displaying recent water quality trends. This section typically shows line charts or area charts plotting TDS, pH, and turbidity values over the past 24 hours or 7 days. Administrators can toggle between different time ranges using tabs or a date range picker. The charts use distinct colors for each parameter and include threshold lines indicating safe operational ranges. This visualization helps administrators spot patterns, identify gradual degradation in water quality, and understand whether recent alerts are isolated incidents or part of a trend.

A device status map or list shows all registered devices with their current operational status. Each device entry displays the device name, location (building, floor, room), connection status (online/offline indicator with timestamp), and the most recent sensor readings. Color-coded status indicators make it easy to scan the list and identify which devices might need attention. Clicking on a device name navigates to the Device Management Page with that specific device selected for detailed inspection.

The dashboard includes quick action buttons that provide shortcuts to frequently used administrative tasks. These might include "Register New Device", "Generate Report", "Manage Users", "View All Alerts", and "System Settings". These buttons save administrators time by providing single-click access to common workflows without needing to navigate through multiple menu levels.

A recent activity feed displays the latest system events, such as new device registrations, user approvals, report generations, and significant status changes. This feed helps administrators stay informed about what's happening across the system and can serve as a high-level audit trail. Each activity entry includes a timestamp, a description of the event, and the user who performed the action (if applicable).

The dashboard is built to refresh automatically at regular intervals (typically every 30 seconds or 1 minute) to ensure administrators are viewing current data. Real-time updates from Firebase Realtime Database ensure that new sensor readings appear without requiring manual page refreshes. A "Last Updated" timestamp and a manual "Refresh" button give administrators control over data currency.

The dashboard layout is responsive and adapts to different screen sizes. On desktop displays, statistics cards are arranged in a row across the top, with charts and data tables displayed side by side. On tablets and mobile devices, the layout stacks vertically for optimal viewing. The interface uses the system's theme configuration, supporting both light and dark modes. The navigation sidebar remains accessible at all times, allowing administrators to quickly jump to other sections of the admin panel.

All data displayed on the dashboard respects the administrator's access permissions and role-based controls. The dashboard queries Firestore for devices, alerts, and users, and retrieves recent sensor readings from Firebase Realtime Database. Error handling ensures that if data fails to load, appropriate error messages or empty states are displayed rather than breaking the interface.

---

## 6. Admin Device Management Page

**File Location**: `client/src/pages/admin/DeviceManagement/DeviceManagement.tsx`  
**Route**: `/admin/device-management`  
**Access**: Approved Admin users only

The Admin Device Management Page allows administrators to manage IoT devices connected to the water monitoring network. This page is the central hub for all device-related operations, including viewing device status, registering new devices, updating device information, and removing devices from the system. The page provides complete visibility into all hardware assets in the monitoring infrastructure and ensures that only properly configured and authorized devices can transmit sensor data.

When administrators open this page, they see a comprehensive table or card grid displaying all devices in the system. The system automatically detects any new devices that appear on the MQTT Bridge. When an unregistered device is detected—meaning an IoT device has successfully connected to the MQTT broker and is publishing messages but hasn't been formally added to the system database—it is automatically added to the device management list but remains marked as "Unregistered". This automatic detection happens through the MQTT bridge service, which monitors for new device identifiers appearing in MQTT topic messages and publishes notifications to a Pub/Sub topic that triggers a Cloud Function to create a basic device record in Firestore.

The device table is organized into two tabs: "Registered Devices" and "Unregistered Devices". This separation makes it immediately clear which devices are fully operational and which require administrator attention. The Registered Devices tab shows all devices that have been properly configured with location information and approved for monitoring. Each device entry displays the device ID (a unique identifier such as the MAC address or a custom alphanumeric code), device name (a human-friendly label like "Main Building - 3rd Floor Lab"), location details (building, floor, room), current status (online, offline, error, or maintenance), last seen timestamp (when the device last transmitted data), and action buttons for viewing details, editing, or deleting the device.

Device status is displayed using color-coded badges for quick visual scanning. Online devices show a green badge, offline devices show a gray badge, devices in error state show a red badge, and devices under maintenance show a yellow badge. The status is updated in real-time based on the device's last communication timestamp—if a device hasn't sent data within a specified timeout period (such as 5 minutes), it's automatically marked as offline. The "last seen" timestamp helps administrators determine if a device outage is recent or has been ongoing for an extended period.

The Unregistered Devices tab displays devices that the system has detected on the MQTT network but which haven't been formally registered. Each entry shows the device ID and the timestamp when the device was first detected. Administrators must manually register these devices before they can contribute sensor data to the system. An "Register Device" button next to each unregistered device opens the registration modal.

When an administrator clicks "Register Device" for an unregistered device or clicks the "Add Device" button to manually register a device, a registration modal appears. This modal form collects essential information about the device. The form includes fields for Device Name (a descriptive label), Building (selected from a dropdown of configured buildings), Floor (a text or number input), Room (room number or name), and optional fields like Firmware Version and Installation Notes. The device ID is automatically filled from the detected device or can be manually entered when adding a device that hasn't been auto-detected yet.

The registration process also includes a field for selecting sensor types. Administrators can specify which sensors are attached to this device—TDS sensor, pH sensor, turbidity sensor, temperature sensor, or other configured sensor types. This information helps the system correctly interpret incoming data messages and display appropriate units and thresholds for each parameter. Some advanced configurations might allow administrators to set device-specific thresholds that override the system-wide default thresholds for water quality parameters.

Once administrators submit the registration form, the system updates the device document in Firestore, setting the `registered` field to true and populating all the location and configuration details. The device immediately begins contributing to the monitoring system—its sensor readings are stored, displayed on dashboards, and checked against alert thresholds. A success message confirms the registration, and the device moves from the Unregistered Devices tab to the Registered Devices tab.

For registered devices, administrators can click an "Edit" button to modify device information. The edit modal is similar to the registration modal but pre-filled with the device's current information. Administrators can update the device name, change its location if it's been physically moved, adjust sensor configurations, or add notes. Changes are saved immediately to Firestore and reflected throughout the system. This edit capability is essential for maintaining accurate device records as the physical infrastructure changes over time.

The page includes a "View Details" button for each device that opens a detailed information modal. This modal displays comprehensive device information including all configuration details, connection history (timestamps of when the device came online and went offline), the most recent sensor readings with timestamps, any active alerts associated with the device, and a mini-chart showing recent data trends from the device. This detailed view helps administrators troubleshoot device issues and assess device performance without navigating to multiple pages.

Administrators can also change a device's operational status using a status dropdown or dedicated buttons. They can manually mark a device as "Under Maintenance" when performing physical service, which prevents alert generation from that device and displays a maintenance indicator on dashboards. When maintenance is complete, the status can be changed back to online. Devices in error state can be reset or removed if they're permanently decommissioned.

The page includes a delete functionality for removing devices from the system. When an administrator clicks the delete button for a device, a confirmation modal appears warning that deletion is permanent and will remove all associated sensor reading history. This safeguard prevents accidental deletions. Upon confirmation, the device document is deleted from Firestore, and any associated data in Firebase Realtime Database is also removed. Deleted devices can be re-registered later if needed, but historical data will be lost unless separately backed up.

A search bar at the top of the page allows administrators to quickly find specific devices by typing part of the device name, ID, or location. The search filters the device list in real-time as the administrator types. Additional filter options allow filtering by status (show only online devices, only offline devices, etc.) or by location (show only devices in a specific building). These filtering capabilities are essential in large deployments with dozens or hundreds of devices.

The page includes bulk action capabilities for managing multiple devices simultaneously. Administrators can select multiple devices using checkboxes and perform batch operations such as changing status for multiple devices at once, exporting device information to a CSV file for inventory purposes, or performing bulk deletions. This saves time when managing large device fleets.

A device statistics summary appears at the top of the page, showing the total number of devices, how many are currently online versus offline, how many are registered versus unregistered, and any devices currently in error state. These statistics provide a quick health check of the overall monitoring infrastructure.

The page refreshes automatically at regular intervals to show current device status. Administrators can also manually trigger a refresh using a "Refresh" button. Real-time updates from Firestore ensure that when devices come online or go offline, the status changes appear without requiring a manual refresh. The page uses Firebase Realtime Database snapshots to detect device activity in real-time, providing the most current status information possible.

---

## 7. Admin Sensor Reading Page

**File Location**: `client/src/pages/admin/DeviceReadings/DeviceReadings.tsx`  
**Route**: `/admin/device-readings` or `/admin/sensor-readings`  
**Access**: Approved Admin users only

The Admin Sensor Reading Page displays all real-time sensor data sent from the registered devices. Through this page, administrators can visualize readings for TDS (Total Dissolved Solids), pH levels, and turbidity values as they update live from the monitoring network. This page is essential for real-time monitoring of water quality conditions across all monitored locations, allowing administrators to observe current conditions and identify issues as they develop.

When administrators open this page, they see a device selector dropdown at the top that lists all registered devices in the system. Each device in the dropdown is labeled with its descriptive name and location, such as "Main Building - 3rd Floor Lab" or "Science Wing - Chemistry Department". Administrators select a device from this dropdown to view its sensor readings. The first online device is typically selected by default when the page loads, immediately displaying live data without requiring additional clicks.

Once a device is selected, the page displays the current sensor readings in large, prominent display cards. Each water quality parameter has its own card showing the current value, the unit of measurement, and a visual indicator of whether the value is within safe ranges. The TDS card displays the current TDS reading in parts per million (ppm), the pH card shows the pH level (typically on a scale from 0 to 14), and the turbidity card displays turbidity in Nephelometric Turbidity Units (NTU). Additional sensors like temperature might also be displayed if the device supports them.

Each sensor reading card uses color coding to indicate the status of the measurement. Values within the safe operational range are displayed with green accents or checkmarks. Values approaching warning thresholds show yellow or orange indicators, signaling that the parameter is close to problematic levels but not yet critical. Values that exceed critical thresholds are displayed in red with warning icons, immediately alerting administrators to water quality issues requiring attention. This color-coded system allows administrators to assess water quality status at a glance without needing to compare numbers against threshold tables.

Below the current reading cards, the page displays real-time line charts showing the trend of each parameter over time. These charts typically plot the last hour, 6 hours, 24 hours, or 7 days of data, selectable via tabs or a time range selector. The charts update automatically as new data arrives, with new data points appearing on the right side of the chart and older data scrolling off the left side. The X-axis shows timestamps, and the Y-axis shows the sensor values. Horizontal threshold lines are drawn on the charts indicating warning and critical thresholds, making it easy to see when and how frequently readings exceed safe levels.

The system continuously collects sensor readings through MQTT communication. Here's how the data flow works: IoT devices publish sensor readings to the MQTT broker (HiveMQ) every few seconds or minutes (depending on configuration). The MQTT bridge service subscribes to these messages, processes them, and publishes them to Google Cloud Pub/Sub. A Cloud Function triggered by Pub/Sub receives the sensor data, validates it, and writes it to two locations: Firebase Realtime Database for immediate display on live dashboards, and Firestore for long-term historical storage and analysis.

The Admin Sensor Reading Page queries Firebase Realtime Database for the most current readings, which typically update every few seconds. This provides near-instantaneous visibility into current water conditions. The real-time database structure is optimized for frequent reads and writes, storing only the latest readings and a limited rolling window of recent history. For longer-term historical data displayed in the charts, the page queries Firestore, which stores complete sensor reading history with indexes optimized for time-range queries.

An auto-refresh toggle switch allows administrators to enable or disable automatic updates. When enabled, the page refreshes sensor readings every 5-10 seconds, ensuring the displayed data is always current. A dropdown next to the toggle allows administrators to select the refresh interval (5 seconds, 10 seconds, 30 seconds, 1 minute, etc.). When auto-refresh is disabled, administrators can manually refresh using a "Refresh" button. A "Last Updated" timestamp shows when the data was last retrieved, helping administrators understand data currency.

The page includes a download button that allows administrators to export sensor readings for the selected device to a CSV file. Administrators can select a date range and click "Download Data" to receive a spreadsheet containing all sensor readings within that period. This export functionality is useful for creating custom reports, performing offline analysis, or archiving data for compliance purposes.

A data quality indicator shows the reliability of the sensor readings. If a device has recently reported data, the indicator shows green with text like "Data Current - Last update 15 seconds ago". If the device hasn't sent data recently but is still within the expected update interval, it shows yellow with "Data Slightly Delayed - Last update 3 minutes ago". If the device hasn't sent data for an extended period, the indicator shows red with "Data Stale - Last update 20 minutes ago" or "Device Offline". This helps administrators distinguish between genuine water quality issues and sensor/connectivity problems.

The page displays device connection information including the device's IP address (if available), connection quality indicator, signal strength (for wireless devices), and uptime statistics. This technical information helps administrators troubleshoot connectivity issues. If a device is offline, the page displays the timestamp when it was last seen and suggests possible reasons for the disconnection.

Administrators can view sensor readings for individual devices and switch between different sensors to examine water quality trends per device location. The device selector dropdown remains visible at all times, allowing quick switching between devices. A "View All Devices" option in the dropdown opens a grid or list view showing current readings from all devices simultaneously. This multi-device view is useful for comparing water quality across different locations or identifying which areas have the best or worst water quality.

The page includes quick action buttons for common tasks. A "Generate Alert" button allows administrators to manually create an alert for the current readings if they notice something concerning that didn't automatically trigger the threshold-based alert system. A "View Device Details" button navigates to the Device Management Page with the selected device's information. A "View Alert History" button shows all past alerts associated with the selected device.

The interface is fully responsive, adapting to different screen sizes. On mobile devices, the sensor reading cards stack vertically, and charts are optimized for smaller screens with touch-friendly zoom and pan controls. The page supports both light and dark themes, with chart colors adjusting appropriately to maintain readability in either mode.

---

## 8. Admin Analytics Page

**File Location**: `client/src/pages/admin/Analytics/Analytics.tsx`  
**Route**: `/admin/analytics`  
**Access**: Approved Admin users only

The Admin Analytics Page focuses on the historical and statistical analysis of water quality data. This page presents graphs, charts, and trends showing the changes in water parameters over time, enabling administrators to understand long-term patterns, identify recurring issues, and make data-driven decisions about water quality management. While the Sensor Reading Page shows real-time current data, the Analytics Page provides the bigger picture through comprehensive historical analysis.

When administrators access the Analytics Page, they first encounter a time range selector that allows them to choose the period they want to analyze. Users can select from preset time ranges such as "Last 24 Hours", "Last 7 Days", "Last 30 Days", "Last 3 Months", or "Last Year". Alternatively, a custom date range picker allows selecting any specific start and end dates. This flexibility enables both short-term incident investigation and long-term trend analysis. The selected time range applies to all charts and statistics on the page, providing a consistent analytical view across all metrics.

A device selector allows administrators to choose whether to view analytics for a specific device, a group of devices (such as all devices in a particular building), or system-wide aggregated data from all devices. This multi-level analysis capability helps administrators understand both individual device performance and overall system trends. For example, viewing all devices system-wide might reveal institution-wide water quality patterns, while focusing on a single building might highlight localized issues.

The main content area displays several interactive charts and graphs. The primary visualization is typically a multi-line chart showing TDS, pH, and turbidity trends over the selected time period. Each parameter is represented by a different colored line, and a legend clearly identifies which line represents which parameter. The chart includes hover tooltips that display exact values and timestamps when administrators move their mouse over data points. This allows detailed inspection of specific moments in time without cluttering the chart with too many labels.

Below or alongside the trend chart, the page displays statistical summary cards for each water quality parameter. These cards show key statistical measures calculated from the data in the selected time range. For TDS, pH, and turbidity, the system calculates and displays: average (mean) value, median value, minimum value recorded, maximum value recorded, standard deviation (indicating variability), and the number of data points collected. These statistics provide quantitative insights into water quality patterns. For example, a high standard deviation might indicate inconsistent water quality or sensor issues, while a low standard deviation suggests stable conditions.

A threshold exceedance analysis section shows how often readings exceeded warning and critical thresholds during the selected period. This might be displayed as a percentage ("TDS exceeded warning threshold 15% of the time") or as absolute counts ("45 instances of pH exceeding critical threshold"). Bar charts or horizontal progress bars provide visual representation of threshold violations, making it easy to identify which parameters are most problematic. This analysis helps administrators prioritize maintenance efforts and understand the severity and frequency of water quality issues.

The page includes a time-of-day analysis chart that breaks down water quality by hour of day. This heat map or bar chart shows whether water quality issues tend to occur at specific times. For instance, TDS levels might spike during morning hours when water usage increases, or pH might drift during overnight periods when circulation is reduced. Identifying these temporal patterns helps administrators understand the root causes of water quality variations and schedule maintenance or interventions at optimal times.

A day-of-week analysis shows how water quality varies across different days. This weekly pattern analysis can reveal whether weekends (when building occupancy is lower) have different water quality characteristics than weekdays. Such insights inform operational decisions about monitoring frequency, maintenance scheduling, and staffing needs.

The Analytics Page includes a comparison feature that allows administrators to compare two different time periods. For example, comparing this month to last month, or comparing this year's summer period to last year's summer period. Side-by-side charts or overlaid line graphs show how the two periods differ, highlighting improvements or deteriorations in water quality over time. Statistical comparison tables show percentage changes in key metrics, making it easy to quantify progress or identify emerging problems.

A device performance comparison section shows how different devices compare to each other. This might be displayed as a bar chart ranking devices by average water quality scores, or as a table showing key metrics for each device. This comparison helps administrators identify which locations consistently have the best or worst water quality, informing decisions about where to focus improvement efforts or which locations might serve as benchmarks for others.

The page includes an alert frequency analysis showing which devices generate the most alerts, which parameters trigger alerts most often, and how alert frequency has changed over time. A chart might show the number of alerts per day or per week over the selected period, with bars color-coded by severity (Critical, Warning, Advisory). This analysis helps administrators understand the alert burden and evaluate whether alert thresholds are appropriately configured.

For more advanced analysis, the page may include correlation analysis showing relationships between different parameters. For example, a scatter plot might show the correlation between TDS and turbidity, helping administrators understand whether high TDS tends to coincide with high turbidity. Such insights can inform predictive maintenance and help identify systemic issues versus isolated sensor problems.

Data completeness indicators show what percentage of expected sensor readings were successfully received during the selected period. Missing data might indicate device connectivity issues, sensor failures, or data pipeline problems. A completeness score is displayed for each device and for the system overall, helping administrators assess the reliability of the monitoring infrastructure.

The Analytics Page includes export functionality allowing administrators to download analysis results as PDF reports or CSV data files. The PDF export includes all charts, statistics, and summary text, creating a professional report suitable for sharing with stakeholders, including in presentations, or archiving for compliance purposes. CSV export provides raw statistical summaries for further analysis in spreadsheet applications or statistical software.

A "Share Analysis" feature might allow administrators to generate a shareable link or email a summary of the current analysis to other staff members. This facilitates collaboration and information sharing without requiring all team members to log into the system and navigate to the Analytics Page.

The page automatically caches analysis results for frequently accessed time ranges, improving performance when administrators repeatedly view the same analysis. However, a "Refresh Data" button allows forcing a requery of the database to ensure the most current data is included, which is particularly important when analyzing recent time periods where new data continues to arrive.

All charts on the Analytics Page are interactive, supporting zoom, pan, and filtering operations. Administrators can click on legend items to show or hide specific data series, zoom into specific time ranges for closer inspection, and export individual charts as image files. These interactive features make the Analytics Page a powerful tool for detailed data investigation.

---

## 9. Admin Alerts Page

**File Location**: `client/src/pages/admin/ManageAlerts/ManageAlerts.tsx`  
**Route**: `/admin/alerts` or `/admin/manage-alerts`  
**Access**: Approved Admin users only

The Admin Alerts Page is where the system records and displays all alerts related to abnormal water quality readings. When the system detects that a sensor reading has exceeded safe levels or thresholds, it automatically generates an alert through a Cloud Function that monitors incoming sensor data. These alerts are stored in Firestore and shown to administrators on this page for review, action, and resolution. The Alerts Page serves as the centralized command center for responding to water quality incidents and tracking alert history.

When administrators open the Alerts Page, they see a comprehensive table listing all alerts in the system, ordered by creation time with the most recent alerts at the top. Each alert entry in the table displays essential information including the alert ID (a unique identifier), device name and location where the alert originated, the water quality parameter that triggered the alert (TDS, pH, or turbidity), the severity level (Advisory, Warning, or Critical), the current status (Active, Acknowledged, or Resolved), the sensor value that triggered the alert, the threshold that was exceeded, a brief message describing the issue, and the timestamp when the alert was created.

The severity levels are clearly distinguished through color coding. Critical alerts, which indicate dangerous water quality conditions requiring immediate attention, are displayed with red badges and warning icons. Warning alerts, indicating conditions approaching dangerous levels, use orange or yellow badges. Advisory alerts, which represent minor deviations from optimal conditions, use blue badges. This color-coding system allows administrators to quickly identify the most urgent issues requiring immediate response.

Alert status is tracked through three states. Active alerts are newly generated and haven't been reviewed yet—these are displayed prominently and often generate notifications. Acknowledged alerts have been seen by an administrator who has indicated they're aware of the issue and taking action, but the alert hasn't been resolved yet. Resolved alerts represent issues that have been addressed and are no longer active. The status field includes timestamps indicating when acknowledgment or resolution occurred and which administrator performed these actions, creating an audit trail.

At the top of the page, summary statistics cards show the current alert situation: total number of active alerts, breakdown by severity (how many Critical, how many Warning, how many Advisory), number of acknowledged but unresolved alerts, and total alerts generated in the last 24 hours. These statistics give administrators an immediate understanding of the overall alert landscape and help prioritize their attention.

Filtering and search capabilities allow administrators to find specific alerts or focus on particular subsets. A severity filter dropdown lets administrators view only Critical alerts, only Warning alerts, or any combination. A status filter shows only Active, only Acknowledged, or only Resolved alerts. A device filter dropdown lists all devices, allowing administrators to see alerts from a specific location. A date range filter shows alerts created within a specific time period. A text search box allows searching by alert message content, parameter name, or other text fields. These filters can be combined—for example, showing only Active Critical alerts from a specific building.

When administrators click on an alert row, a detailed alert modal or side panel opens displaying complete information about the alert. This detailed view shows all the basic information from the table plus additional context: the complete alert message with detailed explanation, historical sensor values leading up to the alert (showing whether the parameter was trending toward the threshold or spiked suddenly), threshold configuration details, related alerts (other alerts from the same device or for the same parameter), action history (when the alert was acknowledged or resolved and by whom), any notes or comments added by administrators, and quick links to view the device details or current sensor readings.

Administrators can take action on alerts directly from this detailed view or through batch operations on selected alerts. The "Acknowledge" action marks an alert as acknowledged, recording the administrator's user ID and the timestamp. This indicates that someone is aware of the issue and investigating or taking corrective action. Acknowledging an alert typically stops it from generating additional email notifications. The "Resolve" action marks an alert as resolved, indicating the issue has been addressed and water quality has returned to normal. Administrators can add a resolution note explaining what action was taken. Resolved alerts are typically hidden from the main active alerts view but remain in the system for historical analysis.

In addition to the manual acknowledgment and resolution workflow, the system can automatically resolve alerts when sensor readings return to safe levels. If an alert was triggered by TDS exceeding 1000 ppm, and subsequent readings show TDS has dropped back below 500 ppm for a sustained period, the Cloud Function monitoring new sensor data can automatically update the alert status to resolved and add a note indicating "Automatically resolved - parameter returned to safe range". This automation reduces administrative burden while maintaining an accurate record of issues and their resolution.

In addition to displaying alerts on this page, the system automatically sends out email notifications to administrators and staff through integrated Google Email services using Nodemailer. When a new alert is created, especially Critical or Warning severity alerts, the system immediately sends an email to all users with Administrator or Staff roles who have email notifications enabled in their preferences. The email includes the alert severity, device location, parameter name, current value, threshold exceeded, and a direct link to the alert details on the Alerts Page. This ensures that responsible personnel are notified of water quality issues even when they're not actively viewing the dashboard.

The feature also supports daily, weekly, and monthly alert summaries so staff can remain informed about recent water quality incidents and trends even without checking the dashboard continuously. At a configured time each day (such as 8:00 AM), the system sends a summary email listing all alerts generated in the past 24 hours, organized by severity and device. Weekly and monthly summaries provide similar rolled-up views over longer periods. These summary emails help administrators track overall trends and ensure they haven't missed any significant issues. Administrators can configure email preferences through the Admin Settings Page, specifying which types of alerts trigger immediate emails, what time daily summaries should be sent, and whether they want weekly and monthly summaries.

The Alerts Page includes bulk action capabilities. Administrators can select multiple alerts using checkboxes and perform batch operations such as acknowledging all selected alerts at once, resolving multiple alerts, or exporting selected alerts to a CSV file for external analysis or reporting. Bulk actions are particularly useful after resolving a widespread issue that generated alerts across multiple devices.

An alert trends chart at the top of the page shows the number of alerts generated over time, broken down by severity. This trend line helps administrators identify whether alert frequency is increasing (possibly indicating systemic problems or deteriorating water quality), decreasing (suggesting improvements), or remaining stable. Spikes in the chart might correlate with specific events like maintenance activities or equipment failures.

This quick-alert mechanism ensures that issues are detected and addressed promptly. The combination of real-time sensor monitoring, automatic alert generation based on threshold exceedance, immediate email notifications, and a centralized alert management interface creates a responsive system that minimizes the time between when a water quality issue develops and when corrective action is taken. This rapid response capability is essential for protecting public health and maintaining compliance with water quality standards.

The Alerts Page supports role-based access control. While administrators can acknowledge and resolve alerts, Staff users might have read-only access to view alerts but not modify them, depending on the system's configuration. This ensures that alert status changes are controlled and traceable to specific authorized individuals.

---

## 10. Admin User Management Page

**File Location**: `client/src/pages/admin/UserManagement/UserManagement.tsx`  
**Route**: `/admin/users` or `/admin/user-management`  
**Access**: Approved Admin users only

The Admin User Management Page is the section where administrators can fully manage user accounts throughout their entire lifecycle. From this page, admins can view all registered users, edit their details, suspend or reactivate users, delete accounts when necessary, and most importantly, approve pending user registration requests. The page also provides the ability to assign or change user roles such as Admin or Staff. These roles control what level of access each person has in the system through a role-based access control (RBAC) model, ensuring secure operations and properly distributed access permissions across the system.

When administrators open the User Management Page, they see a tabbed interface organizing users by their account status. The tabs typically include "All Users", "Pending Approval", "Approved Users", and "Suspended Users". This organization makes it easy for administrators to focus on users requiring specific actions. The "Pending Approval" tab is particularly important as it shows all users who have completed their profile but are waiting for administrator approval before gaining access to the system.

Each tab displays a table listing users with key information columns. The table shows the user's full name (first name, middle name, last name), email address, department, phone number, assigned role (Admin or Staff), current account status (Pending, Approved, or Suspended), the date and time when the user registered, and the last login timestamp if the user has successfully logged in. Action buttons for each user provide quick access to common operations: "View Details", "Edit", "Approve" (for pending users), "Suspend" (for approved users), "Reactivate" (for suspended users), and "Delete".

The Pending Approval tab is where administrators process new user registration requests. When a new user completes the Account Completion Page, their account appears in this tab with a "Pending" status. Administrators can review the user's information to verify they are legitimate members of the organization. The approval process is straightforward: administrators click the "Approve" button next to a pending user. A confirmation dialog appears asking the administrator to confirm the approval. Upon confirmation, the system updates the user's status field in Firestore from "Pending" to "Approved". This status change is detected immediately by the real-time listener on the Account Pending Page (if the user is currently viewing it), automatically redirecting them to their dashboard without requiring them to sign out and back in.

When approving a user, administrators also assign a role—either Admin or Staff. The default role for new users is typically "Staff", granting them monitoring and reporting capabilities without administrative privileges. If the new user should have full administrative access, the administrator can select "Admin" from a role dropdown before confirming the approval. Admin users have complete access to all system features including user management, device management, system settings, and all monitoring and reporting capabilities. Staff users have limited access: they can view the staff dashboard, monitor devices, view sensor readings, access analytics, and view alerts, but they cannot manage other users, register or modify devices, or change system settings. Regular users (if implemented) may have even more restricted access, perhaps limited to viewing public dashboards or reports. This granular role-based access control ensures that users can only perform actions appropriate to their job responsibilities.

The Edit User functionality allows administrators to modify user details. Clicking the "Edit" button for a user opens a modal form pre-filled with the user's current information. Administrators can update the user's name, department, phone number, and role. Changes to basic profile information (name, department, phone number) can typically be made by users themselves through a profile settings page, but administrators have override capability and can edit any user's information. Role changes and status changes are restricted to administrators only. When the administrator saves changes, the user document in Firestore is updated with the new values and an "updatedAt" timestamp is recorded.

The suspend functionality allows administrators to immediately revoke a user's access to the system. When an administrator clicks "Suspend" for a user, a confirmation dialog explains that the user will be logged out and unable to sign in until their account is reactivated. Upon confirmation, the user's status is changed from "Approved" to "Suspended" in Firestore. If the suspended user currently has an active session and is viewing any page in the system, the real-time Firestore listener in the authentication context detects the status change and immediately redirects them to the Account Inactive Page. Additionally, the next time the suspended user attempts to sign in, the `beforeUserSignedIn` Cloud Function detects the suspended status and rejects the authentication attempt, preventing access entirely.

The reactivate functionality reverses a suspension. Administrators can click "Reactivate" for a suspended user to change their status back to "Approved". This is useful when a suspension was temporary (perhaps due to a security investigation that concluded with no findings) or when a previously suspended user should regain access (such as an employee returning after a leave of absence). Reactivation is immediate—if the user is currently viewing the Account Inactive Page, they'll be automatically redirected to their dashboard as soon as the status change occurs.

The delete functionality permanently removes a user account from the system. This is the most severe action and should be used cautiously. When an administrator clicks "Delete" for a user, a prominent warning dialog appears explaining that deletion is permanent and will remove all user data. The administrator must type the user's email address or click a confirmation checkbox to proceed with deletion. Upon confirmation, the user's document is deleted from Firestore, their Firebase Authentication account is disabled or deleted (depending on configuration), and any user-specific data is removed. Historical records that reference the user (such as who acknowledged or resolved an alert, who registered a device, etc.) typically retain the user's ID or name for audit trail purposes even after account deletion.

A search bar at the top of the User Management Page allows administrators to quickly find specific users by typing part of their name, email address, or department. The search filters the user list in real-time. Dropdown filters allow filtering users by department, role, or status. For example, an administrator might want to view all Admin users, or all users in the Engineering department, or all users who have never logged in since account creation.

The page displays user statistics at the top: total number of registered users, number of pending approvals requiring attention, number of active (approved) users, number of suspended users, and optionally metrics like number of new users registered this month or average time from registration to first login. These statistics help administrators understand user growth, onboarding efficiency, and overall system adoption.

Bulk operations allow administrators to manage multiple users simultaneously. Administrators can select multiple users using checkboxes and perform batch actions such as approving all selected pending users at once, suspending multiple users, changing the department for multiple users, or exporting user information to a CSV file. Bulk operations are particularly useful during periods of high registration volume, such as at the beginning of a semester or when rolling out the system to a new department.

User activity information displayed on this page helps administrators identify inactive accounts that might need attention. For example, accounts that have been approved but never logged in might indicate users who are no longer interested or who encountered onboarding difficulties. Accounts that haven't logged in for several months might be candidates for suspension if the users have left the organization.

The User Management Page includes an activity log or audit trail showing recent user management actions. This log records when users were approved, suspended, reactivated, or deleted, and which administrator performed each action. This accountability mechanism is important for security and compliance purposes, ensuring that all access control decisions are traceable.

Some implementations of the User Management Page include email functionality allowing administrators to send messages to users directly from this interface. For example, administrators might send a welcome email to newly approved users, send instructions to pending users if additional information is needed, or send notifications to suspended users explaining why their access was revoked.

The interface is fully responsive and works well on various screen sizes. The page includes proper error handling for scenarios such as network failures during user updates, attempts to delete users who still have associated active sessions, or conflicts when multiple administrators try to modify the same user simultaneously. Success and error messages provide clear feedback about the results of administrative actions.
