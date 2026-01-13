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

