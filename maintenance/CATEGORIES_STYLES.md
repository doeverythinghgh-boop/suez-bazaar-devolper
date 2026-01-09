# Categories Maintenance Guide 📖

> **⚠️ Critical:** Any new element must be responsive and tested across all screen sizes.

## 1. DOM Structure & Fusion Mechanics 🧪

The category grid uses a specialized "Fusion" effect where the active item visually merges with the details container expanded below it.

### Key Components
*   **`.categories_grid`**: CSS Grid, default 4 columns (responsive).
*   **`.categories_grid_item`**:
    *   `padding-bottom: 20px`: **Critical** to reserve space for the fusion bridge.
    *   `z-index: 1`: Base layer.
*   **`.categories_grid_item--active`**:
    *   `z-index: 50`: Rises above other items.
    *   `border-bottom: none`: Essential for the merge effect.
    *   `::after` (The Bridge): A pseudo-element that physically covers the gap between the item and the details container.
*   **`.categories_details_container`**:
    *   `grid-column: 1 / -1`: Spans the full width of the grid.
    *   `margin-top: -35px`: Pulls the container up to overlap with the active item.

**Fusion Formula:**
`padding-bottom (20px)` + `gap (15px)` = `margin-top (-35px)`.
*Changing any of these values requires recalculating the others.*

## 2. Insertion Logic (JS)

*   **Function:** `categories_toggleSubcategoriesGrid` in `categories.js`.
*   **Logic:**
    1.  Detects screen width to determine column count (3 for mobile, 4 for others).
    2.  Calculates the index of the last item in the *current row*.
    3.  Inserts the `detailsContainer` after that last item.
    *   *Goal:* Ensures the details panel opens between rows without breaking the grid layout.

## 3. Responsive Design 📱

*   **< 480px:** 3 Columns. Images: 85px.
*   **480px - 767px:** 4 Columns. Images: 95px.
*   **≥ 768px:** 4 Columns. Images: 110px-120px.

## 4. Subcategories (Story Style) 📸

*   **Design:** Circular images/icons with text underneath (similar to Instagram Stories).
*   **Animation:** Staggered "Pop-In" effect. `animation-delay` is calculated via JS (`index * 0.05s`) for a sequential appearance.
*   **Active State:** Highlighted with `var(--border-color-active)`, shadow, and slight scale up.

## 5. Products Gallery

*   **Frame:** `.categories_gallery_internal_wrapper`
    *   Border: `1px solid var(--border-color-active)`
    *   Shadow: `var(--shadow-focus)`
    *   Margin: `0px 15px 15px 15px`
*   **Container:** `.categories_products_gallery_container`
    *   Grid Layout: Auto-fill (min 110px).
    *   Height: Max `30vh` with vertical scroll.

## 6. Critical Maintenance Rules ⚠️

1.  **Column Consistency:** If you change `grid-template-columns` in CSS, you **MUST** update the column logic in `categories.js`.
2.  **Z-Index Hierarchy:**
    *   Details Container: 40
    *   Active Item: 50
    *   Fusion Bridge: 55
    *   Active Media: 60
3.  **Image Standards (Strict):**
    *   **Format:** WebP only.
    *   **Dimensions:** **150px × 150px** exactly.
    *   **Optimization:** Smallest file size with highest possible quality.

---
*Last Updated: 2026-01-09*
