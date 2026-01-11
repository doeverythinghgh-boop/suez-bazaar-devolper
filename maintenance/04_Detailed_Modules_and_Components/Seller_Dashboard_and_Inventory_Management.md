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
