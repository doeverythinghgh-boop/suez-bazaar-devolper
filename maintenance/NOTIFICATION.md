# Central Notification System (Architecture Report)

This report outlines the final structure and programming logic of the notification system in the project, focusing on precision targeting features, global filtering, and message flexibility.

---

## 1. Settings and Control Management
The activation/deactivation of notifications for each party (purchaser, seller, courier, administration) is controlled via a central settings file.

### A. Cloud Storage (`Cloudflare R2`)
- **File:** `notification_config.json` stored in the cloud to ensure immediate synchronization.
- **Management:** The `notification/page/settings.js` interface allows the administrator to modify settings at runtime.

### B. Verification Engine (`notificationTools.js`)
- **Function:** `shouldNotify(stepId, role)`
- **Functionality:** Checks global settings before executing any sending operation, ensuring user privacy and administrative decisions are respected.

---

## 2. Content and Message Management
All texts and messages have been separated from the source code and aggregated into a JSON file for ease of maintenance and translation.

### A. Template File (`notification_messages.json`)
- **Path:** `notification/notification_messages.json`
- **Functionality:** Contains notification titles and texts divided by event (purchase, stage activation) and targeted role.
- **Loading Mechanism:** Loaded locally as part of the project files to ensure speed and ease of management within the code.
- **Dynamic Templates:** The file supports the use of variables like `${orderId}` and `${stepName}` which are replaced programmatically.

### B. Template Engine
- **Function:** `getMessageTemplate(path, placeholders)`
- **Functionality:** Extracts the appropriate template from the JSON file and replaces all passed variables with actual values using Regular Expressions.
- **Security:** The system provides fallback messages in case of file loading failure to ensure service continuity.

---

## 3. Targeting Strategy

The system has moved from collective notifications for the entire order to **Item-level Awareness**.

### A. Identity Tracking in Memory
The `seller_key` for each product is saved in the local data structure (`stateManagement.js`) when the order is loaded, allowing the system to immediately identify the owner of each product.

### B. Smart Extraction Functions (`steperNotificationLogic.js`)
- `extractRelevantSellerKeys`: Returns a list of only the sellers affected by the updated products.
- `extractRelevantDeliveryKeys`: Returns a list of only the couriers responsible for shipping or delivering the concerned products.

---

## 4. Global Actor Filtering

Golden Rule: **"No one receives a notification about an action they performed themselves"**.

- **Identifier:** `actingUserId` (current user identifier) is passed from Popups to the notification engine.
- **Application:** The actor is excluded from all recipient lists (purchaser, sellers, couriers) before the actual sending process begins.

---

## 5. Technical and Performance Considerations

1. **Lazy Loading:** The messages file is fetched only when a notification is first needed and stored in the cache to reduce data consumption.
2. **Parallel Dispatch:** `Promise.all` is used to send notifications to all parties simultaneously.
3. **Independence:** The notification system is completely separated from the core data saving logic.
4. **Dev Logs:** The system includes detailed tracking statements following the flow of activation operations, permissions, and token synchronization, clarifying system permission status (OS Permission) and the execution environment (Web vs Android). These logs are prefixed with `[Dev]` or `[FCM]` to aid developers in debugging.

---

## 6. Admin Panel Notifications

The system provides tools for administrators to communicate directly with users via instant FCM notifications through `adminPanel.html`.

### A. Individual Sending (`sendAdminNotification`)
- **Function:** `window.sendAdminNotification(userKey)` in the `adminPanel.js` file.
- **Mechanism:**
    1. Extracts the message text from the corresponding input field for the user in the table.
    2. Fetches tokens for the concerned user using `getUsersTokens([userKey])`.
    3. Sends the notification using the default administrator title (`admin_manual`).

### B. Broadcast Sending (`sendBroadcastNotification`)
- **Function:** `window.sendBroadcastNotification()` in the `adminPanel.js` file.
- **Mechanism:**
    1. **Filtering:** Fetches a list of all users and filters those who have `hasFCMToken`.
    2. **Aggregation:** Extracts all valid tokens from the server for these users.
    3. **Broadcasting:** Sends the message to all target devices in parallel using `sendNotificationsToTokens`.

---

## 7. User Notification Control

The system allows users to have full control over receiving alerts on their devices via a Master Toggle located on the `notifications.html` page.

### A. User Interface
- **Location:** Top of the notification list on the `notifications.html` page.
- **Element:** A switch toggle with the ID `notification-master-toggle`.
- **Design:** Adheres to the application's visual identity while providing immediate feedback via `SweetAlert2`.

### B. Programming Logic (`notifications.js`)
- **State Saving:** The user's choice is stored in `localStorage` under the key `notifications_enabled`.
- **Double Verification:** Upon page initialization, the system matches `localStorage` with the **actual browser permission** (`Notification.permission`). In the **Android environment**, the system prioritizes `localStorage` and assumes permission is granted if `window.Android` is present, as the native app manages system-level permissions.
- **Dynamic UI (`updateToggleUI`):** Title and description texts change immediately based on the state:
    - **When Enabled:** The title "Notifications Enabled" appears with a descriptive text confirming readiness to receive alerts.
    - **When Disabled:** The title "Enable Notifications" appears with text urging the user to turn on the feature.
- **When Enabling (`enableNotifications`):**
    1. **Permission Check:** `Notification.permission` is verified.
    2. **Handling Denial:** 
        - In **Web**: An instructional alert is displayed to the user to unblock from browser settings.
        - In **Android**: `window.Android.requestNotificationPermission()` is called to show the system permission request again.
    3. **Request and Sync:** If permission is available, `Notification.requestPermission()` is called, followed by `setupFCM()` to synchronize the token.
- **When Disabling (`disableNotifications`):** Clears tokens, stops initialization, and changes texts immediately to reflect the disabled state.

### C. Startup Integration (`index.js` & `sessionManager.js`)
The application respects the user's decision at every startup; if the state is disabled in `localStorage` or permissions are not granted, `setupFCM()` is avoided entirely. In **Android**, if an FCM token already exists during login, `notifications_enabled` is automatically set to `'true'` to ensure immediate synchronization.

---

## 8. Notification Deletion Feature

The system allows users to clean their logs by deleting notifications individually and permanently.

### A. Programming Mechanism
- **Database:** The `deleteNotificationFromDB(id)` function in `notification-db-manager.js` is called to permanently remove the record from `IndexedDB`.
- **User Interface:** A "trash can" button is used next to the read status, with a motion effect (Fade-out & Slide) and confirmation via `SweetAlert2`.
- **Synchronization:** A `notificationDeleted` event is broadcast to update the UI in all open tabs.

---

## 9. Modular Architecture

To ensure ease of maintenance, the notification page logic has been divided into four specialized files:

1. **`notifications.js` (Core):** The main file containing the data structure (`state`) and initialization format.
2. **`notifications-ui.js` (UI):** Responsible for rendering the list, pop-up messages (Toast), and date formatting.
3. **`notifications-logic.js` (Logic):** Processes filtering operations, statistics calculation, and local storage management.
4. **`notifications-actions.js` (Actions):** Manages events, database interaction, and requesting OS permissions.

---
> [!NOTE]
> This control is performed at the device level. If a user disables or deletes on one phone, other devices linked to the same account will not be affected.
