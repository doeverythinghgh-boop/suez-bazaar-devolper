# Shopping Cart and Checkout Workflows

The shopping cart system manages the collection of products, delivery calculations, and the final order creation process.

## 1. Modular Architecture (`pages/cardPackage/`)
- `cartPackage-init.js`: Core initialization and state check.
- `cartPackage-ui.js`: Dynamic rendering of the cart list and empty states.
- `cartPackage-api.js`: Communication with `/api/orders` for order submission.
- `cartPackage-checkout.js`: Final validation and confirmation logic.

## 2. Cart Management
- **Storage**: The cart state is stored in `localStorage` as a serialized JSON array.
- **Deduplication**: Adding the same product twice increments the `quantity` rather than adding a new entry.
- **Product Notes**: Buyers can attach specific text notes to individual products within the cart (`cartPackage-notes.js`).

## 3. The Checkout Process
1. **Login Check**: Ensures the user is authenticated before proceeding.
2. **Dynamic Recalculation**: The system performs a final sum check of all items, applying the smart delivery cost if applicable.
3. **Seller Limits**: Verifies each seller's `limitPackage` constraint (minimum order value).
4. **Data Construction**: Compiles the `orderData` object, including `order_items`, `total_amount`, and `order_key` (generated via unique serial logic).
5. **Atomic Transaction**: The `/api/orders` endpoint uses `db.batch` to ensure the order and its items are recorded simultaneously or not at all (all-or-nothing).

## 4. Post-Checkout Workflow
- **State Cleanup**: On success, the local cart is emptied.
- **Notifications**: Automatic notifications are sent to relevant sellers and administrators.
- **User Redirection**: Redirects the user to the "My Purchases" section.

## 5. Technical Safety
Every checkout involves a `SweetAlert2` confirmation prompt to prevent accidental orders and ensure the user agrees to the final calculated delivery cost.
