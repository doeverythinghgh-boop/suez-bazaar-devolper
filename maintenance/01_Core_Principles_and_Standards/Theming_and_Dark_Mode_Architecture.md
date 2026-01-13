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

