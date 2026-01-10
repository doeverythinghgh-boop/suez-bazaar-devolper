# User Products Dashboard (product2Me) Documentation

## Overview
The "My Products" page (`pages/product2Me/product2Me.html`) serves as the central dashboard for sellers to manage their inventory. It allows users to view, search, filter, edit, and delete their products and services.

**Primary Goal:** Provide a seamless interface for users to oversee their approved and pending items.

## File Structure
- **HTML:** `pages/product2Me/product2Me.html` - Defines the layout, grid, and filter controls.
- **JavaScript:** `pages/product2Me/product2Me.js` - Contains the core logic for fetching data, rendering UI, and handling actions.
- **CSS:** `pages/product2Me/product2Me.css` - Styles the product grid, cards, and responseive layout.

---

## Core Functionality

### 1. Data Loading Strategy (`loadProducts`)
The page employs a parallel fetching strategy to ensure all user items are displayed, regardless of their approval status.

- **Dual API Calls:**
  - **Fetch 1:** Requests products with `status=1` (Approved).
  - **Fetch 2:** Requests products with `status=0` (Pending Review).
- **Merging & Sorting:**
  - Results from both calls are merged into a single `myProducts` array.
  - The merged list is sorted by ID (descending) to show the newest items first.
- **Error Handling:**
  - If fetching fails, the loading state is hidden gracefully.
  - If no products exist, an "Empty State" UI is displayed.

### 2. Rendering Logic (`renderProducts`, `createProductCard`)
- **Visual Status Indicator:**
  - Pending products (`is_approved: 0`) are marked with a "Under Review" (قيد المراجعة) badge overlaid on the product image.
- **Image Handling:**
  - Displays the first image from the comma-separated `ImageName` list.
  - includes a fallback icon (`fa-box`) if no image is available or if loading fails.
- **Actions:**
  - **Edit:** Triggers `editProduct(id)`.
  - **Delete:** Triggers `deleteProduct(id)`.
  - **View Details:** Clicking the card body opens the detailed view via `loadProductView`.

### 3. Filtering and Searching
The page supports server-side filtering:
- **Search Term:** Filters by product name (Arabic text is normalized).
- **Categories:**
  - **Main Category:** Populated dynamically from `window.appCategoriesList`.
  - **Sub Category:** Updates dependent on the selected Main Category.

### 4. User Actions

#### A. Edit Product (`editProduct`)
1. Finds the product object from the local `myProducts` array.
2. Opens the `CategoryModal` to confirm/change the valid classification.
3. Upon category confirmation, initializes the form via `loadProductForm` in **Edit Mode**.
   - Note: Editing a product typically resets its status to "Pending" (`is_approved: 0`) in the backend to require re-validation.

#### B. Delete Product (`deleteProduct`)
1. Displays a **SweetAlert2** confirmation dialog.
   - **Critical Fix:** Includes `didOpen: () => Swal.hideLoading()` to prevent the UI from getting stuck in a loading state.
2. If confirmed:
   - Deletes associated images from Cloudflare R2 (if applicable).
   - Calls the backend API `deleteProduct_`.
   - Removes the item from the local DOM/Array upon success to avoid a full page reload.

---

## UI Components
- **Loading State:** Shown during the initial data fetch.
- **Empty State:** Displayed when the user has no products.
- **Grid Layout:** Responsive grid adapting to screen size.

## External Dependencies
- **SweetAlert2:** For confirmation dialogs and alerts.
- **ProductStateManager:** For managing data between views.
- **API Endpoints:**
  - `GET /api/products` (supports `status` param).
  - `DELETE /api/products` (via `deleteProduct_` helper).

## Recent Key Changes
1. **Pending Items Support:** Previously, only approved items were shown. Now both approved and pending are fetched and merged.
2. **Delete Fix:** Resolved an issue where the delete confirmation dialog would hang in a loading state.
3. **Redirects:** edit pages now redirect back to this dashboard upon successful save (`pages/productEdit/js/edit_submit.js` & `edit2_submit.js`).
