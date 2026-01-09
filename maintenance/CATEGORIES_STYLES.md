# Categories Maintenance Guide 📖🏗️⚖️

> **⚠️ Important Warning for Developers:**  
> **Any new element or tag must be created to fit various screen types using appropriate Media Queries.**  
> **Failure to adhere to this principle will lead to breaking the responsive design and a poor user experience.**

---

This guide explains the logical engineering and aesthetic construction of the categories section after the "Great Network Migration" and recent updates.

---

## 📑 Table of Contents

1. [DOM Structure](#1-dom-structure)
2. [Frame Fusion Mechanics](#2-frame-fusion-mechanics-)
3. [Insertion Logic](#3-insertion-logic)
4. [Responsive Design](#4-responsive-design-)
5. [Design Tokens](#5-design-tokens)
6. [Subcategories](#6-subcategories)
7. [Products Gallery](#7-products-gallery)
8. [Interactions and Animations](#8-interactions-and-animations)
9. [Critical Maintenance Rules](#9-critical-maintenance-rules-)
10. [Related Files](#10-related-files)

---

## 1. DOM Structure

### 1.1 Main Container

```css
.categories_section_container {
    padding: 20px 0 40px 0;
    background-color: var(--bg-color-light);
    text-align: center;
}
```

**Function:** Full section container with top and bottom padding for spacing.

---

### 1.2 Categories Grid

```css
.categories_grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 15px;
    padding: 0 15px;
    max-width: 1200px;
    margin: 0 auto;
}
```

**Details:**
- **System:** CSS Grid
- **Columns:** 4 equal columns (changes based on screen size)
- **Gap:** 15px between items
- **Max Width:** 1200px with automatic centering
- **Side Padding:** 15px to prevent sticking to edges

**⚠️ Important Note:** When changing the grid structure, ensure:
1. Updating `grid-template-columns` values in the CSS file for all screen categories.
2. Ensuring that the column calculation logic in `categories.js` (`categories_toggleSubcategoriesGrid` function) exactly matches the Media Queries used in CSS.

---

### 1.3 Category Item

```css
.categories_grid_item {
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    transition: transform 0.2s ease;
    -webkit-tap-highlight-color: transparent;
    padding-bottom: 20px;        /* Important for fusion */
    position: relative;
    z-index: 1;
}
```

**Functions:**
- **Display:** Vertical Flexbox to arrange image over text
- **Cursor:** Pointer to indicate clickability
- **Transition:** Smooth effect upon interaction
- **Tap Highlight:** Removal of default highlighting on mobile
- **Padding Bottom:** 20px **very critical** - provides space for the fusion bridge
- **Z-index:** 1 for base layers

**Click Effect:**
```css
.categories_grid_item:active {
    transform: scale(0.95);
}
```
5% scale reduction upon pressing for visual feedback.

---

### 1.4 Media Container

```css
.categories_cell_media {
    width: 120px;
    height: 120px;
    background-color: var(--bg-color-medium);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    transition: all 0.3s ease;
    box-shadow: var(--shadow-soft);
}
```

**Specifications:**
- **Default Size:** 120px × 120px (changes in Media Queries)
- **Background:** Light gray as a fallback background
- **Border:** 1px solid
- **Border Radius:** 12px for rounded corners
- **Flexbox:** To center content (image or icon)
- **Overflow:** hidden to clip any excess content
- **Shadow:** Soft shadow for visual depth

**⚠️ Warning:** This size must be updated in **all** Media Queries when changed.

---

### 1.5 Image and Icon

#### Image:
```css
.categories_cell_content__image {
    width: 100%;
    height: 100%;
    object-fit: fill;
    display: block;
}
```

**Properties:**
- **Size:** 100% to fill container
- **Object Fit:** `fill` to fill entire space (slight distortion may occur)
- **Display:** block to remove bottom spacing

#### Icon:
```css
.categories_cell_content__icon {
    font-size: 2rem;        /* 32px */
    color: var(--primary-color);
}
```

**Usage:** When no image is present, a FontAwesome icon appears.

---

### 1.6 Content Container

```css
.categories_cell_content {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
}
```

**Function:** Grouping media and text into a single container.

---

### 1.7 Category Text

```css
.categories_cell_content__text {
    margin-top: 8px;
    font-size: 12px;
    font-weight: 500;
    color: var(--primary-color);
    text-align: center;
    word-wrap: break-word;
}
```

**Specifications:**
- **Top Margin:** 8px from image/icon
- **Size:** 12px (reduced from 14px for visual balance)
- **Weight:** 500 (medium)
- **Color:** Application's primary color (blue)
- **Word Wrap:** Breaking long words

**⚠️ Note:** Font size changes in Media Queries for small screens.

---

## 2. Frame Fusion Mechanics 🧪

### 2.1 Active State

```css
.categories_grid_item--active {
    z-index: 50;
    position: relative;
    background-color: var(--bg-color-medium);
    border-radius: 12px 12px 0 0;
}
```

**Changes upon activation:**
- **Z-index:** Rises to 50 to be above other elements
- **Background:** Light gray for visual distinction
- **Border Radius:** Bottom corners become 0 for fusion

---

### 2.2 Media Adjustment in Active State

```css
.categories_grid_item--active .categories_cell_media {
    box-shadow: var(--shadow-focus);
    border-color: var(--border-color-active);
    border-bottom: none;                    /* Critical */
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    z-index: 60;
    background-color: var(--bg-color-medium);
}
```

**Critical Details:**
- **Border Bottom:** `none` - **very critical** to remove bottom border
- **Bottom Border Radius:** 0 to create a straight edge
- **Z-index:** 60 to be above the bridge (55)
- **Shadow:** Stronger shadow for focus

---

### 2.3 Fusion Bridge

```css
.categories_grid_item--active::after {
    content: "";
    position: absolute;
    bottom: -17px;
    left: 50%;
    transform: translateX(-50%);
    width: 82px;
    height: 37px;
    background-color: var(--bg-color-medium);
    border: none;
    z-index: 55;
    pointer-events: none;
}
```

**Detailed explanation of values:**

#### `bottom: -6px`
**Reason:** Precise overlap with container top border.

#### `height: 15px`
**Reason:** Covering the fusion area.

#### `width: 60px`
**Reason:** Narrower bridge for better aesthetic.

#### `z-index: 55`
**Order:**
- Details container: 40
- Active item: 50
- Bridge: 55
- Media: 60

#### `pointer-events: none`
**Reason:** Preventing the bridge from intercepting mouse/touch events.

---

### 2.4 Active Arrow for Main Category

```css
.categories_grid_item--active::before {
    content: "";
    position: absolute;
    bottom: -5px;
    left: 50%;
    transform: translateX(-50%);
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid var(--primary-color);
    z-index: 70;
}
```

**Function:** Downward pointing triangle to indicate the active main category.

---

### 2.5 Details Container

```css
.categories_details_container {
    grid-column: 1 / -1;                    /* Occupies all columns */
    background-color: var(--bg-color-light);
    border: 1px solid var(--border-color-active);
    border-radius: 12px;
    box-shadow: var(--shadow-focus);
    overflow: hidden;
    margin-top: -25px;                      /* Pulling container close to text without overlap */
    z-index: 40;
    display: flex;
    flex-direction: column;
}
```

**Critical Details:**

#### `grid-column: 1 / -1`
**Function:** Occupies all columns from start to finish (full row).

#### `margin-top: -35px`
**Calculation:**
```
Item padding-bottom = 20px
grid-gap = 15px
Total = 35px

Negative pulls container up to create zero-gap fusion
```

**⚠️ Warning:** `margin-top` was set to -25px to achieve perfect balance between proximity to texts and preventing overlap.

---

## 3. Insertion Logic

### 3.1 Main Function: `categories_toggleSubcategoriesGrid`

**Location:** `pages/categories/categories.js`

#### Step 1: Collect all items
```javascript
const allItems = Array.from(document.querySelectorAll('.categories_grid_item'));
```

#### Step 2: Determine clicked item position
```javascript
const clickedIndex = allItems.indexOf(clickedItem);
```

#### Step 3: Calculate row end
```javascript
const columns = window.innerWidth < 480 ? 3 : 4;  // Must match CSS Media Queries
const rowEndIndex = Math.floor(clickedIndex / columns) * columns + (columns - 1);
```

**Example:**
- If you click item number 5 (index 4):
  ```
  Math.floor(4 / 4) = 1
  1 * 4 = 4
  4 + (4 - 1) = 7
  ```
  Result: Insertion will occur after item number 8 (index 7).

#### Step 4: Insertion
```javascript
const insertAfterElement = allItems[Math.min(rowEndIndex, allItems.length - 1)];
insertAfterElement.after(detailsContainer);
```

**Benefit:** This ensures the container always appears at the end of the row, preventing other items from shifting.

---

## 4. Responsive Design 📱💻

> **⚠️ Golden Rule:**  
> **Any new element must include adjustments in all appropriate Media Queries.**

### 4.1 Very Small Screens (< 480px)

```css
@media (max-width: 479px) {
    .categories_grid {
        grid-template-columns: repeat(3, 1fr);  /* 3 columns */
        gap: 8px;
        padding: 0 10px;
    }

    .categories_cell_media {
        width: 85px;
        height: 85px;
    }

    .categories_cell_content__text {
        font-size: 11px;
    }

    .categories_cell_content__icon {
        font-size: 1.5rem;  /* 24px */
    }

    .categories_grid_item--active::after {
        width: 70px;
        height: 32px;
    }

    .categories_product_item__image {
        height: 100px;
    }

    .categories_product_item__name {
        font-size: 0.75rem;
    }
}
```

**Target Devices:** Very small phones (iPhone SE, old phones)

**Key Changes:**
- Reducing columns to 3
- Scaling down images and texts
- Reducing spacing to save space

---

### 4.2 Phones (480px - 767px)

```css
@media (min-width: 480px) and (max-width: 767px) {
    .categories_grid {
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        padding: 0 12px;
    }

    .categories_cell_media {
        width: 95px;
        height: 95px;
    }

    .categories_cell_content__text {
        font-size: 11px;
    }

    .categories_grid_item--active::after {
        width: 75px;
        height: 35px;
    }

    .categories_product_item__image {
        height: 110px;
    }
}
```

**Target Devices:** Most modern smartphones

**Changes:**
- 4 columns (return to base layout)
- Medium image sizes

---

### 4.3 Tablets (768px - 991px)

```css
@media (min-width: 768px) and (max-width: 991px) {
    .categories_grid {
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
    }

    .categories_cell_media {
        width: 110px;
        height: 110px;
    }

    .categories_cell_content__text {
        font-size: 12px;
    }

    .categories_grid_item--active::after {
        width: 80px;
        height: 36px;
    }
}
```

**Target Devices:** iPad, Android tablets

**Changes:**
- Gradual size increase
- Return to base font size (12px)

---

### 4.4 Desktop (992px - 1199px)

```css
@media (min-width: 992px) and (max-width: 1199px) {
    .categories_grid {
        grid-template-columns: repeat(4, 1fr);
        gap: 14px;
    }

    .categories_cell_media {
        width: 115px;
        height: 115px;
    }
}
```

**Target Devices:** Small and medium laptop screens

---

### 4.5 Large Screens (≥ 1200px)

```css
@media (min-width: 1200px) {
    .categories_grid {
        grid-template-columns: repeat(4, 1fr);
        gap: 15px;
    }

    .categories_cell_media {
        width: 120px;
        height: 120px;
    }
}
```

**Target Devices:** Large desktop screens, 4K screens

**Note:** These are the default (base) values.

---

## 5. Design Tokens

### 5.1 Colors

```css
--bg-color-light      /* White (#fff or close to it) */
--bg-color-medium     /* Light gray (#f8f9fa or similar) */
--primary-color       /* Primary color (blue) */
--text-color          /* Base text color */
--border-color        /* Normal border color */
--border-color-active /* Border color for active elements */
```

**Usages:**
- `--bg-color-light`: Main container background, products
- `--bg-color-medium`: Active item background, subcategories
- `--primary-color`: Texts, icons
- `--border-color-active`: Active element borders

---

### 5.2 Shadows

```css
--shadow-soft         /* Soft shadow for normal elements */
--shadow-focus        /* Stronger shadow for active elements */
```

**Usages:**
- `--shadow-soft`: Images, subcategories, products
- `--shadow-focus`: Active item, details container

---

### 5.3 Sizes

#### Main Images:
- **Default:** 120px × 120px
- **Very Small Screens:** 85px
- **Phones:** 95px
- **Tablets:** 110px
- **Desktop:** 115px
- **Large Screens:** 120px

#### Texts:
- **Default:** 12px
- **Small Screens:** 11px
- **Tablets and up:** 12px

#### Icons:
- **Default:** 2rem (32px)
- **Small Screens:** 1.5rem (24px)

---

### 5.4 Spacing

```css
gap: 15px              /* Gap between items (default) */
padding: 0 15px        /* Grid side padding */
padding-bottom: 20px   /* Item bottom padding (critical) */
margin-top: -35px      /* Container negative margin (critical) */
```

---

## 6. Subcategories - Story Style 📸

The subcategory design has been updated to mimic the popular "Stories" style, focusing on circular images with text below them, providing a modern and attractive visual experience.

### 6.1 Items Wrapper

```css
.categories_subcategory_item {
    display: flex;
    flex-direction: column;         /* Vertical order: image then text */
    align-items: center;
    gap: 8px;                       /* Gap between image and text */
    background-color: transparent;  /* Transparent background to highlight circle */
    border: none;                   /* Removal of old borders */
    padding: 5px;
    text-decoration: none;
    min-width: 80px;
    max-width: 100px;
    cursor: pointer;
    
    /* Animation Initial State */
    opacity: 0;                     /* Initially hidden for animation */
    animation: categoryPopIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
```

**Features:**
- **Transparency:** The container itself has no background or borders, making the item appear "floating".
- **Layout:** Vertical Stack.
- **Size:** Fixed width (80-100px) to ensure alignment.

---

### 6.2 Circular Image

```css
.categories_subcategory_item__image {
    width: 80px;
    height: 80px;
    object-fit: cover;              /* Fill circle without distortion */
    border-radius: 50%;             /* Full circle */
    border: 1px solid var(--border-color); /* Thin border matching main items */
    background-color: #fff;
    box-shadow: var(--shadow-soft);
    display: block;
    transition: all 0.3s ease;
}
```

**Details:**
- **Dimensions:** 70px × 70px (fixed).
- **Border:** 1px (unified with main items).
- **Shape:** Perfectly circular (`border-radius: 50%`).

---

### 6.3 Fallback Icon

If an image is unavailable, an icon is displayed inside a circle perfectly matching the image design:

```css
.categories_subcategory_item__icon {
    width: 80px;
    height: 80px;
    font-size: 1.8rem;
    color: var(--primary-color);
    background-color: var(--bg-color-light);
    border: 1px solid var(--border-color);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-soft);
    transition: all 0.3s ease;
}
```

---

### 6.4 Label

The text is separated into a dedicated `span` element for easy control:

```css
.categories_subcategory_title {
    color: var(--primary-color);
    font-size: 12px;             /* Match main category size */
    font-weight: 500;            /* Match main category weight */
    text-align: center;
    line-height: 1.3;
    width: 100%;
    word-break: break-word;     /* Break long words */
}
```

---

### 6.5 Active State

When a subcategory is selected:

```css
.categories_subcategory_item--active .categories_subcategory_item__image,
.categories_subcategory_item--active .categories_subcategory_item__icon {
    border-color: var(--border-color-active);
    box-shadow: var(--shadow-focus);
    transform: scale(1.05);     /* Slight scale up */
}
```

**Visual Indicators:**
1. **Glow:** The border colors with the activation color (`--border-color-active`).
2. **Shadow:** The focus shadow appears (`--shadow-focus`).
3. **Arrow:** A small arrow appears pointing up (towards the image) below the text.

---

### 6.6 Staggered Animation 🚀

Subcategories appear with a staggered "Pop-In" effect (one after another) for liveliness.

**CSS Keyframes:**
```css
@keyframes categoryPopIn {
    0% { opacity: 0; transform: translateY(20px) scale(0.8); }
    60% { transform: translateY(-5px) scale(1.05); }     /* Slight bounce */
    100% { opacity: 1; transform: translateY(0) scale(1); }
}
```

**JavaScript Logic:**
The time delay (`animation-delay`) is calculated based on the item's order (`index`):

```javascript
// In categories_createSubcategoryItemDiv function
subItem.style.animationDelay = `${index * 0.05}s`;
```

Where `index` is the item's order in the array. This means the first item appears immediately, the second after 50ms, the third after 100ms, and so on.

---

## 7. Products Gallery

### 7.1 Internal Wrapper (Frame)

```css
.categories_gallery_internal_wrapper {
    border: 1px solid var(--border-color-active);
    border-radius: 12px;
    box-shadow: var(--shadow-focus);
    margin: 0px 15px 15px 15px;
    background-color: var(--bg-color-light);
    overflow: hidden;
}
```

**Function:** A frame that wraps the gallery controls and the product grid, providing visual separation from the subcategories.

---

### 7.2 Container

```css
.categories_products_gallery_container {
    padding: 0px;
    max-height: 30vh;
    overflow-y: auto;
}

.categories_products_gallery_container.grid-view {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
    gap: 12px;
}
```

**Functions:**
- **Max Height:** 30% of screen height
- **Overflow Y:** Vertical scroll
- **Grid:** Automatic columns with a minimum of 110px

---

### 7.3 Product Item

```css
.categories_product_item {
    display: flex;
    flex-direction: column;
    align-items: center;
    background-color: var(--bg-color-light);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 8px;
    cursor: pointer;
    transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    box-shadow: var(--shadow-soft);
    position: relative;
    overflow: hidden;
}

.categories_product_item:active {
    transform: scale(0.95);
}
```

---

### 7.4 Product Image

```css
.categories_product_item__image {
    width: 100%;
    height: 120px;
    object-fit: contain;
    display: block;
    margin-bottom: 8px;
    background-color: #fff;
}
```

---

### 7.5 Product Name

```css
.categories_product_item__name {
    font-size: 0.85rem;
    color: var(--text-color);
    font-weight: 600;
    text-align: center;
    margin: 0;
    width: 100%;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.3;
}
```

**Technology:** Line Clamp to display only two lines with ellipsis (...) for long text.

---

## 8. Interactions and Animations

### 8.1 Click Effect (Active State)

```css
.categories_grid_item:active {
    transform: scale(0.95);
}

.categories_product_item:active {
    transform: scale(0.95);
}
```

**Effect:** 5% scale reduction upon pressing.

---

### 8.2 Transitions

```css
transition: transform 0.2s ease;
transition: all 0.3s ease;
transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
```

**Types:**
- **0.2s ease:** Fast and simple
- **0.3s ease:** Medium
- **cubic-bezier:** Slight "bounce" effect

---

### 8.3 Custom Animations

```css
@keyframes categories_slide_fade_in {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
```

**Usage:** Gradual appearance of elements from the top.

---

## 9. Critical Maintenance Rules ⚠️

### 9.1 When Changing Column Count

**Mandatory Steps:**

1. **Update CSS:**
   ```css
   .categories_grid {
       grid-template-columns: repeat(X, 1fr);
   }
   ```

2. **Update JavaScript:**
   ```javascript
   const columns = X;  // In categories.js
   ```

3. **Update all Media Queries:**
   - Check every `@media` and update `grid-template-columns`

4. **Testing:**
   - Test on all screen sizes
   - Ensure the container appears in the correct place

---

### 9.2 When Changing Image Sizes

**Steps:**

1. **Update Base Size:**
   ```css
   .categories_cell_media {
       width: Xpx;
       height: Xpx;
   }
   ```

2. **Update all Media Queries:**
   - Maintain percentages (e.g., Mobile = 70% of base size)

3. **Update Bridge (if necessary):**
   ```css
   .categories_grid_item--active::after {
       width: Ypx;  /* As needed */
   }
   ```

4. **Test Visual Balance:**
   - Ensure texts and images are balanced

---

### 9.3 When Modifying Fusion

**Interconnected Critical Values:**

```css
/* These values must match */
padding-bottom: 20px;           /* In .categories_grid_item */
gap: 15px;                      /* In .categories_grid */
margin-top: -35px;              /* In .categories_details_container */
                                /* Calculation: -(20 + 15) = -35 */

bottom: -17px;                  /* In ::after */
height: 37px;                   /* In ::after */
                                /* Calculation: 20 - 15 + 15 - 2 = -17 */
                                /* Calculation: 35 + 2 = 37 */
```

**⚠️ Warning:** Changing any value requires recalculating the others.

---

### 9.4 When Adding a New Element

**Golden Rule:**

> **Any new element must be created to fit various screen types.**

**Steps:**

1. **Create Base Styles:**
   ```css
   .new-element {
       /* Default styles */
   }
   ```

2. **Add Adjustments in Media Queries:**
   ```css
   @media (max-width: 479px) {
       .new-element {
           /* Adjustments for small screens */
       }
   }
   
   @media (min-width: 480px) and (max-width: 767px) {
       .new-element {
           /* Adjustments for phones */
       }
   }
   
   /* ... and so on for all ranges */
   ```

3. **Testing:**
   - Test on all screen sizes (at least 5 ranges)
   - Use developer tools to verify

---

### 9.5 Z-Index Hierarchy

**Current Order (from bottom to top):**

```
1  - Normal elements
40 - Details container
50 - Active item
55 - Fusion bridge
60 - Active item media
```

**⚠️ Warning:** Do not use a z-index higher than 60 unless absolutely necessary.

---

### 9.6 Image Format and Dimensions 🖼️

**Strict Rule:**
All images in main categories (`mainCategories`) and subcategories (`subCategories`) must strictly adhere to the following standards:

1.  **Format:** WebP only (for performance optimization and size reduction).
2.  **Dimensions:** Exactly 150px × 150px.
3.  **Goal:** Uniform sizes and ensuring fast application loading.

**⚠️ Warning:** Any image not adhering to these standards may lead to display distortion or slow loading.

---

## 10. Related Files

### 10.1 CSS Files
- **Main:** `pages/categories/categories.css` (398 lines)

### 10.2 JavaScript Files
- **Main Logic:** `pages/categories/categories.js`
- **Main Functions:**
  - `categories_loadCategoriesAsTable()`
  - `categories_toggleSubcategoriesGrid()`
  - `categories_createDetailsContainer()`

### 10.3 HTML Files
- **Template:** `pages/categories/categories.html`

### 10.4 Data Files
- **Category List:** `shared/list.json`

### 10.5 Documentation Files
- **This File:** `maintenance/CATEGORIES_STYLES.md`

---

## 11. Version Information

- **Last Updated:** 2026-01-07
- **Version:** 1.2.14
- **Status:** Stable ✅
- **Recent Changes:**
  - Removal of Inverted Radius Curves
  - Enlarging images from 100px to 120px
  - Reducing texts from 14px to 12px
  - Adding a comprehensive Responsive Design system (5 ranges)

---

## 12. Maintenance Tips

### ✅ Do:
- Test on all screen sizes before pushing
- Maintain percentages between sizes
- Use CSS variables for colors and shadows
- Document any changes in this file

### ❌ Don't:
- Do not change column count without updating JavaScript
- Do not add elements without Media Queries
- Do not use fixed sizes without testing
- Do not change fusion values without recalculating

---

**End of Guide**

*For any inquiries or updates, please update this file and indicate the version number.*
