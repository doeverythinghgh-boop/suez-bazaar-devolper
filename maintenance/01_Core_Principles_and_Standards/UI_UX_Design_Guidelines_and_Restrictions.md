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
- **Advanced Stacking Context (Teleport Technique)**: 
    - When a modal or an overlay MUST appear above all components (especially the app header and administrative watermarks) and is trapped inside a container's stacking context (common in iOS Safari), it must be **"Teleported"** to the `body`.
    - **Implementation**: Use `document.body.appendChild(modalElement)` upon opening the modal. This ensures the element becomes a direct child of the root body, allowing its `z-index` to be evaluated globally.
    - **Cleanup**: Ensure the element is managed correctly when navigating away to prevent duplicate IDs in the DOM.
