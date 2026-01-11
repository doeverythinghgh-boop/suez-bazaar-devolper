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
