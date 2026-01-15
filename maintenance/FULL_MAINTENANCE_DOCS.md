# 📚 Consolidated Maintenance Documentation

> Generated on: 2026-01-15T06:53:42.211Z
> This file contains the full technical context of the Bazaar project.

---

## 📄 FILE: maintenance\01_Core_Principles_and_Standards\Coding_Standards_and_Conventions.md

```markdown
# Coding Standards and Conventions

## 1. Variable Scoping Rules
> [!IMPORTANT]
> **NO `let` or `const` in Global Scope**
> All variables declared in the global scope (outside of functions or modules) must use the `var` keyword. This ensures backward compatibility with certain legacy scripting environments used in the project. `let` and `const` should only be used inside block-level scopes or local functions where appropriate.

## 2. Documentation First Policy
Every file, function, and component must be fully documented using **JSDoc** standards.
- File headers must describe the file's responsibility.
- Function documentation must include `@param`, `@returns`, and a description of the logic.

## 3. Language Standards
- **Development Language**: English. All code comments, variable names, and documentation files must be written in English.
- **User Interface Language**: Arabic. Any text displayed to the final user (alerts, buttons, labels) must be strictly in Arabic.

## 4. UI/UX Restrictions
- **No Hover Effects**: Do not use `:hover` selectors or hover-dependent logic. Use `:active` or explicit click events instead.
- **No Gradients**: Use solid, flat colors only for all backgrounds and UI elements.
- **Responsive by Design**: All components must work correctly on mobile touchscreens and desktop environments without modification.

## 5. Maintenance and Safety
- **Error Handling**: Every API call or sensitive logic must be wrapped in `try...catch` blocks.
- **No Feature Loss**: Changes must be implemented without breaking existing features, states, or behaviors.
- **Atomic Commits**: Ensure code changes are logically grouped and modular.

## 6. Independent & Isolated Contexts Protocol
> [!WARNING]
> **Strict Isolation Rule**
> Any HTML file that functions independently (Standalone Page) or acts as an embedded context (iFrame) **DOES NOT** inherit resources, styles, or scripts from the main `index.html`.

### Mandatory Injection Policy
Developers **MUST** manually inject the following core dependencies into the `<head>` of any standalone/iframe HTML file to ensure feature parity and theming consistency:

1.  **Core Styles (Required for Dark Mode & Layout):**
    -   `style/variables.css`: **CRITICAL** for color tokens.
    -   `style/utilities.css`: **CRITICAL** for input visibility and global helpers.
    -   `style/modals-and-dialogs.css`: If using alerts/popups.
    -   `assets/fontawesome/css/all.css`: **Required** for Icons.


2.  **Core Scripts (Required for Logic & Bridge):**
    -   `js/config.js`: API Base URLs and keys.
    -   `js/globalVariable.js`: Session handling variables.
    -   `js/config.js`: API Base URLs and keys.
    -   `js/globalVariable.js`: Session handling variables.
    -   `js/network.js`: Connectivity checks.
    -   `assets/libs/sweetalert2/sweetalert2.all.min.js`: **Required** for Modern Mini Modals.


3.  **Localization Scripts (Required if using `data-lkey`):**
    -   **For iFrames:** Implement a bridge to `window.parent.langu`.
    -   **For Standalone:** Must implement `window.langu` logic (or load `js/index.js` if full app logic is needed).
    -   *Note:* Static pages (like Privacy Policy) can be hardcoded in Arabic or include a simple fetch script.


### Identified Isolated Contexts (Maintain this list):
-   `location/LOCATION.html` (Map iFrame)
-   `steper/stepper-only.html` (Progress Tracking iFrame)
-   `privacy.html` (Standalone)
-   `delete-account.html` (Standalone)
-   `offline.html` (Standalone)

**Violation Consequences:** Failing to inject these dependencies will result in transparent/invisible inputs in Dark Mode, broken API calls, and inconsistent UI rendering.


```

---

## 📄 FILE: maintenance\01_Core_Principles_and_Standards\Internationalization_and_Translation_Engine.md

```markdown
# Internationalization and Translation Engine

Bazaar uses a dynamic, modular translation system that supports instant language switching and interface direction changes (RTL/LTR) without page reloads.

## 1. Translation Storage (`lang/`)
- **`general.json`**: Central repository for shared strings (Header, Footer, common alerts, Buttons like "OK/Cancel").
- **Module Files**: (e.g., `login.json`, `productAdd.json`) contain strings specific to those pages.
- **Structure**: `{ "key": { "ar": "...", "en": "..." } }`.

## 2. The Programming Engine (`window.langu`)
Located in `js/index.js`, the engine works through:
1. **`window.appTranslations`**: A global object holding all merged JSON translations.
2. **`window.langu(key)`**: Retrieves the string for the current language.
3. **`window.applyAppTranslations()`**: 
   - Scans the DOM for `data-lkey`, `data-lkey-placeholder`, and `data-lkey-title`.
   - Injects translated text and updates `dir` (rtl/ltr) on the HTML root.

## 3. Advanced Translation Attributes
- **`data-lkey`**: Translates `textContent`. (Note: Place inside `<span>` if icons `<i>` are present to prevent overwriting them).
- **`data-lkey-placeholder`**: Translates input placeholders.
- **`data-lkey-title`**: Translates tooltips.

## 4. Integration Bridges
- **Iframe Bridge**: Iframes (Location, Stepper) link their local `window.langu` to the parent window's function to share the translation dictionary.
- **Android Sync**: Calls `window.Android.onLanguageChanged(lang)` to update the native app's strings (`androidLang.json`).
- **Logic Constants**: Use `window.langu()` inside JS code for dynamically generated alerts.

## 5. Best Practices
- **Logical CSS**: Use `inset-inline-start` instead of `left` to handle RTL/LTR automatically.
- **Preservation**: Language preference is saved in `localStorage` and persists through logouts and refreshes.
- **Categories**: Data files like `shared/list.json` use objects for titles: `"title": { "ar": "...", "en": "..." }`.

```

---

## 📄 FILE: maintenance\01_Core_Principles_and_Standards\Project_Overview_and_Governance.md

```markdown
# Project Overview and Governance

## General Description
The "Bazaar" (Suez Bazaar) project is a comprehensive localized e-commerce platform designed to facilitate transactions between buyers and sellers within the Suez region. It supports different user roles including Purchasers, Sellers, Delivery Personnel (Couriers), and Administrators.

## Core Objectives
1. **Local Marketplace**: Providing a centralized platform for Suez-based commerce.
2. **Multi-Role Support**: Tailored experiences for all participants in the commerce lifecycle.
3. **Cross-Platform Accessibility**: Functional across modern web browsers and native Android WebView environments.
4. **Performance & Efficiency**: Optimized media handling, smart caching, and CDN-independent asset hosting.

## Project Scope
The application manages:
- Physical product listings and sales.
- Service-based offerings (non-physical).
- Integrated delivery logistics with route optimization.
- Real-time notification systems (P2P and Server-side).
- Multi-language support (Primary: Arabic, Secondary: English).

## Institutional Rules
- **English-Only Documentation**: All internal technical documentation, comments, and code item naming must be in English.
- **Arabic-Only User Interface**: All text visible to the end-user must be in Arabic.
- **Zero-Hover Policy**: The interface must not rely on hover effects to ensure full compatibility with touch devices.
- **Privacy & Security**: Selective visibility of sensitive seller data and cost prices based on user role.

```

---

## 📄 FILE: maintenance\01_Core_Principles_and_Standards\Startup_and_Initialization_Protocols.md

```markdown
# Startup and Initialization Protocols

This protocol is designed for developers and AI agents (Agents) to follow at the start of every new session to ensure full alignment with the project's structure and rules.

## 📋 Direct Commands (Copy and Paste)

> **"Execute the Full Startup Protocol:**
> 1. Read the `frist.txt` file and treat it as the strict 'Code Constitution' (var rules, documentation, language).
> 2. Read and analyze all files in the `maintenance/` directory to build a current mental model.
> 3. Do not start any programming work until you confirm your understanding with the phrase: 'Thank you for explaining the project structure.'**

## 🛠 What Happens During This Protocol?

1. **Logic Alignment**: The agent remembers specific project constraints (e.g., prohibition of `let/const` in global scope, no gradients, no hover).
2. **Data Refresh**: The internal model is updated with API details, Stepper workflows, and order logic to prevent conflicts.
3. **Technical Handshake**: The process ends with a confirmation message, signifying the agent is 100% safe to receive complex tasks.

## ⚠️ Important Warnings
- **No Shortcuts**: Do not allow the AI agent to skip this step in new conversations.
- **Mental Model Integrity**: If the agent suggests a change that contradicts the maintenance documentation, re-run the protocol immediately.

*Last Updated: January 2026*

```

---

## 📄 FILE: maintenance\01_Core_Principles_and_Standards\Theming_and_Dark_Mode_Architecture.md

```markdown
# Theming and Dark Mode Architecture

The Bazaar project implements a robust, variable-based theme system that allows for seamless switching between Light and Dark modes.

## 1. Core Architecture
The system relies on CSS Variables (Custom Properties) defined in `style/variables.css`.

- **`:root`**: Defines variables for Light Mode.
- **`body.dark-theme`**: Overrides those variables for Dark Mode.

### Rule of Usage:
Developers must strictly use `var(--variable-name)` for colors. Hardcoded hex, RGB, or HSL values are strictly prohibited in component-specific CSS.

## 2. JavaScript Implementation
- **Storage**: User preference is saved in `localStorage` under the key `theme` (`dark` or `light`).
- **Initialization**: To prevent Flash of Unstyled Content (FOUC), the class is applied early in the `index.html` head or `js/user-dashboard.js`.
- **Logic**:
  ```javascript
  // Example Toggle Logic
  document.body.classList.toggle('dark-theme');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  ```

## 3. Handling Special Components
- **SweetAlert2**: Default styles are overridden in `style/modals-and-dialogs.css` using the `.modern-swal-popup` class to ensure readability in both modes.
- **Iframes (Stepper)**: Since iframes have isolated scopes, they have their own `steper/css/variables.css` and listen for `localStorage` changes to sync themes instantly.
- **Legacy Elements**: Inline styles with hardcoded colors must be replaced with semantic CSS classes that respect variables.

## 4. Key Files
- `style/variables.css`: The "Single Source of Truth" for all colors.
- `style/modals-and-dialogs.css`: Dark mode fixes for popups.
- `steper/css/variables.css`: Theme support for the Stepper module.

## 5. Global Style Injection (Mandatory)
To ensure full Dark Mode compatibility and consistent styling, **all** standalone HTML pages and iFrames isolated from the main `index.html` context **MUST** explicitly inject the following core stylesheets in their `<head>`:

1.  `style/variables.css` (Defines colors and theme variables)
2.  `style/utilities.css` (Global input fixes and generic helpers)
3.  `style/modals-and-dialogs.css` (If the page uses popups/alerts)

### List of Identified Standalone Contexts:
-   `location/LOCATION.html` (Map iFrame)
-   `steper/stepper-only.html` (Order Tracking iFrame)
-   `privacy.html`
-   `delete-account.html`
-   `offline.html`

> [!IMPORTANT]
> **Compliance Check:** Any new HTML page added to the project that runs independently must include these links. Failure to do so will result in broken inputs (e.g., invisible text) and theme inconsistencies.


```

---

## 📄 FILE: maintenance\01_Core_Principles_and_Standards\UI_UX_Design_Guidelines_and_Restrictions.md

```markdown
# UI/UX Design Guidelines and Restrictions

To maintain a consistent, premium, and functional experience across all devices (Mobile/Desktop), the following design rules are mandatory.

## 1. Aesthetic Identity
- **Solid Colors**: Do not use gradients (`linear-gradient`, `radial-gradient`, etc.). Use flat, solid colors from the project's curated palette.
- **Typography**: Use modern, clean fonts as defined in the global CSS.
- **Premium Feel**: Avoid generic default colors. Use sophisticated shades (e.g., specific HSL-tailored colors).

## 2. Interactive States
- **Hover Prohibition**: Since the app is touch-first, `:hover` states are forbidden. They cause sticky buttons and inconsistent behavior on mobile.
- **Alternative Feedback**: Use `:active` or `:focus` for tactile feedback. Changes in opacity or brightness are preferred over color shifts that might imply hover.

## 3. Layout and Responsiveness
- **Flexbox & Grid**: Rely on CSS Flexbox and Grid for all layouts.
- **Touch Targets**: Ensure all buttons and interactive elements have a minimum clickable area (44x44px target) to prevent accidental clicks.
- **Column Consistency**: Maintain grid column counts based on the `CATEGORIES_STYLES.md` formulas for harmony.

## 4. Components & Modals
- **SweetAlert2 (Swal)**: All alerts and confirmations must use the stylized SweetAlert2 library.
- **Consistent Icons**: Use FontAwesome icons consistently. Icons should be paired with text inside `<span>` tags for proper localization merging.

## 6. Modern Mini Modal Spec (Strict Reference Implementation)
Any "Modern Mini" modal MUST adhere to the following visual traits (based on "Pill Design" reference):

-   **Container**:
    -   `max-width`: **320px** (Mobile Safe Safe).
    -   `padding`: Balanced (`1.5rem 1rem`).
    -   `border-radius`: **24px** (Soft curvature).
    -   No borders in light mode.
-   **Typography**:
    -   **Title**: Dark/Almost Black (`#1f2937`). **NO BLUE TITLES**. Bold weight (800).
    -   **Body**: Medium Gray (`#6b7280`).
-   **Form Elements (Inputs/Selects)**:
    -   `line-height`: **1** (Strict).
    -   `height`: **auto** (No fixed heights).
    -   `padding`: Compact.
-   **Buttons (Pill Design)**:
    -   **Shape**: Fully Rounded / Pill Shape (`border-radius: 50px`).
    -   **Primary**: Solid Color (Primary Blue), Light Shadow.
    -   **Secondary (Cancel)**: **Ghost Style** (Light Gray Background `#f3f4f6`, Dark Text). **NO OUTLINE BUTTONS**.
    -   **Layout**: `flex-wrap: wrap`. Actions MUST wrap if content exceeds width. `row-gap: 10px`.
-   **Content Overflow Protection**:
    -   **NEVER** force `flex-wrap: nowrap` on actions.
    -   If 3 buttons are used, they must be allowed to stack vertically on small screens.
-   **Dark Mode**:
    -   Must map Light Gray backgrounds to Dark Gray (`#374151`) and Text to White/Light Gray.
- **Dark Mode Support**: Must fully respect the project's Dark Mode system, ensuring contrast and visibility are maintained.
- **Custom Styling**: Always use `buttonsStyling: false` to force custom CSS classes.
- **Translation**: All text (title, content, buttons) must be fetched via `window.langu(key)`.
- **Aesthetic Typography**: Text colors should vary and align with the project's brand palette to enhance visual appeal.
- **Direction**: Must support RTL/LTR and follow the `Tajawal` font family.

### Layout & Responsiveness
- **Size**: Max-width 300px on desktop; 90% flexible width on mobile.
- **Padding**: Minimal padding (`1rem`) for a compact footprint.
- **Borders**: Soft rounded corners (`12px`) and subtle shadow.
- **Buttons**:
    - Must stay in a **Single Row** (`flex-wrap: nowrap`) even on small screens.
    - Use `flex-direction: row-reverse` to prioritize the primary action based on language.
    - **Confirmed Button**: Primary project color, solid, 8px rounded.
    - **Cancel Button**: Transparent, 1px border, same size as confirm.

### Maintenance
- **Cleaning**: While icons and timers are optional, any unused containers should be hidden or removed via CSS to maintain a clean DOM.

## 5. Visual Hierarchy
- **Fusion Formulas**: When overlapping elements (like category grids and detail containers), use the exact mathematical formulas: `padding-bottom + gap = margin-top overlap` to ensure perfect visual alignment.
- **Z-Index**: Maintain a strict Z-index hierarchy to prevent element bleeding or hidden interactables.

```

---

## 📄 FILE: maintenance\02_System_Architecture_and_Infrastructure\Android_Native_Bridge_and_Sync_Protocol.md

```markdown
# Android Native Bridge and Sync Protocol

> [!CAUTION]
> **CRITICAL SYNCHRONIZATION WARNING**
> These bridge functions are the backbone of the Hybrid architecture. Any modification, renaming, or deletion of functions that interact with `window.Android` or `window.Localization` MUST be coordinated simultaneously with the Android project (`suez-bazaar`). Fail to do so will result in broken native features and potential app instability. IF YOU CANNOT SYNC BOTH PROJECTS, STOP MODIFICATION IMMEDIATELY.

The Suez Bazaar application follows a **Hybrid Architecture**, where a native Android shell hosts a WebView for the web front-end. To ensure a seamless experience, a stable communication bridge and synchronization protocol are implemented.

## 1. The Javascript Interface (`window.Android`)
The native app injects the `Android` object into the web context, enabling two-way communication.

### Web to Native Directives:
- `onUserLoggedIn(token)`: Passes the FCM token to the native system.
- `checkForUpdates()`: Triggers the native update manager.
- `requestNotificationPermission()`: Launches system-level permission dialogs.
- `onLanguageChanged(lang)`: Syncs the application language with `androidLang.json`.
- `onWebAppReady()`: Signal from Web indicating full stability, triggering immediate delivery of pending notifications.

## 2. The Localization Interface (`window.Localization`)
Used for maintaining high-quality native UI translations and system slogas.
- `getString(key)`: Fetches a string from the native merging engine.
- `updateSplashSlogans(json)`: (Signal-based) Web pushes the latest taglines and slogans to native storage. This ensures the native splash screen stays updated with the web's branding on every launch.

### Native to Web Callbacks:
- `saveNotificationFromAndroid(json)`: (Individual) Forwards a single incoming FCM message.
- `saveNotificationBatchFromAndroid(jsonArray)`: (Batch Sync) Delivers multiple queued notifications at once, usually triggered after `onWebAppReady`. This prevents ID collisions and ensures counter accuracy during cold starts.
- `onNativeLog(tag, msg)`: Pipes native Android Logcat messages into the web developer console (`[ANDROID]` prefix).

## 2. Silent Update Mechanism
- **Asset Loader**: Uses `WebViewAssetLoader` for high-speed local asset delivery.
- **Version Control**: Relies on `version.json` for granular hash comparison.
- **Conflict Prevention**: Uses a silent sync strategy that avoids blocking the user while updating background assets or translation files.

## 3. FCM Lifecycle in Android (Signal-based)
1. Web requests FCM key via bridge.
2. Native fetches/refreshes FCM token.
3. Native calls `window.onAndroidFcmReceived(token)` to push the token directly to the Web promise.
4. If Web isn't ready, Native falls back to injecting into `localStorage` under `android_fcm_key` as a recovery mechanism.
5. Web uses this key for all subsequent server-side targeting.

## 4. Device Adjustments
- **Geolocation**: Native Android intercepts `navigator.geolocation` requests for accuracy.
- **Links**: External links are forced into the system browser to prevent exiting the main app shell.
- **PWA UI**: Custom CSS hides "Install App" prompts when the app detects it's running inside the native WebView.

## 5. Security & Stability
- **ProGuard Rules**: Critical `@JavascriptInterface` methods are protected from obfuscation to maintain bridge naming integrity.
- **LogBridge**: A unified logging system that allows remote debugging of on-device native events via Chrome Remote Inspect.

---

## 6. Standards for New Bridge Implementations
To maintain the integrity of the Hybrid Bridge, all new functions must follow these standards:

### A. Web-to-Native Coordination
1.  **Sync-Requirement**: Never implement a bridge call (`window.Android.X`) unless the corresponding method exists in the Android Kotlin code.
2.  **Safety Checks**: Always wrap bridge calls in a check to ensure the environment is ready:
    ```javascript
    if (window.Android && typeof window.Android.newFunction === 'function') {
        window.Android.newFunction(params);
    }
    ```
3.  **JSDoc Documentation**: Every function calling the bridge must have a mandatory JSDoc warning:
    ```javascript
    /**
     * [!IMPORTANT] BRIDGE CALL: Coordinate with Android WebAppInterface.kt.
     */
    ```

### B. Protection from Obfuscation
The web build system (`build.js`) uses `javascript-obfuscator`. To ensure the bridge remains functional:
1.  **Global Scope**: Never use `let` or `const` in the global scope for bridge-related variables; use `var`.
2.  **Global Preservation**: The build script is configured with `renameGlobals: false`. Do not change this setting as it ensures `window.Android` calls remain literal and traceable.

### C. Maintenance Updates
- Any new bridge interaction must be documented in this file (`Android_Native_Bridge_and_Sync_Protocol.md`) under the relevant section.

```

---

## 📄 FILE: maintenance\02_System_Architecture_and_Infrastructure\PWA_Service_Workers_and_Offline_Strategies.md

```markdown
# PWA Service Workers and Offline Strategies

The Bazaar Progressive Web App (PWA) architecture ensures high availability, speed, and reliable notifications across all modern browsers.

## 1. Manifest & Identity (`manifest.json`)
- **Mode**: `standalone` (removes browser toolbar).
- **Start URL**: `/index.html`.
- **Identity**: Defines icons (192x192, 512x512) and theme colors for phone status bars.

## 2. Service Worker Dual-Engine
- **`sw.js`**: Main engine for asset caching and fetch interception.
- **`firebase-messaging-sw.js`**: Exclusively handles background Push notifications using Firebase v8.

## 3. Caching Strategies
| File Type | Strategy | Behavior |
| :--- | :--- | :--- |
| **HTML Navigation** | **Network First** | Tries network; falls back to `offline.html`. |
| **Static Assets (JS/CSS)** | **Cache First** | Immediate loading from cache; periodic refresh. |
| **Images** | **Cache First** | Local storage to save mobile data. |
| **API Data** | **Network Only** | Ensures live data for prices/orders. |

## 4. Offline Functionality
- **`offline.html`**: A standalone fallback page with self-contained translation logic.
- **IndexedDB**: Uses `bazaarAppDB` via `notification-db-manager.js` to store the last 50 notification logs for offline viewing.
- **Connection Indicators**: Real-time alerts inform the user when they are browsing in offline mode.

## 5. FCM Implementation in PWA
- **Token Exchange**: VAPID keys secure the registration process.
- **Ready State**: The system waits for `navigator.serviceWorker.ready` before initializing Firebase to prevent "No Active SW" errors.
- **Persistence**: Incoming messages are immediately saved to IndexedDB to ensure the unread badge count remains accurate even after app restarts.

## 6. Version Management & Forced Update
The `checkAppVersionAndClearData` tool in `js/tools.js` monitors `version.json`. If a mismatch is detected:
1. `localStorage` and `sessionStorage` are cleared (except Android keys).
2. All Active Service Workers are unregistered.
3. Cache Storage is wiped.
4. The page is reloaded to force 100% fresh assets.

```

---

## 📄 FILE: maintenance\02_System_Architecture_and_Infrastructure\SPA_Routing_and_Dynamic_Navigation.md

```markdown
# SPA Routing and Dynamic Navigation

Bazaar is built as a Single Page Application (SPA) using a custom routing engine that manages dynamic content loading and container visibility.

## 1. The Core Loader (`mainLoader`)
Located in `js/forms.js`, the `mainLoader` is responsible for fetching HTML fragments and injecting them into the DOM.

### Implementation Details:
- **Double Buffering**: Content is loaded into a hidden memory container first to ensure scripts are completely executed before display, preventing visual flickering.
- **Script Handling**: Dynamically loaded scripts are wrapped in Immediately Invoked Function Expressions (IIFE) to prevent global scope pollution.
- **Auto-Translation**: Calls `window.applyAppTranslations()` immediately after a successful load.

## 2. Navigation Management
- **`LOADER_REGISTRY`**: A global array that tracks all active containers. It allows for "Smart Hiding" where opening a new module automatically hides siblings unless otherwise specified.
- **`containerGoBack()`**: Manages the internal navigation stack, ensuring that closing a child container correctly restores the state and visibility of the parent.
- **Reload Policy**: The `reload: true` flag should only be used when fresh data is mandatory, as it bypasses the internal DOM cache.

## 3. Specialized Loading Tools (`js/tools.js`)
- **`insertUniqueSnapshot`**: An advanced injector that includes timestamps for script versioning, uses IIFE for isolation, and maintains internal caching for frequently used components.
- **`loader`**: A lightweight alternative for simple HTML injections that don't require full registry tracking.

## 4. Container Mapping
The layout in `index.html` is divided into root containers (e.g., `#index-app-header-container`) and page-specific containers. Every dynamic route must have a corresponding container ID defined in the loader logic.

## 5. Category Selection Routing
The `CategoryModal` system uses a specialized workflow:
1. User selects categories.
2. `ProductStateManager` records the choice.
3. `loadProductForm` calculates the destination (e.g., `productAdd` vs `productAdd2`) and triggers the route.

```

---

## 📄 FILE: maintenance\02_System_Architecture_and_Infrastructure\User_Session_and_Authentication_Management.md

```markdown
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

```

---

## 📄 FILE: maintenance\03_Business_Logic_and_Core_Features\Advertisement_Management_and_Caching.md

```markdown
# Advertisement Management and Caching

The advertisement system provides high-impact visual marketing while maintaining extreme performance and offline capability.

## 1. Asset Storage & Manifest
- **Source of Truth**: `advertisements.json` stored in a Cloudflare R2 bucket.
- **Metadata**: Each ad entry includes an image URL, a title, and a `searchQuery` for redirection.
- **Sync Strategy**: All ad updates are parallelized. The system updates the manifest only after images are successfully verified in R2.

## 2. Image Processing Pipeline
- **Optimization**: Images are converted to WebP and resized to optimal dimensions on upload to save bandwidth.
- **Self-Cleaning**: The `build.js` or admin tools automatically delete old images from R2 when an advertisement is replaced or removed, preventing storage bloat.

## 3. UI Display Module (`pages/advertisement/`)
- **Integration**: Injected into `index.html` via `<div id="advertisement-section">`.
- **UX Features**: 
  - Responsive circular slider with touch support.
  - Auto-play functionality with smart pause on interaction.
  - Direct redirection: Clicking an ad performs a global search based on the pre-defined `searchQuery`.

## 4. Caching & Invalidation
- **Local Storage**: Fetched ad data is cached in `localStorage` with a 1-hour expiration.
- **Versioning**: The system checks `api/updates` for a timestamp. If a global content update is detected, the ad cache is cleared immediately regardless of age.

## 5. Maintenance Guidelines
- Ensure `R2_PUBLIC_URL` is correctly configured in the admin panel.
- Advertisement images must follow a naming convention (ID-based) to ensure cache consistency.
- Any manual change to `advertisements.json` requires a manual cache clear in the developer console for testing.

```

---

## 📄 FILE: maintenance\03_Business_Logic_and_Core_Features\Order_Lifecycle_and_Stepper_Status_System.md

```markdown
# Order Lifecycle and Stepper Status System

The Stepper module is the primary interface for tracking the progress of an order through 7 distinct technical statuses across 4 visual stages.

## 1. The Status Matrix
| Status Key | Description |
| :--- | :--- |
| **PENDING** | Default state upon order creation. |
| **CONFIRMED** | Accepted and verified by the seller. |
| **SHIPPED** | Handed over to delivery or physically sent. |
| **DELIVERED** | Receipt confirmed by the purchaser. |
| **CANCELLED** | Voided by the purchaser during review. |
| **REJECTED** | Declined by the seller (e.g., out of stock). |
| **RETURNED** | Attempted delivery failed; item returned to seller. |

## 2. Roles and Permissions Matrix
- **Admin**: Full override capability. Can modify any stage.
- **Buyer**: Controls "Review" and "Delivered" stages.
- **Seller**: Controls "Confirmed" and "Shipped" stages for their items.
- **Courier**: Views pickup details and confirms "Shipped" or "Delivered".

## 3. Data Integrity: The `order_status` Blob
Order history is stored as a composite string in the database: `StepID # Timestamp # JSON_Blob`.

### JSON Blob Contents:
- Individual item statuses (mapped by ID).
- **Time Stamps**: `__date_step-confirmed__`, etc.
- **Locks**: `__confirmation_locked_{ID}__` to prevent post-save tampering.

## 4. Sequential Validation (`workflowLogic.js`)
Stages must be activated in a strict sequence: **1. Review → 2. Confirmed → 3. Shipped → 4. Delivered**. A later stage cannot be activated if the previous one is inactive, ensuring logical flow.

## 5. Technical Bridging
The Stepper runs in an isolated Iframe. Data is injected by the parent `sales-movement.js` into `window.globalStepperAppData`.
- **Single Source of Truth**: UI state only updates after a `200 OK` response from the `/api/update-item-status` or `/api/orders` endpoints.
- **Auto-Scroll Tutorial**: On first use, the stepper UI automatically scrolls left and right to demonstrate swiping functionality.
- **Service Mode**: If `orderType === 1`, the stepper displays a footer for uploading "Photography Request" images and modifying the `total_amount`.

```

---

## 📄 FILE: maintenance\03_Business_Logic_and_Core_Features\Product_vs_Service_Differentiation_Logic.md

```markdown
# Product vs Service Differentiation Logic

Bazaar distinguishes between physical products (Add1) and non-physical services (Add2) throughout the entire application lifecycle.

## 1. Data-Level Differentiation
- **`orderType`**: 
  - `0`: Physical Product.
  - `1`: Service (e.g., Oriflame, Subscriptions, Programming).
- **`serviceType` flag**: Stored in the database to drive conditional UI rendering.

## 2. Dynamic Component Swapping
The application uses two separate view and edit modules based on the category of the item.

| Feature | Physical Product (ProductView) | Service (ProductView2) |
| :--- | :--- | :--- |
| **Media** | Standard Grid/Gallery. | Interactive 3D CSS Slider. |
| **Transaction** | "Add to Cart" (Quantity based). | "Send Order" (Request/Photo based). |
| **Editing** | Fields for Price, Quantity, Discount. | Fields for Description and Seller Message only. |
| **Interaction** | Straightforward purchase. | Supports "Photography Request" with buyer attachments. |

## 3. The `ProductStateManager` Bridge
This central manager handles the state transitions:
1. **Selection**: User picks a category from the `CategoryModal`.
2. **Detection**: `resolveCategoryNames()` checks if the category is flagged as a service.
3. **Routing**: Redirects the user to `productAdd/Edit` or `productAdd2/Edit2` accordingly.

## 4. Display Adaptation
- **Seller View**: When a seller views their own service in `ProductView2`, the "Send Order" box is hidden to prevent self-ordering.
- **Admin View**: Admins see a "View Only" version of both modules that hides price modification and purchase buttons.

## 5. Pricing Logic
Services often have a `total_amount` of 0 initially, which is later updated by the seller or admin within the Stepper once the service scope is finalized, whereas physical products have a fixed, upfront price.

```

---

## 📄 FILE: maintenance\03_Business_Logic_and_Core_Features\Shopping_Cart_and_Checkout_Workflows.md

```markdown
# Shopping Cart and Checkout Workflows

The shopping cart system manages the collection of products, delivery calculations, and the final order creation process.

## 1. Modular Architecture (`pages/cardPackage/`)
- `cartPackage-init.js`: Core initialization and state check.
- `cartPackage-ui.js`: Dynamic rendering of the cart list and empty states.
- `cartPackage-api.js`: Communication with `/api/orders` for order submission.
- `cartPackage-checkout.js`: Final validation and confirmation logic.

## 2. Cart Management
- **Storage**: The cart state is stored in `localStorage` as a serialized JSON array.
- **Deduplication**: Adding the same product twice increments the `quantity` rather than adding a new entry.
- **Product Notes**: Buyers can attach specific text notes to individual products within the cart (`cartPackage-notes.js`).

## 3. The Checkout Process
1. **Login Check**: Ensures the user is authenticated before proceeding.
2. **Dynamic Recalculation**: The system performs a final sum check of all items, applying the smart delivery cost if applicable.
3. **Seller Limits**: Verifies each seller's `limitPackage` constraint (minimum order value).
4. **Data Construction**: Compiles the `orderData` object, including `order_items`, `total_amount`, and `order_key` (generated via unique serial logic).
5. **Atomic Transaction**: The `/api/orders` endpoint uses `db.batch` to ensure the order and its items are recorded simultaneously or not at all (all-or-nothing).

## 4. Post-Checkout Workflow
- **State Cleanup**: On success, the local cart is emptied.
- **Notifications**: Automatic notifications are sent to relevant sellers and administrators.
- **User Redirection**: Redirects the user to the "My Purchases" section.

## 5. Technical Safety
Every checkout involves a `SweetAlert2` confirmation prompt to prevent accidental orders and ensure the user agrees to the final calculated delivery cost.

```

---

## 📄 FILE: maintenance\03_Business_Logic_and_Core_Features\Smart_Delivery_Logistics_and_Cost_Calculation.md

```markdown
# Smart Delivery Logistics and Cost Calculation

Bazaar features a sophisticated delivery system that optimizes routes for multi-seller orders and calculates costs based on real-world factors.

## 1. Route Optimization Algorithm (`smartDeliveryRoute.js`)
The system solves a localized version of the Traveling Salesman Problem (TSP):
- **Nodes**: Office (Start), Sellers (Intermediate), Customer (End).
- **Mechanism**: Brute-force permutation (since sellers per order is usually <8).
- **Goal**: Minimize total distance and time between the office, all relevant pickup points, and the final destination.

## 2. Monetary Cost Formula (`deliveryCostCalculator.js`)
Cost calculation is dynamic and depends on factors defined in `delivery_config.json`.

### Calculation Variables:
- **Base Fee**: Minimum cost for any delivery.
- **Distance Cost**: Fixed price per kilometer tracked.
- **Load Weight**: Surcharge for "Heavy Load" items.
- **External Factors**: Weather conditions (Rain/Heat) and Area-specific multipliers.
- **Service Quality**: Driver rating adjustment and system commission.
- **Discounts**: Dynamic reductions based on order value or promotional codes.

## 3. Self-Delivery Option (`isDelevred`)
Sellers can choose to handle their own deliveries by setting `isDelevred: 1` in their profile.
- **Impact**: These sellers are excluded from the smart route calculation.
- **Cost**: No smart delivery fee is added for items from these sellers; any shipping cost must be negotiated directly or included in the product price.

## 4. Central Configuration (`delivery_config.json`)
All pricing factors are stored in a central JSON file within `pages/cardPackage/data/`. This allows administrators to update the entire city's delivery pricing instantly without changing code.

## 5. Implementation Bridge
The `deliveryService.js` acts as the coordinator between the cart UI, the route optimizer, and the cost calculator. It ensures that the delivery cost shown to the user is always accurate to the current cart contents and geography.

```

---

## 📄 FILE: maintenance\04_Detailed_Modules_and_Components\Administrative_Moderation_and_Order_Approval.md

```markdown
# Administrative Moderation and Order Approval

Administrators hold privileged access to oversee the marketplace, approve content, and resolve transaction disputes.

## 1. Authentication & ID Security
- **`ADMIN_IDS` Array**: Centralized list in `config.js` defining all authorized administrative identifiers.
- **Permission Elevation**: Detecting an Admin ID enables hidden UI elements, such as the "App Price" preview and the "Admin" filter in sales movement.

## 2. Content Moderation Workflow
- **`pendingProducts.js`**: A dedicated dashboard for auditing new submissions.
- **Review Criteria**: Admins verify image quality, description accuracy, and category alignment.
- **Approval Logic**: Approving an item updates its `is_approved` status to `1`, triggering a notification to the seller and making the item publicly search-able.

## 3. Marketplace Control
- **Advertisement Control Panel**: (`pages/ADMIN/mainAdvertises.html`) allows for real-time manipulation of the `advertisements.json` manifest.
- **Global Broadcasts**: Admins can send system-wide notifications to all users or specific roles (e.g., notifying all Sellers of a policy change).
- **Impersonation**: The `SessionManager` allows admins to "logged in as" any user to debug specific session issues without needing their password.

## 4. Order & Pricing Authority
In the Stepper and Sales Movement modules:
- **The Ultimate Lock-Breaker**: Admins retain the ability to edit `total_amount` and change item statuses even after they have been locked for standard users.
- **Conflict Resolution**: Admins see full contact details for both buyer and seller to facilitate dispute resolution.

## 5. Maintenance Tools
Admins have access to the **Dev Console** specialized "Reset" functions, allowing them to force a remote FCM re-registration or a version-check for any user current session.

```

---

## 📄 FILE: maintenance\04_Detailed_Modules_and_Components\Geolocation_and_Interactive_Maps.md

```markdown
# Geolocation and Interactive Maps

The Location module is an isolated, robust tool for managing geographic coordinates, optimized for both web browsers and the Android native hybrid container.

## 1. Component Isolation (`location/`)
The module is built as an independent sub-application to ensure performance and prevent styling conflicts.
- **`location_app.js`**: Central entry point.
- **`leaflet.js` Integration**: Core map engine.
- **`gps.js`**: Advanced handler for browser-level and native Android geolocation.

## 2. Parent-Child Communication (`postMessage`)
Since the map usually runs in an Iframe, it communicates with the root application via standard events:
- `LOCATION_SELECTED`: Sends selected `lat` and `lng` to the parent.
- `LOCATION_RESET`: Notifies the parent to clear stored coordinates.
- `CLOSE_LOCATION_MODAL`: Requests the parent to hide the location UI.

## 3. Advanced Operational Modes
The system detects URL parameters to change its behavior:
- **View Only (`viewOnly=true`)**: Hides editing markers, shows a static pin, and enables "Share Location" features.
- **Embedded (`embedded=true`)**: Hides the internal "Close" button, delegating UI control to the parent's Modal framework.
- **Manual Input**: Allows users to tap anywhere on the map to set a precise location even if GPS is unavailable.

## 4. Performance: Batch Update System
To reduce battery consumption and network overhead:
- Coordinates are stored locally in the Iframe's state during the browsing session.
- No server updates are made until the user explicitly clicks the "Save Location" button, triggering a final broadcast.

## 5. Mobile & Android Compatibility
- **Touch Events**: Optimized for pinch-zoom and long-press on mobile screens.
- **Native Bridge Support**: When running in Android, the map uses the `WebChromeClient` to request system-level GPS permissions, ensuring accurate positioning even within a restricted WebView.
- **Localization**: Titles and buttons are translated using the `iframe bridge` to link with the parent's `window.langu` dictionary.

```

---

## 📄 FILE: maintenance\04_Detailed_Modules_and_Components\Media_Processing_Optimization_and_Cloud_Storage.md

```markdown
# Media Processing Optimization and Cloud Storage

Efficient media handling is critical for Bazaar's performance on mobile devices with limited bandwidth and memory.

## 1. Client-Side Image Processing
Before any upload, images undergo a transformation process:
- **Compression**: Dimensions are normalized (Max Width 1600px, quality 0.75).
- **Format Conversion**: Priority is given to the **WebP** format to reduce file size by up to 30% compared to JPEG.
- **Resource Management**: Uses `createImageBitmap` and `OffscreenCanvas` (if available) to prevent UI thread blocking during compression.

## 2. Cloudflare R2 Storage Architecture
- **Strategy**: R2 is used as the high-availability "Single Source of Truth" for all user and marketing media.
- **Naming Convention**: 
  - `product_key` or `order_key` suffixes are used for unique identification.
  - Seller and Category identifiers are embedded in the path for logical grouping.

## 3. Parallel Upload System
- **`uploadFile2cf`**: A non-blocking utility that handles multi-part uploads.
- **State Tracking**: The `add1_images` (Physical) and `add2_images` (Service) arrays track the progress of each media item (pending, uploading, success, error).

## 4. Maintenance & Cleanup
- **Orphan Removal**: When a product or advertisement is deleted, the system calls `deleteFile2cf` to physically remove the associated blobs from the R2 bucket.
- **Manifest Updates**: The `advertisements.json` file is only updated after all associated images are verified in storage to prevent broken image placeholders.

## 5. Technical Requirements
- **Sharp Library**: Used in the Node.js `build.js` environment for pre-generating PWA icons and optimizing static promotional banners.
- **Compatibility Fallback**: If a browser does not support WebP, the system automatically falls back to High-Quality JPEG (0.8 quality).

```

---

## 📄 FILE: maintenance\04_Detailed_Modules_and_Components\Push_Notifications_and_FCM_Architecture.md

```markdown
# Push Notifications and FCM Architecture

Bazaar implements a high-reliability notification system that combines standard Server-to-Client messaging with advanced Client-to-Client (P2P) logic.

## 1. Firebase Cloud Messaging (FCM v1)
The project uses the modern FCM v1 API for all outgoing messages. To maintain performance and reduce server load, tokens are managed locally on the device.

### Critical Components:
- **VAPID Keys**: Ensure secure browser registration.
- **Token Management**: Handled distinctly for PWA (`fcm_token`) and Android (`android_fcm_key`) to prevent delivery conflicts.
- **`shouldNotify(stepId, role)`**: A localized logic engine in `notificationTools.js` that checks user preferences and global settings before attempting a broadcast.

## 2. Client-Side P2P Notifications [NEW]
To ensure instant notifications even during high server latency, the PWA can send messages directly:
- **Authentication**: Uses a local, encrypted copy of the Firebase Service Account JSON.
- **JWT Signing**: Uses the `jsrsasign` library (localized at `assets/libs/jsrsasign/`) to sign OAuth2 tokens directly in the user's browser.
- **API Call**: POSTs directly to the Google FCM VPC endpoint.

## 3. Intelligence & Filtering
- **Item-Level Awareness**: The system extracts `seller_key` from order items to ensure only the relevant seller receives a "New Order" notification, rather than the entire marketplace list.
- **Template Engine**: `getMessageTemplate` replaces variables like `{{order_id}}` or `{{product_name}}` with live data fetched from the local state.
- **Fallback Logic**: If a specific template is missing in `notification_messages.json`, the system reverts to hardcoded safety strings.

## 4. Delivery Persistence & UI
- **IndexedDB Logging**: Every incoming notification is saved to `notificationsLog` for offline browsing.
- **Signal-driven Sync**: Eliminated the legacy 30-second watchdog. Now, Android flushes all pending background notifications ONLY after receiving the `onWebAppReady` signal from the Web UI.
- **Immediate Debounced Updates**: Badge updates are debounced (50ms) and can be forced immediately (`forceImmediate`) to ensure zero-flicker UI updates during bulk delivery.

## 5. Android Bridge Synchronization (Signal Protocol)
Native Android flushes its `SharedPreferences` buffer into the web context via `saveNotificationFromAndroid` only when the Web App signals stability. Incoming live FCM messages are intelligently routed: if the Web view is stable, they are delivered instantly; otherwise, they wait for the next ready signal.

```

---

## 📄 FILE: maintenance\04_Detailed_Modules_and_Components\Seller_Dashboard_and_Inventory_Management.md

```markdown
# Seller Dashboard and Inventory Management

The Seller Dashboard (`pages/product2Me/`) is the central hub for merchants to manage their catalogs and monitor order statuses.

## 1. Content Management Logic (`product2Me.js`)
- **Dual-Stream Fetching**: The dashboard performs parallel API calls to fetch both **Approved** (`status=1`) and **Pending** (`status=0`) items.
- **Data Merging**: Items are merged into a single local list and sorted by the latest update date for a consistent timeline view.

## 2. Inventory Controls
- **Filtering**: Real-time filtering by category (derived from `window.appCategoriesList`) and name-based search.
- **Status Indicators**: "Under Review" badges are displayed for pending items to set correct user expectations.
- **Deletion Workflow**: 
  - Confirmation via `SweetAlert2`.
  - Physical removal of media from Cloudflare R2 via `deleteProduct_`.
  - Immediate DOM removal for a responsive "instant feedback" experience.

## 3. Product vs. Service Management
The dashboard intelligently detects the item type:
- Clicking **Edit** on a physical product redirects to `productEdit`.
- Clicking **Edit** on a service redirects to `productEdit2`.
This ensures the user sees the correct fields (e.g., hiding Quantity for services).

## 4. Price & Cost Visibility
- **App Price**: Sellers can see the "Real Price" (base cost before platform adjustment) to understand their margins precisely.
- **Value Lock**: In the Stepper module accessible from the dashboard, sellers' ability to modify order values is automatically locked once an order is marked as "Confirmed".

## 5. Redirection & State Preservation
Upon returning from an editing session, the dashboard uses `LOADER_REGISTRY` to restore the previous filter settings and scroll position, minimizing friction for power users with many products.

```

---

## 📄 FILE: maintenance\05_Development_Maintenance_and_Operations\Build_System_Obfuscation_and_Security.md

```markdown
# Build System Obfuscation and Security

The build process transforms the development source code into a protected, optimized, and production-ready `dist/` folder.

## 1. The Build Script (`build.js`)
This Node.js script is the primary orchestrator for preparing the distribution repository.

### Workflow Steps:
1. **Auto-Versioning**: Automatically increments the patch version in `version.json`.
2. **Cleanup**: Wipes the existing `dist/` directory to ensure no stale files remain.
3. **Asset Cloning**: Copies all CSS, images, and external libraries. (Excludes `api/`, `note/`, and `function/` folders).
4. **HTML/CSS Minification**: Uses `html-minifier-terser` and `clean-css` to reduce file sizes for faster mobile loading.

## 2. JavaScript Protection
Bazaar uses the `javascript-obfuscator` library to protect intellectual property and prevent reverse-engineering of sensitive logic (e.g., P2P notification signing).

### Obfuscation Policy:
- **IIFE Wrapping**: All logic is wrapped in IIFEs to isolate scopes.
- **Global Preservation**: `renameGlobals` is disabled to ensure that central bridge functions (like `window.Android` or `window.langu`) remain accessible.
- **Service Worker Security**: `sw.js` and `firebase-messaging-sw.js` undergo a specialized obfuscation pass to maintain PWA standards while adding security.

## 3. File Integrity System
The build script generates a `dist/version.json` file which acts as the integrity manifest.
- **SHA-256 Hashing**: A hash is calculated for the *original* content of every file.
- **Comparison**: The application compares these hashes on startup to detect corrupted or tampered assets.

## 4. Media Utilities
- **`generate_pwa_icons.js`**: Uses the `sharp` library to generate favicons and PWA-compliant icons (192x192, 512x512) from a single source image.
- **`optimize_image.js`**: A utility for manual batch conversion of promotional assets to optimized WebP format.

## 5. Automated Deployment
Once the build is successful, the script automatically commits and pushes the changes to the dedicated distribution repository (`_bazaar.git`), which is then served via Cloudflare Pages.

```

---

## 📄 FILE: maintenance\05_Development_Maintenance_and_Operations\Comprehensive_API_Endpoints_Documentation.md

```markdown
# Comprehensive API Endpoints Documentation

This document provides a technical explanation of the backend services, mostly running as Vercel Edge Functions communicating with a Turso (LibSQL) database.

## 1. Core Logic & Architecture
- **Environment**: Vercel Edge Runtime.
- **Database**: LibSQL (Turso) for atomic transactions.
- **Security**: Prepared SQL statements to prevent SQL Injection.
- **Transactions**: Atomic operations using `db.batch` for complex multi-table updates (e.g., Orders + Order Items).

## 2. Inventory & Media APIs
- **`GET /api/products`**: Fetches marketplace products with support for `product_key`, category filters, and status codes (0=Pending, 1=Approved).
- **`POST /api/products`**: Creates new records and returns success confirmation for media sync.
- **`DELETE /api/products`**: Triggers R2 media deletion and removes the database record.

## 3. Order Management APIs
- **`/api/orders`**: Manages the `orders` and `order_items` tables. Handles complex JSON formatting for the `order_status` column.
- **`/api/update-order-amount`**: Specialized endpoint for updating the `total_amount` after a service is finalized.
- **`/api/update-item-status`**: Performs selective updates to the `order_status` JSON blob without overwriting other participants' data.
- **`/api/user-all-orders`**: A high-performance aggregator that recovers order history, item details, and delivery logs in a single request flow.

## 4. Identity & Notifications APIs
- **`/api/users`**: CRUD operations for the `users` table (Purchasers, Sellers, Delivery, Admin). Includes phone uniqueness checks and password hashing verification.
- **`/api/tokens`**: Manages FCM tokens. Enforces a policy of one active token per user-device pair to prevent spam.
- **`/api/suppliers-deliveries`**: (UPSERT) Manages the mapping between sellers and their authorized delivery personnel.

## 5. Analytics & Maintenance
- **`/api/sales-movement`**: Generates role-based reports. Dynamically adjusts the `WHERE` clause to filter data based on the requesting user's identity (Buyer vs Seller vs Admin).
- **`/api/updates`**: A lightweight timestamp service used for cache invalidation and version check protocols.

## 6. Error Handling Standards
All endpoints return JSON responses with standardized status codes:
- `200 OK`: Successful operation.
- `400 Bad Request`: Missing parameters or validation failure (Arabic error messages).
- `500 Internal Server Error`: Database or execution failure.

```

---

## 📄 FILE: maintenance\05_Development_Maintenance_and_Operations\Developer_Tools_Console_and_Debugging_Guide.md

```markdown
# Developer Tools Console and Debugging Guide

Bazaar provides professional-grade debugging tools integrated directly into the application to facilitate troubleshooting on physical devices.

## 1. On-Device Developer Console (`dev-console.js`)
Accessible via a hidden gesture or button, the integrated console provides:
- **Hybrid Logging**: Simultaneous monitoring of Web (JS) and Native (Android) events.
- **Filtered Modes**: Switch between "All", "Web only", or "Native only" logs.
- **Reset FCM**: A "nuclear option" button that triggers `window.resetFCM()`, wiping all notification tokens and forcing a fresh registration.
- **Clipboard Management**: One-click copying of session logs for easy sharing with the development team.

## 2. Universal Logging Bridge
Common tags to look for in logs:
- `[ANDROID]`: Messages originating from the native Android shell.
- `[VERSIONCHECK]`: Details regarding silent updates and hash comparisons.
- `[FCM]`: Registration status, token acquisition, and message delivery logs.
- `[ROUTING]`: Logs from the `LOADER_REGISTRY` regarding container transitions.

## 3. Remote PC Synchronization
For advanced debugging, developers should use:
- **Chrome Remote Inspect**: Connect a device via USB and go to `chrome://inspect/#devices`. This provides the full Chrome DevTools experience (Network tab, DOM inspector, Console) for the on-device WebView.
- **Android Logcat**: Use `adb logcat -s "LogBridge"` to see prioritized native logs that bypass the web console.

## 4. Debugging Scenarios
- **Notification Failure**: Check for the `notifications_enabled` value in `localStorage` and ensure the `fcm_token` exists.
- **Update Issues**: Monitor the Console for `[VersionMismatch]` logs during startup to see which specific file failed the hash verification.
- **Bridge Failure**: If `window.Android` is undefined, verify that the `@JavascriptInterface` ProGuard rules were applied during the last native build.

## 5. Testing Best Practices
- **PWA Testing**: Use Incognito or Guest mode to avoid cache pollution.
- **Production Debugging**: Emulate the `dist` environment locally using a simple HTTP server (e.g., `npx serve dist`) to verify that obfuscation didn't break any global references.

```

---

## 📄 FILE: maintenance\05_Development_Maintenance_and_Operations\Local_Asset_Management_and_Dependencies.md

```markdown
# Local Asset Management and Dependencies

Bazaar follows a strict policy of hosting all critical libraries locally to ensure independence from third-party CDNs, improve performance, and allow offline execution.

## 1. Fonts and Icons
- **FontAwesome (v6+)**: Hosted locally at `assets/fontawesome/`.
- **Performance**: The `fa-solid-900.woff2` file is preloaded in the `index.html` head to eliminate the visual jump (FOIT/FOUT) during initial page render.

## 2. Core JavaScript Libraries (`assets/libs/`)
- **SweetAlert2**: Local copy of `sweetalert2.all.min.js`. All UI alerts transition through this library.
- **Firebase (v8.10.1)**: Local versions of `firebase-app.js` and `firebase-messaging.js`. (V8 is used for historical compatibility with Service Workers and existing P2P logic).
- **jsrsasign (v10.5.25)**: Essential for client-side JWT (JSON Web Token) signing for the secure FCM v1 P2P notification system.
- **Leaflet**: Core mapping engine for the location module, hosted locally with associated CSS and marker assets.

## 3. Why Local Hosting?
1. **Network Independence**: The app remains functional and localized even if major CDNs are unreachable in the region.
2. **Offline Support**: Necessary for PWA offline modes where external assets cannot be fetched.
3. **Privacy**: Prevents user tracking by external font or library providers.
4. **Version Stability**: Protects the project from "Breaking Changes" or library removals by third-party providers.

## 4. Dependency Update Protocol
To update a library:
1. Download the minified production version.
2. Replace the file in `assets/libs/`.
3. Update the version reference in `LOCAL_Library.md`.
4. Run `node build.js` to ensure the new file is hashed and included in the distribution manifest.

```

---

