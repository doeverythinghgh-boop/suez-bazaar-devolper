# Smart Delivery Logistics and Cost Calculation

Bazaar features a sophisticated delivery system that optimizes routes for multi-seller orders and calculates costs based on real-world factors.

## 1. Route Optimization Algorithm (`smartDeliveryRoute.js`)
The system solves a localized version of the Traveling Salesman Problem (TSP):
- **Nodes**: Office (Start), Sellers (Intermediate), Customer (End).
- **Mechanism**: Brute-force permutation (since sellers per order is usually <8).
- **Goal**: Minimize total distance and time between the office, all relevant pickup points, and the final destination.

## 2. Monetary Cost Formula (`deliveryCostCalculator.js`)
Cost calculation is dynamic and depends on factors defined in `delivery_config.json`.

### Calculation Variables:
- **Base Fee**: Minimum cost for any delivery.
- **Distance Cost**: Fixed price per kilometer tracked.
- **Load Weight**: Surcharge for "Heavy Load" items.
- **External Factors**: Weather conditions (Rain/Heat) and Area-specific multipliers.
- **Service Quality**: Driver rating adjustment and system commission.
- **Discounts**: Dynamic reductions based on order value or promotional codes.

## 3. Self-Delivery Option (`isDelevred`)
Sellers can choose to handle their own deliveries by setting `isDelevred: 1` in their profile.
- **Impact**: These sellers are excluded from the smart route calculation.
- **Cost**: No smart delivery fee is added for items from these sellers; any shipping cost must be negotiated directly or included in the product price.

## 4. Central Configuration (`delivery_config.json`)
All pricing factors are stored in a central JSON file within `pages/cardPackage/data/`. This allows administrators to update the entire city's delivery pricing instantly without changing code.

## 5. Implementation Bridge
The `deliveryService.js` acts as the coordinator between the cart UI, the route optimizer, and the cost calculator. It ensures that the delivery cost shown to the user is always accurate to the current cart contents and geography.
