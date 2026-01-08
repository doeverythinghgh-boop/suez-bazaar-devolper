# Authentication and Dynamic Routing Guide (Auth & SPA Routing Guide)

The "Bazaar" project relies on a **Single Page Application (SPA)** architecture, where navigation between pages and user session management are handled centrally without a full browser reload. This document combines two essential parts: the authentication system and the routing system.

---

## 1. Centralized Settings and Security (`js/config.js`)

This file is the central nervous system of the application settings, ensuring consistent operation across different environments (local, demo account, and production):

*   **API Base URL Management**: 
    *   `baseURL` is automatically determined based on `location.hostname` and the `allowedHosts` array.
    *   Ensures all requests are directed to the correct server (Vercel or Localhost) without manual code modification.
*   **Administrator Management (`ADMIN_IDS`)**:
    *   Contains the official array of unique identifiers (`user_key`) that possess system management permissions.
    *   This array is consumed in `user-dashboard.js` to open the control panel, and in `view_init.js` to show seller data to administrators only.
    *   **Note**: The phone number-based verification system has been replaced by this more secure system to prevent permission overlap.
*   **Compatibility and Security**:
    *   **Backward Compatibility**: `window.userSession` remains globally available to ensure older parts of the code do not break, but manual modification is prohibited; `SessionManager` must be used.
    *   **Security**: Re-authentication is required before sensitive operations (account deletion, saving profile changes, impersonation).
    *   **Multi-platform**: Logout logic includes `window.Android` calls to ensure state synchronization with the Android app.

---

## 2. Authentication System and Session Management (`js/auth/`)

The system relies on centralization, modularity, and separation of concerns across three core units:

### A. Session Manager (`sessionManager.js`)
The single "Source of Truth" and controller of the user state.
*   **Functions**: `init()` for initialization, `login()` for handling login, `logout()` for secure exit, and `updateUser()` for immediate updates.
*   **Preference Persistence**: When `logout()` is called, the system temporarily saves language (`app_language`) and theme (`theme`) settings before clearing local data, then immediately restores them to ensure a continuous user experience with preferred languages and themes even after logging out.
*   **Impersonation**: Provides `impersonate()` and `isImpersonating()` functions to switch between identities while preserving the administrator's original session.

### B. Unified Validator (`validators.js` - `AuthValidators`)
Contains all validation rules to ensure data consistency:
*   Phone validation (`validatePhone`, `normalizePhone`), names (`validateUsername`), and passwords.
*   `validateAddress(address, hasCoordinates)`: Verifies the existence of the address and provides a success state that allows the interface to display smart details.

### C. UI Helper (`uiHelpers.js` - `AuthUI`)
Provides an abstraction layer for the `SweetAlert2` library:
*   Managing loading screens (`showLoading`, `close`).
*   Formatting alerts (`showError`, `showSuccess`) and password confirmation windows.

---

## 3. Auth Workflows

*   **Login**: Starts with validation via `AuthValidators`, then the verification API, and ends with `SessionManager.login` to activate the session and notifications.
*   **Account Creation (Seller Option)**: Supports map integration and accidental window lock. A "Seller Mode Activation" option was added via a modern interactive window to collect self-delivery data (`isDelevred`) and minimum order limit (`limitPackage`). These fields are sent within the `register_newUser` object to the POST API in `api/users.js` to ensure they are saved in the database upon creation, and synchronized in the user session (`SessionManager`) immediately upon registration.
*   **Profile (Update Options)**: Allows modifying seller options via a dedicated window. Changes (`isDelevred`, `limitPackage`) are saved within the `updatedData` object and sent to the PUT API in `api/users.js`. Changes are verified locally and the session object is updated immediately to ensure new settings reflect on delivery calculations in the cart without needing a reload.

---

## 4. SPA Routing and Dynamic Loading System

Navigation is managed via the loading engine in `js/forms.js` to ensure a smooth user experience.

### A. Core Function: `mainLoader`
Used to fetch HTML content and inject it into a specific container.
*   **Signature**: `async function mainLoader(pageUrl, containerId, waitMs, cssRules, callbackName, reload)`
*   **Double Buffering Technique**: Loads content into a hidden Buffer first to prevent Flash of Unstyled Content (FOUC).
*   **Script Handling (IIFE Wrapping)**: Automatically wraps scripts to prevent variable redefinition errors (`const`/`let`) during repeated navigation.

### B. History and Back Management (`containerGoBack`)
*   Relies on the `LOADER_REGISTRY` container log.
*   When `containerGoBack()` is called, the current container is cleared and the previous one is shown, keeping the DOM clean and saving memory.

### C. Container Registry and Automatic Behavior (`LOADER_REGISTRY`)
This registry (Array) is the core engine for UI state and navigation history:
*   **Path Tracking**: Records the order of open containers, allowing the application to know the exact previous container (e.g., to return from product editing to the product list).
*   **Smart Control**: When a new container is opened, all other registered containers are automatically hidden to simulate a "Tabs" system.
*   **Performance Optimization**: If a page is already registered, it is shown immediately instead of being reloaded (Caching DOM state), unless the `reload: true` option is activated.
*   **Programming Decisions**: The registry length (`LOADER_REGISTRY.length`) is used to determine the user's current context; for example, if the registry contains more than one item, it means the user is "inside" a sub-browsing process and "Back" should be activated instead of "Reload" when clicking top navigation icons.

---

## 5. Alternative Loading Tools (`js/tools.js`)

In addition to the core `mainLoader`, the `tools.js` file provides additional functions for specific loading cases:

### A. Unique Snapshot Function: `insertUniqueSnapshot`
Used to load content with an internal caching system to prevent duplicate network requests.
*   **Function**: Fetches the page once and stores it in the `pageSnapshots` object.
*   **Script Management**: Supports IIFE wrapping for internal scripts and adds a timestamp (`?v=`) to external scripts to ensure updates.
*   **Usage**: Ideal for static pages that are frequently reopened and require ultra-fast response times.

### B. Simplified Loading Function: `loader`
A traditional loading function focusing on simple sequence and waiting.
*   **Function**: Fetches HTML, empties the container, and injects content with script re-execution.
*   **Feature**: Provides simple control over wait time (`waitMs`) after loading and execution are complete.

---

## 6. Category Selection System

The system uses a central window (`CategoryModal`) to ensure the correct category is selected before starting to add any product or service.

### A. Central Mechanism
*   **Call Function**: `showAddProductModal()` is responsible for starting the process.
*   **State Storage**: Selected categories (Main and Sub ID) are saved in `ProductStateManager`.
*   **Automatic Routing**: Based on the type of selected category, the `loadProductForm` function determines the appropriate page (`productAdd` for regular products and `productAdd2` for services).

### B. Smart Skip Logic
To improve user experience and integrate with the "Smart Loading" feature, logic was developed to skip the selection window in the following cases:
1.  **Active Draft**: If the addition container (`index-productAdd-container`) already contains a loaded page.
2.  **Category Persistence**: If categories are already selected in active memory.
3.  **Continuity**: This allows the user to return to follow up on the addition process immediately without repeating selection steps, maintaining focus and preventing loss of entered data.

---

## 7. Container-Page Map

The following table clarifies the relationship between unique container IDs and the pages loaded within them, facilitating the tracking of data flow and UI:

### A. Root Containers
These containers reside in `index.html` and cover the core application functions:

*   **`index-home-container`**: Main Content / Home Page (`pages/home.html`)
*   **`index-search-container`**: Search and Filters (`pages/search/search.html`)
*   **`index-notifications-container`**: User Notifications (`notification/page/notifications.html`)
*   **`index-salesMovement-container`**: Sales Movement and Reports (`pages/sales-movement/sales-movement.html`)
*   **`index-cardPackage-container`**: Cart / Shopping Bag (`pages/cardPackage/cardPackage.html`)
*   **`index-productView-container`**: Viewing product and service details:
    *   `pages/productView/product.html`
    *   `pages/productView2/productView2.html`
*   **`index-productAdd-container`**: Adding new products or services:
    *   `pages/productAdd/productAdd.html`
    *   `pages/productAdd2/productAdd2.html`
*   **`index-productEdit-container`**: Editing existing products or services:
    *   `pages/productEdit/productEdit.html`
    *   `pages/productEdit2/productEdit2.html`
*   **`index-user-container`**: Session: Login, Register, Dashboard, Admin:
    *   `pages/login/login.html`
    *   `pages/register/register.html`
    *   `pages/user-dashboard.html`
    *   `pages/profile-modal/profile-modal.html`
    *   `pages/ADMIN/adminPanel.html`
    *   `pages/ADMIN/mainAdvertises.html`
    *   `pages/ADMIN/pendingProducts.html`
    *   `notification/page/admainNotificationsetting.html`
*   **`index-contact-container`**: Support and Help (`pages/contact.html`)
*   **`index-myProducts-container`**: Seller's product list (`pages/product2Me/product2Me.html`)

### B. Nested Containers
Secondary containers located within sub-pages to load partial components:

*   **`advertisement`**: Inside `pages/home.html` -> loads `pages/advertisement/advertisement.html`
*   **`categories00`**: Inside `pages/home.html` -> loads `pages/categories/categories.html`
*   **`dash-header-container`**: Inside `pages/user-dashboard.html` -> loads `pages/header.html`
*   **`header-container1X`**: Inside `pages/login/login.html` -> loads `pages/header.html`

---

## 8. Global Data Management

To improve performance and reduce network requests, a "Fetch Once" policy was adopted for static data consumed in multiple interfaces:

### A. Category List (`window.appCategoriesList`)
*   **Loading Mechanism**: The `shared/list.json` file is fetched only once when the application loads (`DOMContentLoaded`) in `index.js`.
*   **Helper Function**: `fetchAppCategories()` in `js/globalVariable.js` provides a safe way to access data; it returns data from memory if it exists, or fetches it if unavailable.
*   **Unified Consumption**: All components (Search, Categories, Product Management, and State Manager) use this global variable instead of fetching the file independently, ensuring data consistency and response speed.

---

## 9. Best Practices

1.  **In Routing**: Use `reload: true` only when necessary to refresh live data, and always prefer passing the Callback as a String.
2.  **In Authentication**: Never modify `window.userSession` manually; use `SessionManager` functions.
3.  **In Design**: Unify container ID prefixes (e.g., `index-XXX-container`) to facilitate programmatic tracking.
4.  **In Data**: When category data is needed, always use `window.appCategoriesList` or `await fetchAppCategories()` to avoid redundant network requests.
