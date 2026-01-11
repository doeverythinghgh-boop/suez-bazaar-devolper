# Order Lifecycle and Stepper Status System

The Stepper module is the primary interface for tracking the progress of an order through 7 distinct technical statuses across 4 visual stages.

## 1. The Status Matrix
| Status Key | Description |
| :--- | :--- |
| **PENDING** | Default state upon order creation. |
| **CONFIRMED** | Accepted and verified by the seller. |
| **SHIPPED** | Handed over to delivery or physically sent. |
| **DELIVERED** | Receipt confirmed by the purchaser. |
| **CANCELLED** | Voided by the purchaser during review. |
| **REJECTED** | Declined by the seller (e.g., out of stock). |
| **RETURNED** | Attempted delivery failed; item returned to seller. |

## 2. Roles and Permissions Matrix
- **Admin**: Full override capability. Can modify any stage.
- **Buyer**: Controls "Review" and "Delivered" stages.
- **Seller**: Controls "Confirmed" and "Shipped" stages for their items.
- **Courier**: Views pickup details and confirms "Shipped" or "Delivered".

## 3. Data Integrity: The `order_status` Blob
Order history is stored as a composite string in the database: `StepID # Timestamp # JSON_Blob`.

### JSON Blob Contents:
- Individual item statuses (mapped by ID).
- **Time Stamps**: `__date_step-confirmed__`, etc.
- **Locks**: `__confirmation_locked_{ID}__` to prevent post-save tampering.

## 4. Sequential Validation (`workflowLogic.js`)
Stages must be activated in a strict sequence: **1. Review → 2. Confirmed → 3. Shipped → 4. Delivered**. A later stage cannot be activated if the previous one is inactive, ensuring logical flow.

## 5. Technical Bridging
The Stepper runs in an isolated Iframe. Data is injected by the parent `sales-movement.js` into `window.globalStepperAppData`.
- **Single Source of Truth**: UI state only updates after a `200 OK` response from the `/api/update-item-status` or `/api/orders` endpoints.
- **Auto-Scroll Tutorial**: On first use, the stepper UI automatically scrolls left and right to demonstrate swiping functionality.
- **Service Mode**: If `orderType === 1`, the stepper displays a footer for uploading "Photography Request" images and modifying the `total_amount`.
