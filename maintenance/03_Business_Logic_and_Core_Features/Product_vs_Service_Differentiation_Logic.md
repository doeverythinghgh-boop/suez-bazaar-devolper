# Product vs Service Differentiation Logic

Bazaar distinguishes between physical products (Add1) and non-physical services (Add2) throughout the entire application lifecycle.

## 1. Data-Level Differentiation
- **`orderType`**: 
  - `0`: Physical Product.
  - `1`: Service (e.g., Oriflame, Subscriptions, Programming).
- **`serviceType` flag**: Stored in the database to drive conditional UI rendering.

## 2. Dynamic Component Swapping
The application uses two separate view and edit modules based on the category of the item.

| Feature | Physical Product (ProductView) | Service (ProductView2) |
| :--- | :--- | :--- |
| **Media** | Standard Grid/Gallery. | Interactive 3D CSS Slider. |
| **Transaction** | "Add to Cart" (Quantity based). | "Send Order" (Request/Photo based). |
| **Editing** | Fields for Price, Quantity, Discount. | Fields for Description and Seller Message only. |
| **Interaction** | Straightforward purchase. | Supports "Photography Request" with buyer attachments. |

## 3. The `ProductStateManager` Bridge
This central manager handles the state transitions:
1. **Selection**: User picks a category from the `CategoryModal`.
2. **Detection**: `resolveCategoryNames()` checks if the category is flagged as a service.
3. **Routing**: Redirects the user to `productAdd/Edit` or `productAdd2/Edit2` accordingly.

## 4. Display Adaptation
- **Seller View**: When a seller views their own service in `ProductView2`, the "Send Order" box is hidden to prevent self-ordering.
- **Admin View**: Admins see a "View Only" version of both modules that hides price modification and purchase buttons.

## 5. Pricing Logic
Services often have a `total_amount` of 0 initially, which is later updated by the seller or admin within the Stepper once the service scope is finalized, whereas physical products have a fixed, upfront price.
