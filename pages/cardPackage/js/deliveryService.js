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
        console.log("%c🚀 [DeliveryService] بدء عملية حساب تكاليف التوصيل...", "color: #8e44ad; font-weight: bold;");
        console.log("%c🔍 [Debug] محتويات السلة الحالية:", "color: #e67e22;", cart);

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

        cart.forEach((item, index) => {
            totalOrderValue += (item.price * item.quantity);

            // 🔍 Debug Item properties
            console.log(`%c🔎 [Inspection] فحص المنتج #${index + 1}: ${item.productName}`, "color: #3498db;");
            console.log(`%c   - seller_key: ${item.seller_key}`, "color: #3498db;");
            console.log(`%c   - seller_lat: ${item.seller_lat}`, "color: #3498db;");
            console.log(`%c   - seller_lng: ${item.seller_lng}`, "color: #3498db;");
            console.log(`%c   - heavyLoad: ${item.heavyLoad || item.heavy_load || 0} ${(item.heavyLoad || item.heavy_load) ? '🚛 (يحتاج شاحنة)' : '🏍️ (دراجة نارية)'}`, "color: #3498db; font-weight: bold;");

            // Check for heavy load attributes
            if (item.heavy_load || item.heavyLoad || item.isHeavy) {
                requiresHeavyLoad = true;
            }

            // Extract unique seller locations
            if (item.seller_key && !processedSellerKeys.has(item.seller_key)) {
                if (item.seller_lat && item.seller_lng) {
                    sellerLocations.push({
                        lat: parseFloat(item.seller_lat),
                        lng: parseFloat(item.seller_lng),
                        id: item.seller_key,
                        name: item.sellerName || 'Unknown Seller'
                    });
                    processedSellerKeys.add(item.seller_key);
                } else {
                    console.warn(`%c⚠️ [Warning] المنتج "${item.productName}" يفتقد لإحداثيات البائع!`, "color: #e67e22;");
                }
            }
        });

        console.log(`%c📦 [Sellers] تم تحديد البائعين الفريدين: ${sellerLocations.length}`, "color: #9b59b6;");
        sellerLocations.forEach((s, index) => {
            console.log(`%c   - بائع ${index + 1}: ${s.name} | الموقع: (${s.lat}, ${s.lng})`, "color: #9b59b6;");
        });
        console.log(`%c💰 [OrderValue] إجمالي قيمة المشتريات: ${totalOrderValue.toFixed(2)} ج.م`, "color: #9b59b6;");
        if (requiresHeavyLoad) console.log("%c⚠️ [HeavyLoad] تنبيه: تم اكتشاف حمولة ثقيلة، سيتم استخدام شاحنة.", "color: #e74c3c; font-weight: bold;");

        // 3. Find Optimal Route (TSP)
        // Uses findShortestDeliveryRoute from smartDeliveryRoute.js
        if (typeof findShortestDeliveryRoute !== 'function') {
            throw new Error("findShortestDeliveryRoute not found. Ensure smartDeliveryRoute.js is loaded.");
        }

        const optimizationResult = findShortestDeliveryRoute(officeLocation, customerLocation, sellerLocations);
        const optimalRoute = optimizationResult.route; // Ordered list of seller locations

        console.log("%c🛣️ [Optimization] تم العثور على المسار الأمثل بنجاح.", "color: #8e44ad; font-weight: bold;");
        console.log(`%c📍 [Route] ترتيب المحطات: ${optimalRoute.map(s => s.name).join(" ➔ ")}`, "color: #9b59b6;");

        // 4. Calculate Distance Segments in KM
        // Route path: Office -> Seller1 -> Seller2 ... -> Customer
        const segmentsInKm = [];
        console.log("%c🚩 [Segments] تفاصيل قطاعات المسار والمسافات البينية:", "color: #8e44ad; font-weight: bold;");

        if (optimalRoute.length > 0) {
            // Segment 1: Office to First Seller
            const distOfficeToFirst = calculateDistance(officeLocation, optimalRoute[0]);
            const km1 = distOfficeToFirst * DEG_TO_KM_APPROX;
            segmentsInKm.push(km1);
            console.log(`%c   1️⃣ من المكتب 🏢 (${officeLocation.lat}, ${officeLocation.lng}) \n      ⬅️ إلى بائع: ${optimalRoute[0].name} 👤 (${optimalRoute[0].lat}, ${optimalRoute[0].lng}) \n      📏 المسافة: ${km1.toFixed(2)} كم`, "color: #3498db;");

            // Intermediate Segments: Between Sellers
            for (let i = 0; i < optimalRoute.length - 1; i++) {
                const distBetweenSellers = calculateDistance(optimalRoute[i], optimalRoute[i + 1]);
                const kmMid = distBetweenSellers * DEG_TO_KM_APPROX;
                segmentsInKm.push(kmMid);
                console.log(`%c   🔄 من بائع: ${optimalRoute[i].name} 👤 (${optimalRoute[i].lat}, ${optimalRoute[i].lng}) \n      ⬅️ إلى بائع: ${optimalRoute[i + 1].name} 👤 (${optimalRoute[i + 1].lat}, ${optimalRoute[i + 1].lng}) \n      📏 المسافة: ${kmMid.toFixed(2)} كم`, "color: #3498db;");
            }

            // Final Segment: Last Seller to Customer
            const distLastToCustomer = calculateDistance(optimalRoute[optimalRoute.length - 1], customerLocation);
            const kmLast = distLastToCustomer * DEG_TO_KM_APPROX;
            segmentsInKm.push(kmLast);
            console.log(`%c   🏁 من بائع: ${optimalRoute[optimalRoute.length - 1].name} 👤 (${optimalRoute[optimalRoute.length - 1].lat}, ${optimalRoute[optimalRoute.length - 1].lng}) \n      ⬅️ إلى العميل 🏠 (${customerLocation.lat}, ${customerLocation.lng}) \n      📏 المسافة: ${kmLast.toFixed(2)} كم`, "color: #3498db;");
        } else {
            // Direct Route: Office to Customer (No valid sellers with coordinates)
            const distDirect = calculateDistance(officeLocation, customerLocation);
            const kmDirect = distDirect * DEG_TO_KM_APPROX;
            segmentsInKm.push(kmDirect);
            console.log(`%c   ⚡ مسار مباشر: من المكتب 🏢 (${officeLocation.lat}, ${officeLocation.lng}) \n      ⬅️ إلى العميل 🏠 (${customerLocation.lat}, ${customerLocation.lng}) \n      📏 المسافة: ${kmDirect.toFixed(2)} كم`, "color: #e67e22;");
        }

        const totalKm = segmentsInKm.reduce((sum, dist) => sum + dist, 0);
        console.log(`%c📏 [Distance] المسافة الكلية المحسوبة: ${totalKm.toFixed(2)} كم عبر ${segmentsInKm.length} قطاعات.`, "color: #9b59b6; font-weight: bold;");

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

        // 🧠 [Logic] إظهار قيم المعايير المستخدمة في المعادلات
        console.log("%c🧠 [Parameters] المعايير المستخدمة في حساب التكلفة:", "color: #8e44ad; font-weight: bold;");
        console.log(`%c   - حالة الطقس: ${costParams.weather}`, "color: #9b59b6;");
        console.log(`%c   - نوع المنطقة: ${costParams.location}`, "color: #9b59b6;");
        console.log(`%c   - نوع المركبة: ${costParams.vehicleType}`, "color: #9b59b6;");
        console.log(`%c   - سرعة الطلب (ETA): ${costParams.etaType}`, "color: #9b59b6;");
        console.log(`%c   - تقييم السائق: ${costParams.driverRating} ⭐`, "color: #9b59b6;");
        console.log(`%c   - مركبة خاصة: ${costParams.specialVehicle ? 'نعم' : 'لا'}`, "color: #9b59b6;");
        console.log(`%c   - قيمة الطلب: ${costParams.orderValue.toFixed(2)} ج.م`, "color: #9b59b6;");

        // 6. Calculate Final Cost
        // Uses calculateDeliveryCost from deliveryCostCalculator.js
        if (typeof calculateDeliveryCost !== 'function') {
            throw new Error("calculateDeliveryCost not found. Ensure deliveryCostCalculator.js is loaded.");
        }

        const totalCost = calculateDeliveryCost(costParams);
        const totalDistanceKm = segmentsInKm.reduce((sum, dist) => sum + dist, 0);

        console.log("%c✨ [FinalCost] اكتمال الحسابات بنجاح!", "color: #8e44ad; font-weight: bold;");
        console.log(`%c💵 [Total] التكلفة النهائية للتوصيل: ${totalCost.toFixed(2)} ج.م`, "color: #2ecc71; font-weight: bold; font-size: 1.1em;");

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
