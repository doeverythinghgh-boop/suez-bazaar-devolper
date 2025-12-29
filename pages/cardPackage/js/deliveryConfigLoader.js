/**
 * @file pages/cardPackage/js/deliveryConfigLoader.js
 * @description Module to load delivery configuration from JSON file.
 * Caches the result to avoid redundant network requests.
 */

let cachedDeliveryConfig = null;

/**
 * Loads the delivery configuration from the shared JSON file.
 * @async
 * @function loadDeliveryConfig
 * @returns {Promise<Object>} The delivery configuration object.
 */
async function loadDeliveryConfig() {
    if (cachedDeliveryConfig) {
        return cachedDeliveryConfig;
    }

    try {
        const response = await fetch('pages/cardPackage/data/delivery_config.json');
        if (!response.ok) {
            throw new Error(`Failed to load delivery config: ${response.status} ${response.statusText}`);
        }
        cachedDeliveryConfig = await response.json();
        console.log("%c⚙️ [Config] Delivery configuration loaded successfully.", "color: #2ecc71;");
        return cachedDeliveryConfig;
    } catch (error) {
        console.error("Error loading delivery config:", error);
        // Fallback to defaults if loading fails (safety net)
        console.warn("%c⚠️ [Config] Using fallback default values.", "color: #e67e22;");
        return {
            "base_fee": 15,
            "price_per_km": 5,
            "high_order_value_threshold": 5000,
            "high_order_fee": 20,
            "discount_threshold": 200,
            "discount_value": 5,
            "special_vehicle_factor": 0.5,
            "weather_factors": { "normal": 0, "light_rain": 0.1, "heavy_rain": 0.3 },
            "location_factors": { "city": 0, "suburbs": 0.15, "outside_city": 0.3 },
            "vehicle_factors": { "bike": 0, "car": 0.25, "truck": 0.6 },
            "eta_factors": { "normal": 0, "fast": 0.2, "instant": 0.4 },
            "driver_rating_config": {
                "excellent_threshold": 4.5,
                "excellent_discount": -0.05,
                "good_threshold": 4.0,
                "good_factor": 0,
                "poor_factor": 0.1
            }
        };
    }
}
