/**
 * @file pages/cardPackage/js/deliveryCostCalculator.js
 * @description Delivery Cost Calculator Module
 * 
 * This module calculates delivery costs based on multiple factors:
 * - Distance traveled (sum of all segments)
 * - Order value (minimum threshold for free delivery)
 * - Vehicle type (bike, car, truck)
 * - Weather conditions (normal, light rain, heavy rain)
 * - Delivery speed (normal, fast, instant)
 * - Delivery location zone (city, suburbs, outside city)
 * - Driver rating (quality-based pricing)
 * - Special vehicle requirement (for fragile/large items)
 * 
 * The final cost is calculated using a comprehensive formula that
 * combines all these factors with appropriate weights and multipliers.
 */

/* ============================================================
   1️⃣ DEFAULT CONSTANTS & BASE VALUES
   ============================================================ */

/**
 * Base fee charged for initiating any delivery service.
 * This is a fixed cost added to every delivery regardless of distance.
 * @constant {number}
 */
const BASE_FEE = 15;

/**
 * Price charged per kilometer traveled.
 * This is multiplied by the total distance to calculate distance cost.
 * @constant {number}
 */
const PRICE_PER_KM = 5;

/**
 * Minimum order value threshold for high-value order fee.
 * Orders with value >= this threshold incur an additional handling fee.
 * @constant {number}
 */
const HIGH_ORDER_VALUE_THRESHOLD = 5000;

/**
 * Additional fee charged for high-value orders (>= 5000 EGP).
 * This covers extra handling and insurance for expensive orders.
 * @constant {number}
 */
const HIGH_ORDER_FEE = 20;

/**
 * Minimum order value to qualify for discount.
 * Only orders below this threshold receive the discount.
 * @constant {number}
 */
const DISCOUNT_THRESHOLD = 200;

/**
 * Discount applied to orders below the discount threshold.
 * This helps support small orders and encourages customers.
 * @constant {number}
 */
const DISCOUNT = 5;

/* ============================================================
   2️⃣ IMPACT FACTORS & MULTIPLIERS
   ============================================================ */

/**
 * Multiplier for special vehicle requirements.
 * Applied when the order requires special handling (fragile items, 
 * temperature control, oversized packages, etc.).
 * This adds 50% to the distance cost.
 * @constant {number}
 */
const SPECIAL_VEHICLE_FACTOR = 0.5;

/**
 * Weather condition impact multipliers.
 * Different weather conditions affect delivery difficulty and time.
 * 
 * @constant {Object}
 * @property {number} normal - No additional cost (0%)
 * @property {number} light_rain - Adds 10% to distance cost
 * @property {number} heavy_rain - Adds 30% to distance cost (slower, more dangerous)
 */
const WEATHER_FACTORS = {
    normal: 0,        // Clear weather, no impact
    light_rain: 0.1,  // Slight delay, minor safety concerns
    heavy_rain: 0.3,  // Significant delay, safety risks
};

/**
 * Location zone impact multipliers.
 * Different zones have varying accessibility and traffic conditions.
 * 
 * @constant {Object}
 * @property {number} city - No additional cost (base zone)
 * @property {number} suburbs - Adds 15% to distance cost
 * @property {number} outside_city - Adds 30% to distance cost (rural/remote areas)
 */
const LOCATION_FACTORS = {
    city: 0,           // Urban center, easy access
    suburbs: 0.15,     // Residential areas, moderate access
    outside_city: 0.3, // Remote areas, difficult access
};

/**
 * Vehicle type impact multipliers.
 * Different vehicles have different operational costs.
 * 
 * @constant {Object}
 * @property {number} bike - No additional cost (most economical)
 * @property {number} car - Adds 25% to distance cost
 * @property {number} truck - Adds 60% to distance cost (for large/heavy items)
 */
const VEHICLE_FACTORS = {
    bike: 0,    // Motorcycle/bicycle, cheapest option
    car: 0.25,  // Standard car, moderate cost
    truck: 0.6, // Large vehicle, highest cost
};

/**
 * Estimated Time of Arrival (ETA) impact multipliers.
 * Faster delivery requires priority handling and routing.
 * 
 * @constant {Object}
 * @property {number} normal - No additional cost (standard delivery)
 * @property {number} fast - Adds 20% to distance cost (priority delivery)
 * @property {number} instant - Adds 40% to distance cost (immediate delivery)
 */
const ETA_FACTORS = {
    normal: 0,    // Standard delivery time
    fast: 0.2,    // Expedited delivery
    instant: 0.4, // Same-hour delivery
};

/**
 * Calculates the driver rating impact factor.
 * Higher-rated drivers may receive a small discount as an incentive.
 * Lower-rated drivers incur a penalty to encourage quality service.
 * 
 * @function driverRatingFactor
 * @param {number} rating - Driver's average rating (0-5 scale)
 * @returns {number} Multiplier to apply to distance cost
 * 
 * Rating Tiers:
 * - 4.5 and above: -5% discount (reward for excellent service)
 * - 4.0 to 4.49: No change (acceptable service)
 * - Below 4.0: +10% penalty (poor service quality)
 */
function driverRatingFactor(rating) {
    if (rating >= 4.5) return -0.05; // Excellent driver, small discount
    if (rating >= 4) return 0;       // Good driver, no change
    return 0.1;                      // Poor driver, penalty applied
}

/* ============================================================
   3️⃣ MAIN DELIVERY COST CALCULATION FUNCTION
   ============================================================ */

/**
 * Calculates the total delivery cost based on multiple parameters.
 * 
 * This function implements a comprehensive pricing model that considers:
 * - Base operational costs
 * - Distance-based pricing
 * - Order value thresholds
 * - Environmental factors (weather, location)
 * - Service quality factors (driver rating, vehicle type)
 * - Speed requirements (ETA)
 * - Special handling needs
 * 
 * @function calculateDeliveryCost
 * 
 * @param {Object} params - Delivery parameters object
 * @param {number[]} params.distances - Array of distance segments [Z1, Z2, Z3, ...]
 *                                      Each segment represents distance between consecutive points
 *                                      Example: [office→seller1, seller1→seller2, seller2→customer]
 * @param {number} params.orderValue - Total order value in currency units (A)
 * @param {boolean} params.specialVehicle - Whether special vehicle is required (P)
 *                                          true = fragile/large items need special handling
 * @param {string} params.weather - Current weather condition (Wthr)
 *                                  Options: 'normal', 'light_rain', 'heavy_rain'
 * @param {string} params.location - Delivery zone type (L)
 *                                   Options: 'city', 'suburbs', 'outside_city'
 * @param {string} params.vehicleType - Type of vehicle to use (Q)
 *                                      Options: 'bike', 'car', 'truck'
 * @param {number} params.driverRating - Driver's average rating 0-5 (U)
 * @param {string} params.etaType - Delivery speed requirement (ETA)
 *                                  Options: 'normal', 'fast', 'instant'
 * 
 * @returns {number} Total delivery cost in currency units (minimum 0)
 * 
 * @example
 * const cost = calculateDeliveryCost({
 *   distances: [3, 5, 2],        // 3km + 5km + 2km = 10km total
 *   orderValue: 180,             // Below minimum, will incur low order fee
 *   specialVehicle: true,        // Requires special handling
 *   weather: "heavy_rain",       // Bad weather conditions
 *   location: "outside_city",    // Remote delivery location
 *   vehicleType: "car",          // Standard car delivery
 *   driverRating: 4.2,           // Good driver rating
 *   etaType: "fast"              // Expedited delivery
 * });
 * // Returns calculated cost considering all factors
 */
function calculateDeliveryCost({
    distances,       // Array of distance segments
    orderValue,      // Total order value
    specialVehicle,  // Special vehicle requirement flag
    weather,         // Weather condition
    location,        // Delivery zone
    vehicleType,     // Vehicle type
    driverRating,    // Driver rating
    etaType          // Delivery speed
}) {

    // ========================================
    // STEP 1: Calculate Total Distance (ΣZi)
    // ========================================
    // Sum all distance segments to get total travel distance
    // Example: [3, 5, 2] → 3 + 5 + 2 = 10 km
    const totalDistance = distances.reduce((sum, d) => sum + d, 0);

    // ========================================
    // STEP 2: Calculate Base Distance Cost
    // ========================================
    // Multiply total distance by per-kilometer rate
    // This is the foundation cost that other factors will modify
    const distanceCost = totalDistance * PRICE_PER_KM;

    // ========================================
    // STEP 3: Apply High Order Value Fee
    // ========================================
    // If order value is >= threshold, add handling fee for expensive orders
    // This covers extra insurance and careful handling
    const orderValueFee =
        orderValue >= HIGH_ORDER_VALUE_THRESHOLD ? HIGH_ORDER_FEE : 0;

    // ========================================
    // STEP 4: Calculate Special Vehicle Cost
    // ========================================
    // If special vehicle is required (fragile items, temperature control, etc.)
    // Add 50% of the distance cost as additional charge
    const specialVehicleCost =
        specialVehicle ? distanceCost * SPECIAL_VEHICLE_FACTOR : 0;

    // ========================================
    // STEP 5: Apply Weather Impact
    // ========================================
    // Weather conditions affect delivery difficulty and safety
    // Multiply distance cost by weather factor (0%, 10%, or 30%)
    const weatherCost =
        distanceCost * (WEATHER_FACTORS[weather] || 0);

    // ========================================
    // STEP 6: Apply Location Zone Impact
    // ========================================
    // Different zones have different accessibility levels
    // Remote areas cost more due to distance and road conditions
    const locationCost =
        distanceCost * (LOCATION_FACTORS[location] || 0);

    // ========================================
    // STEP 7: Apply Vehicle Type Impact
    // ========================================
    // Different vehicles have different operational costs
    // Larger vehicles (trucks) cost more than bikes
    const vehicleCost =
        distanceCost * (VEHICLE_FACTORS[vehicleType] || 0);

    // ========================================
    // STEP 8: Apply Driver Rating Impact
    // ========================================
    // High-rated drivers get small discount (incentive)
    // Low-rated drivers incur penalty (quality control)
    const ratingCost =
        distanceCost * driverRatingFactor(driverRating);

    // ========================================
    // STEP 9: Apply Delivery Speed Impact
    // ========================================
    // Faster delivery requires priority handling
    // Instant delivery costs significantly more
    const etaCost =
        distanceCost * (ETA_FACTORS[etaType] || 0);

    // ========================================
    // STEP 10: Calculate Conditional Discount
    // ========================================
    // Apply discount only for orders below threshold
    // This helps support small orders
    const discount = orderValue < DISCOUNT_THRESHOLD ? DISCOUNT : 0;

    // ========================================
    // STEP 11: Calculate Final Total Cost
    // ========================================
    // Combine all cost components:
    // - Base fee (fixed)
    // - Distance cost (variable)
    // - Order value fee (conditional)
    // - Special vehicle cost (conditional)
    // - Weather impact (variable)
    // - Location impact (variable)
    // - Vehicle type impact (variable)
    // - Driver rating impact (variable)
    // - Speed impact (variable)
    // - Discount (conditional)
    const totalCost =
        BASE_FEE +              // Fixed starting fee
        distanceCost +          // Base distance charge
        orderValueFee +         // High order fee (if applicable)
        specialVehicleCost +    // Special handling (if applicable)
        weatherCost +           // Weather adjustment
        locationCost +          // Zone adjustment
        vehicleCost +           // Vehicle type adjustment
        ratingCost +            // Driver quality adjustment
        etaCost -               // Speed adjustment
        discount;               // Conditional discount

    // ========================================
    // STEP 12: Ensure Non-Negative Result
    // ========================================
    // Prevent negative costs (in case discount exceeds total)
    // Minimum delivery cost is always 0
    return Math.max(totalCost, 0);
}

/* ============================================================
   4️⃣ USAGE EXAMPLE (COMMENTED OUT)
   ============================================================ */
/*
// Example: Calculate delivery cost for a complex order
const exampleOrder = calculateDeliveryCost({
  distances: [3, 5, 2],        // Office→Seller1: 3km, Seller1→Seller2: 5km, Seller2→Customer: 2km
  orderValue: 180,             // Order total: 180 EGP (below 200 minimum)
  specialVehicle: true,        // Requires refrigerated truck for perishables
  weather: "heavy_rain",       // Delivery during heavy rain
  location: "outside_city",    // Delivering to rural area
  vehicleType: "car",          // Using standard car
  driverRating: 4.2,           // Driver has good rating
  etaType: "fast"              // Customer wants fast delivery
});

console.log("Delivery Cost:", exampleOrder, "EGP");

// Expected calculation breakdown:
// - Base Fee: 15 EGP
// - Distance Cost: 10km × 5 = 50 EGP
// - Low Order Fee: 20 EGP (order < 200)
// - Special Vehicle: 50 × 0.5 = 25 EGP
// - Weather: 50 × 0.3 = 15 EGP
// - Location: 50 × 0.3 = 15 EGP
// - Vehicle: 50 × 0.25 = 12.5 EGP
// - Rating: 50 × 0 = 0 EGP (rating 4.2 is neutral)
// - ETA: 50 × 0.2 = 10 EGP
// - Discount: -10 EGP
// Total: 15 + 50 + 20 + 25 + 15 + 15 + 12.5 + 0 + 10 - 10 = 152.5 EGP
*/