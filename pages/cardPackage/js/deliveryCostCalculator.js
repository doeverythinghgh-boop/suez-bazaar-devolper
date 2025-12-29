/**
 * @file pages/cardPackage/js/deliveryCostCalculator.js
 * @description Delivery Cost Calculator Module
 * 
 * This module calculates delivery costs based on multiple factors.
 * It now accepts a configuration object to avoid hardcoded values.
 */

/**
 * Calculates the driver rating impact factor.
 * @function driverRatingFactor
 * @param {number} rating - Driver's average rating 0-5
 * @param {Object} config - Rating configuration object
 * @returns {number} Multiplier to apply to distance cost
 */
function driverRatingFactor(rating, config) {
    if (!config) return 0;
    if (rating >= config.excellent_threshold) return config.excellent_discount;
    if (rating >= config.good_threshold) return config.good_factor;
    return config.poor_factor;
}

/**
 * Calculates the total delivery cost based on multiple parameters and configuration.
 * 
 * @function calculateDeliveryCost
 * 
 * @param {Object} params - Delivery parameters object
 * @param {number[]} params.distances - Array of distance segments
 * @param {number} params.orderValue - Total order value
 * @param {boolean} params.specialVehicle - Whether special vehicle is required
 * @param {string} params.weather - Current weather condition
 * @param {string} params.location - Delivery zone
 * @param {string} params.vehicleType - Vehicle type
 * @param {number} params.driverRating - Driver rating
 * @param {string} params.etaType - Speed requirement
 * @param {Object} config - Delivery configuration object loaded from JSON
 * 
 * @returns {number} Total delivery cost
 */
function calculateDeliveryCost({
    distances,
    orderValue,
    specialVehicle,
    weather,
    location,
    vehicleType,
    driverRating,
    etaType
}, config) {

    // Helper to safely get config values with fallbacks
    const getFactor = (obj, key) => (obj && obj[key] !== undefined ? obj[key] : 0);
    const defaults = config.defaults || {};

    // ========================================
    // STEP 1: Calculate Total Distance
    // ========================================
    const totalDistance = distances.reduce((sum, d) => sum + d, 0);

    // ========================================
    // STEP 2: Calculate Base Distance Cost
    // ========================================
    const distanceCost = totalDistance * defaults.price_per_km;

    // ========================================
    // STEP 3: Apply High Order Value Fee
    // ========================================
    const orderValueFee =
        orderValue >= defaults.high_order_value_threshold ? defaults.high_order_fee : 0;

    // ========================================
    // STEP 4: Calculate Special Vehicle Cost
    // ========================================
    const specialVehicleCost =
        specialVehicle ? distanceCost * defaults.special_vehicle_factor : 0;

    // ========================================
    // STEP 5: Apply Weather Impact
    // ========================================
    const weatherCost =
        distanceCost * getFactor(config.weather_factors, weather);

    // ========================================
    // STEP 6: Apply Location Zone Impact
    // ========================================
    const locationCost =
        distanceCost * getFactor(config.location_factors, location);

    // ========================================
    // STEP 7: Apply Vehicle Type Impact
    // ========================================
    const vehicleCost =
        distanceCost * getFactor(config.vehicle_factors, vehicleType);

    // ========================================
    // STEP 8: Apply Driver Rating Impact
    // ========================================
    const ratingCost =
        distanceCost * driverRatingFactor(driverRating, config.driver_rating_config);

    // ========================================
    // STEP 9: Apply Delivery Speed Impact
    // ========================================
    const etaCost =
        distanceCost * getFactor(config.eta_factors, etaType);

    // ========================================
    // STEP 10: Calculate Conditional Discount
    // ========================================
    const discount = orderValue < defaults.discount_threshold ? defaults.discount_value : 0;

    // ========================================
    // STEP 11: Calculate Final Total Cost
    // ========================================
    const totalCost =
        defaults.base_fee +        // Fixed starting fee
        distanceCost +           // Base distance charge
        orderValueFee +          // High order fee
        specialVehicleCost +     // Special handling
        weatherCost +            // Weather adjustment
        locationCost +           // Zone adjustment
        vehicleCost +            // Vehicle type adjustment
        ratingCost +             // Driver quality adjustment
        etaCost -                // Speed adjustment
        discount;                // Conditional discount

    // ========================================
    // STEP 12: Ensure Non-Negative Result
    // ========================================
    return Math.max(totalCost, 0);
}