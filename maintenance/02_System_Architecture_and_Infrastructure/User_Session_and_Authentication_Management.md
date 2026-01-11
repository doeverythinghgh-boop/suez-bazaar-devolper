# User Session and Authentication Management

This document details the centralized system for managing user identity, session state, and account security.

## 1. Session Manager (`js/auth/sessionManager.js`)
The `SessionManager` acts as the "Single Source of Truth" for user status.

### Features:
- **State Persistence**: Uses `localStorage` for long-term sessions and memory for temporary impersonation states.
- **Multi-Platform Logout**: Automatically triggers cleanup in both the web environment and the Android native bridge.
- **Impersonation Mode**: Allows Admins (defined in `ADMIN_IDS`) to view the application from a specific user's perspective while keeping the `originalAdminSession` for easy rollback.
- **Sync Logic**: Ensures language and theme preferences are preserved during the login/logout cycle.

## 2. Validation Engine (`js/auth/validators.js`)
Centralized validation rules (`AuthValidators`) for all user-related forms:
- **Phone Numbers**: Ensures uniqueness and correct regional format.
- **Usernames**: Filters for length and prohibited characters.
- **Passwords**: Enforces minimum security requirements and handles verification matching.

## 3. UI Abstraction (`js/auth/uiHelpers.js`)
Using `AuthUI`, all authentication-related feedback is standardized via SweetAlert2:
- `AuthUI.showLoading`: Blocking loader during API requests.
- `AuthUI.confirmPassword`: Secure prompt for sensitive actions (e.g., profile deletion).

## 4. Workflows
- **Account Creation**: Supports multi-stage registration for Sellers, including geographic coordinates, package limits, and delivery capabilities (`isDelevred`).
- **Profile Updates**: Intelligent diffing to only send modified fields to the server.
- **Re-authentication**: Forced token verification for high-security operations.

## 5. Global Config (`js/config.js`)
- **`baseURL`**: Centrally defined to allow switching between development and production environments.
- **`ADMIN_IDS`**: Array of sensitive IDs that bypass certain restrictions and access management features.
- **`window.userSession`**: Global shortcut for reading the current user's profile data.
