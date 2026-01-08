# 📦 Shopping Cart System Documentation (CardPackage)

This document provides a comprehensive and detailed technical explanation of how the `CardPackage` module works, which is responsible for managing the shopping cart, calculating smart delivery costs, and completing the purchase process.

---

## 📂 File and Directory Structure

The source code is located in `pages/cardPackage/`, and the logic has been divided into small specialized modules (Modular Architecture) for ease of maintenance.

### 1. The `js/` Directory (Programming Modules)

| File                            | Function and Responsibility                                                                                                        |
| :------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------- |
| **`cartPackage-init.js`**       | **Starting Point:** Initializes the page, loads the header, and calls the main cart loading function.                              |
| **`cartPackage-ui.js`**         | **Rendering:** Responsible for rendering cart items, updating the summary, and displaying the delivery details window.             |
| **`cartPackage-events.js`**     | **Events:** Links buttons (delete, increase, decrease, checkout) to the appropriate programming functions.                         |
| **`cartPackage-checkout.js`**   | **Checkout:** Manages the order completion process, session verification, building the order object, and sending it to the server. |
| **`cartPackage-api.js`**        | **Communication:** A simple adapter to send HTTP requests (like `createOrder`) to the backend.                                     |
| **`cartPackage-notes.js`**      | **Notes:** Manages the logic for adding, editing, and saving notes for each product in the cart.                                   |
| **`deliveryService.js`**        | **Delivery Manager:** The maestro that links route calculation and cost calculation to fetch the final cost.                       |
| **`smartDeliveryRoute.js`**     | **Smart Route:** A smart algorithm that determines the shortest path passing through all sellers (TSP Algorithm).                  |
| **`deliveryCostCalculator.js`** | **Cost Calculator:** A pure function that calculates the monetary value based on distance and other factors.                       |
| **`deliveryConfigLoader.js`**   | **Settings:** Loads delivery settings from a JSON file and caches them.                                                            |

### 2. The `data/` Directory (Data)

| File                       | Function                                                                                                                               |
| :------------------------- | :------------------------------------------------------------------------------------------------------------------------------------- |
| **`delivery_config.json`** | Central configuration file containing all constants and factors for cost calculation (e.g., price per km, weather factors, discounts). |

---

## 🛠️ Workflows

### 1. Page Initialization
- Work begins from `cartPackage-init.js`.
- `cartPage_loadCart` from `cartPackage-ui.js` is called.
- Event listeners are set up via `cartPage_setupEventListeners` from `cartPackage-events.js`.

### 2. Loading and Rendering the Cart
- The `cartPage_loadCart` function reads the cart from `localStorage`.
- If the cart is empty: The "Empty Cart" screen appears.
- If it is full:
  1. HTML is generated for each product.
  2. The subtotal is calculated and displayed.
  3. **Most importantly:** Smart delivery cost calculation is called to update the final price (see the next section).

### 3. Smart Delivery System 🧠

This is the most complex and intelligent part of the system. The process is as follows:

#### A. Determining Locations (`deliveryService.js`)
- **Office (Start Point):** Fetched from settings.
- **Customer (End Point):** Fetched from the user session (`userSession`) or using a default location.
- **Sellers (Waypoints):** Unique coordinates are extracted for each seller in the cart.

#### B. Calculating the Optimal Route (`smartDeliveryRoute.js`)
- Uses a **Brute-force Permutation** algorithm to try all possible arrangements for visiting sellers.
- The route is always: **Office ⬅️ Sellers (shortest order) ⬅️ Customer**.
- The result is the "Total Distance" accurately calculated based on the optimal visit order.

#### C. Calculating Monetary Cost (`deliveryCostCalculator.js`)
Takes the calculated distance and applies a complex formula based on `delivery_config.json`:

$$
\text{Total Cost} = \text{Base Fee} + (\text{Distance} \times \text{Price/KM}) + \text{Additions} - \text{Discounts}
$$

**Influencing Factors:**
1. **Heavy Load:** If the product requires a truck, the `special_vehicle_factor` is applied.
2. **Weather:** Increased cost in rain (`weather_factors`).
3. **Area:** Additional cost for remote areas (`location_factors`).
4. **Driver Rating:** Discount if the driver is excellent (`driver_rating_config`).
5. **Order Value:** Additional fees for expensive orders (`high_order_fee`).
6. **Incentive Discount:** For small orders (`discount_value`).
 
 #### D. Self-Delivery Sellers 🤝
 The system is flexible in handling sellers who own their own delivery fleet or prefer to deliver themselves (`isDelevred: 1`):
 - **Route Exception:** These sellers are completely excluded from "Smart Route" calculations to save time and effort for the app's courier.
 - **Fee Exemption:** If **all** sellers in the cart deliver themselves, the fixed delivery fee (`FIXED_DELIVERY_FEE`) is zeroed out, and the delivery row is hidden from the order summary to simplify the user experience.
 - **Hybrid Delivery:** If there are volunteer sellers and others who need a courier, the route and fees are calculated only for the sellers who need a courier.

 #### E. Minimum Order Limit and Pre-purchase Verification 🛒
 Seller preferences are stored in their user data:
 - **`isDelevred`**: Decides whether the seller is included in the smart delivery system (value 1 means self-delivery).
 - **`limitPackage`**: Determines the minimum purchase value from this seller to complete the order.
 - **Data Update**: The user can adjust these settings during "Create New Account" or through "Edit Profile" via a dedicated interface.
 - **Audit**: When attempting to complete a purchase, the system checks the shopping cart and compares each seller's total purchases with their `limitPackage`. If the condition is not met, an alert message appears preventing the purchase until the minimum limit is reached.

### 4. Checkout Flow
- When clicking "Checkout" (`cartPackage-checkout.js`):
  1. Verify login.
  2. Recalculate the total sum to ensure accuracy.
  3. Create a unique `order_key`.
  4. Prepare the order object (`orderData`).
  5. Display a confirmation window (Swal) with the final price.
  6. Upon approval, send via `createOrder` to `/api/orders`.
  7. Activate notifications (`handlePurchaseNotifications`).
  8. Empty the cart and display a success message.

---

## ⚙️ Configuration

To change delivery prices or factors, you don't need to modify the code. Just edit the `pages/cardPackage/data/delivery_config.json` file:

```json
{
    "defaults": {
        "base_fee": 15,          // Base fee (meter opening)
        "price_per_km": 5,       // Price per kilometer
        "high_order_fee": 20,    // High order fee
        "currency_symbol": "EGP" // Currency
    },
    "weather_factors": { ... },  // Weather factors
    "vehicle_factors": { ... }   // Vehicle factors
}
```

---

## 💡 Important Notes for Developers

1. **Dependency:** `deliveryService.js` relies entirely on loading settings first.
2. **Performance:** The route algorithm (`smartDeliveryRoute.js`) is excellent for a small number of sellers (less than 8). If the number exceeds that, the algorithm may need optimization (Heuristic Approach).
3. **Documentation:** All functions are documented with JSDoc in English within the code for easy tracking.
4. **Exceptions:** The `isDelevred` or `sellerIsDelevred` field is checked for each product in the cart to determine the applied delivery policy.
