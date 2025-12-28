/**
 * @file pages/cardPackage/js/deliveryService.js
 * @description Service to orchestrate delivery cost calculation for the cart.
 * Combines logic from smartDeliveryRoute.js and deliveryCostCalculator.js
 */

/**
 * @typedef {Object} Location
 * @property {number} lat - Latitude
 * @property {number} lng - Longitude
 */

/**
 * @typedef {Object} DeliveryCalculationResult
 * @property {number} totalCost - Final calculated cost in currency units
 * @property {number} totalDistanceKm - Total distance of the route in Kilometers
 * @property {Array<Location>} optimalRoute - The optimized order of sellers to visit
 * @property {Object} costBreakdown - Input parameters used for cost calculation
 */

const DEG_TO_KM_APPROX = 111; // Approximate conversion: 1 degree latitude ~= 111km

/**
 * Calculates the full delivery cost for the current cart items.
 * 
 * @async
 * @function calculateCartDeliveryCost
 * @param {Location} officeLocation - Coordinates of the delivery dispatch office.
 * @param {Location} customerLocation - Coordinates of the customer/buyer.
 * @param {Object} [options] - Additional configuration options.
 * @param {string} [options.weather='normal'] - Weather condition ('normal', 'light_rain', 'heavy_rain').
 * @param {string} [options.locationZone='city'] - Delivery zone ('city', 'suburbs', 'outside_city').
 * @param {string} [options.etaType='normal'] - Delivery speed ('normal', 'fast', 'instant').
 * @returns {Promise<DeliveryCalculationResult>} Result object containing cost and route details.
 */
async function calculateCartDeliveryCost(officeLocation, customerLocation, options = {}) {
    try {
        // 1. Get Cart Data
        // Assumes getCart() is available globally from cardPackage.js
        if (typeof getCart !== 'function') {
            throw new Error("getCart function not found. Ensure cardPackage.js is loaded.");
        }
        
        const cart = getCart();

        if (!cart || cart.length === 0) {
            return {
                totalCost: 0,
                totalDistanceKm: 0,
                optimalRoute: [],
                costBreakdown: null
            };
        }

        // 2. Extract Unique Sellers and Calculate Order Value
        const sellerLocations = [];
        const processedSellerKeys = new Set();
        let totalOrderValue = 0;
        let requiresHeavyLoad = false;

        cart.forEach(item => {
            totalOrderValue += (item.price * item.quantity);

            // Check for heavy load attributes (checking multiple common property names)
            if (item.heavy_load || item.heavyLoad || item.isHeavy) {
                requiresHeavyLoad = true;
            }

            // Extract unique seller locations
            if (item.seller_key && !processedSellerKeys.has(item.seller_key)) {
                // Ensure coordinates exist and are valid numbers
                if (item.seller_lat && item.seller_lng) {
                    sellerLocations.push({
                        lat: parseFloat(item.seller_lat),
                        lng: parseFloat(item.seller_lng),
                        // Metadata for debugging/display
                        id: item.seller_key,
                        name: item.sellerName || 'Unknown Seller'
                    });
                    processedSellerKeys.add(item.seller_key);
                }
            }
        });

        // 3. Find Optimal Route (TSP)
        // Uses findShortestDeliveryRoute from smartDeliveryRoute.js
        if (typeof findShortestDeliveryRoute !== 'function') {
            throw new Error("findShortestDeliveryRoute not found. Ensure smartDeliveryRoute.js is loaded.");
        }

        const optimizationResult = findShortestDeliveryRoute(officeLocation, customerLocation, sellerLocations);
        const optimalRoute = optimizationResult.route; // Ordered list of seller locations

        // 4. Calculate Distance Segments in KM
        // Route path: Office -> Seller1 -> Seller2 ... -> Customer
        const segmentsInKm = [];

        if (optimalRoute.length > 0) {
            // Segment 1: Office to First Seller
            const distOfficeToFirst = calculateDistance(officeLocation, optimalRoute[0]);
            segmentsInKm.push(distOfficeToFirst * DEG_TO_KM_APPROX);

            // Intermediate Segments: Between Sellers
            for (let i = 0; i < optimalRoute.length - 1; i++) {
                const distBetweenSellers = calculateDistance(optimalRoute[i], optimalRoute[i + 1]);
                segmentsInKm.push(distBetweenSellers * DEG_TO_KM_APPROX);
            }

            // Final Segment: Last Seller to Customer
            const distLastToCustomer = calculateDistance(optimalRoute[optimalRoute.length - 1], customerLocation);
            segmentsInKm.push(distLastToCustomer * DEG_TO_KM_APPROX);
        } else {
            // Direct Route: Office to Customer (No valid sellers with coordinates)
            const distDirect = calculateDistance(officeLocation, customerLocation);
            segmentsInKm.push(distDirect * DEG_TO_KM_APPROX);
        }

        // 5. Prepare Cost Calculation Parameters
        // Determine vehicle type: use 'truck' if heavy items exist, otherwise use user preference or default to 'bike'
        let vehicleType = options.vehicleType || 'bike';
        if (requiresHeavyLoad) {
            vehicleType = 'truck';
        }

        const costParams = {
            distances: segmentsInKm,
            orderValue: totalOrderValue,
            specialVehicle: requiresHeavyLoad || options.specialVehicle || false,
            weather: options.weather || 'normal',
            location: options.locationZone || 'city',
            vehicleType: vehicleType,
            driverRating: options.driverRating || 5.0, // Default to 5-star driver if not specified
            etaType: options.etaType || 'normal'
        };

        // 6. Calculate Final Cost
        // Uses calculateDeliveryCost from deliveryCostCalculator.js
        if (typeof calculateDeliveryCost !== 'function') {
            throw new Error("calculateDeliveryCost not found. Ensure deliveryCostCalculator.js is loaded.");
        }

        const totalCost = calculateDeliveryCost(costParams);
        const totalDistanceKm = segmentsInKm.reduce((sum, dist) => sum + dist, 0);

        return {
            totalCost: parseFloat(totalCost.toFixed(2)),
            totalDistanceKm: parseFloat(totalDistanceKm.toFixed(2)),
            optimalRoute: optimalRoute,
            costBreakdown: costParams
        };

    } catch (error) {
        console.error("Error in calculateCartDeliveryCost:", error);
        // Return fallback/safe values on error
        return {
            totalCost: 0,
            totalDistanceKm: 0,
            optimalRoute: [],
            error: error.message
        };
    }
}
