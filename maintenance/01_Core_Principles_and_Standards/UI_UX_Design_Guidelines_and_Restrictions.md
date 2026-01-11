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

## 5. Visual Hierarchy
- **Fusion Formulas**: When overlapping elements (like category grids and detail containers), use the exact mathematical formulas: `padding-bottom + gap = margin-top overlap` to ensure perfect visual alignment.
- **Z-Index**: Maintain a strict Z-index hierarchy to prevent element bleeding or hidden interactables.
