/**
 * @file pages/cardPackage/js/cartPackage-ui.js
 * @description UI rendering and display logic for cart package.
 * Handles cart display, item rendering, and summary updates.
 */

/**
 * @description Loads the cart items from local storage and renders them in the cart page.
 *   Updates the cart summary and handles empty cart state.
 * @async
 * @function cartPage_loadCart
 * @returns {Promise<void>}
 */
async function cartPage_loadCart() {
    try {
        const cartPage_cartItemsContainer = document.getElementById('cartPage_cartItemsContainer');
        const cartPage_emptyCart = document.getElementById('cartPage_emptyCart');
        const cartPage_cartSummary = document.getElementById('cartPage_cartSummary');

        // Load Global Config
        let config = {};
        let currency = window.langu('cart_currency');
        let placeholderImg = 'https://via.placeholder.com/120x120?text=No+Image';

        if (typeof loadDeliveryConfig === 'function') {
            try {
                config = await loadDeliveryConfig();
                if (config && config.defaults) {
                    // Use translation system first, fallback to config only if translation fails
                    currency = window.langu('cart_currency') || config.defaults.currency_symbol || currency;
                    placeholderImg = config.defaults.placeholder_image || placeholderImg;
                }
            } catch (e) { console.warn("Failed to load config in loadCart", e); }
        }

        // فحص دفاعي: إذا لم تكن العناصر موجودة، فهذا يعني أننا لسنا في صفحة السلة
        if (!cartPage_cartItemsContainer || !cartPage_emptyCart || !cartPage_cartSummary) {
            return;
        }

        const cartPage_cart = getCart();

        if (cartPage_cart.length === 0) {
            cartPage_cartItemsContainer.innerHTML = '';
            cartPage_emptyCart.style.display = 'block';
            cartPage_cartSummary.style.display = 'none';
            return;
        }

        cartPage_emptyCart.style.display = 'none';
        cartPage_cartSummary.style.display = 'block';

        let cartPage_cartItemsHTML = '';

        cartPage_cart.forEach(cartPage_item => {
            const cartPage_discount = cartPage_item.original_price && cartPage_item.original_price > cartPage_item.price
                ? Math.round(((cartPage_item.original_price - cartPage_item.price) / cartPage_item.original_price) * 100)
                : 0;

            const cartPage_savings = cartPage_item.original_price && cartPage_item.original_price > cartPage_item.price
                ? (cartPage_item.original_price - cartPage_item.price) * cartPage_item.quantity
                : 0;

            cartPage_cartItemsHTML += `
                <table class="cartPage_cart-item" id="cartPage_cartItem-${cartPage_item.product_key}" data-product-key="${cartPage_item.product_key}">
                    <tbody>
                        <tr>
                            <td style="width: 120px;" id="cartPage_cartItemImage-${cartPage_item.product_key}">
                                <div class="cartPage_cart-item-image">
                                    <img id="cartPage_cartItemImg-${cartPage_item.product_key}" src="${cartPage_item.image || placeholderImg}" 
                                         alt="${cartPage_item.productName}">
                                </div>
                            </td>
                            <td id="cartPage_cartItemInfo-${cartPage_item.product_key}">
                                <div class="cartPage_cart-item-info">
                                    <h3 class="cartPage_cart-item-title" id="cartPage_cartItemTitle-${cartPage_item.product_key}">${cartPage_item.productName}</h3>
                                    <div class="cartPage_cart-item-price" id="cartPage_cartItemPriceContainer-${cartPage_item.product_key}">
                                        <span class="cartPage_current-price" id="cartPage_currentPrice-${cartPage_item.product_key}">${cartPage_item.price.toFixed(2)} ${currency}</span>
                                        ${cartPage_item.original_price && cartPage_item.original_price > cartPage_item.price ?
                    `<span class="cartPage_original-price" id="cartPage_originalPrice-${cartPage_item.product_key}">${cartPage_item.original_price.toFixed(2)} ${currency}</span>` : ''}
                                        ${cartPage_discount > 0 ?
                    `<span class="cartPage_discount-badge" id="cartPage_discountBadge-${cartPage_item.product_key}">${window.langu('cart_discount_badge').replace('{n}', cartPage_discount)}</span>` : ''}
                                    </div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="2" id="cartPage_cartItemNoteContainer-${cartPage_item.product_key}" class="cartPage_note-cell">
                                <div class="cartPage_cart-item-note">
                                    <div class="cartPage_note-label" id="cartPage_noteLabel-${cartPage_item.product_key}">
                                        <i class="fas fa-sticky-note"></i>
                                        <span>${window.langu('cart_notes_label')}</span>
                                    </div>
                                    <div class="cartPage_note-text ${cartPage_item.note ? '' : 'empty'}" id="cartPage_noteText-${cartPage_item.product_key}">
                                        ${cartPage_item.note || window.langu('cart_no_notes')}
                                        <button class="cartPage_edit-note-btn" id="cartPage_editNoteBtn-${cartPage_item.product_key}" data-product-key="${cartPage_item.product_key}">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                    </div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td id="cartPage_quantityControls-${cartPage_item.product_key}">
                                <div class="cartPage_quantity-controls">
                                    <button class="cartPage_quantity-btn cartPage_minus" id="cartPage_decreaseQtyBtn-${cartPage_item.product_key}" data-product-key="${cartPage_item.product_key}">-</button>
                                    <input type="number" class="cartPage_quantity-input" id="cartPage_quantityInput-${cartPage_item.product_key}"
                                           value="${cartPage_item.quantity}" min="1" 
                                           data-product-key="${cartPage_item.product_key}">
                                    <button class="cartPage_quantity-btn cartPage_plus" id="cartPage_increaseQtyBtn-${cartPage_item.product_key}" data-product-key="${cartPage_item.product_key}">+</button>
                                </div>
                            </td>
                            <td id="cartPage_removeBtn-${cartPage_item.product_key}">
                                <button class="cartPage_remove-btn" data-product-key="${cartPage_item.product_key}">
                                    <i class="fas fa-trash"></i> ${window.langu('cart_delete_btn')}
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            `;
        });

        cartPage_cartItemsContainer.innerHTML = cartPage_cartItemsHTML;
        await cartPage_updateCartSummary();
    } catch (error) {
        console.error('حدث خطأ أثناء تحميل السلة:', error);
    }
}

/**
 * @description Updates the cart summary section with the total item count, subtotal, savings, and final total.
 * Now calculates Smart Delivery cost asynchronously.
 * @async
 * @function cartPage_updateCartSummary
 * @returns {Promise<void>}
 */
async function cartPage_updateCartSummary() {
    try {
        const cartPage_itemCount = getCartItemCount();
        const cartPage_subtotal = getCartTotalPrice();
        const cartPage_savings = getCartTotalSavings();

        // 1. Load Config & Currency FIRST
        let currency = window.langu('cart_currency');
        let officeCoords = { lat: 29.968897130919654, lng: 32.53395080566407 }; // Fallback

        if (typeof loadDeliveryConfig === 'function') {
            try {
                const config = await loadDeliveryConfig();
                if (config && config.defaults) {
                    // Use translation system first, fallback to config only if translation fails
                    currency = window.langu('cart_currency') || config.defaults.currency_symbol || currency;
                    if (config.defaults.office_location) {
                        officeCoords = config.defaults.office_location;
                        console.log("%c🏢 [Config] تم تحميل موقع المكتب من الإعدادات.", "color: #27ae60;");
                    }
                }
            } catch (e) {
                console.warn("Could not load delivery config, using fallbacks.", e);
            }
        }

        // Update basic values immediately
        document.getElementById('cartPage_itemCount').textContent = cartPage_itemCount;
        document.getElementById('cartPage_subtotal').textContent = cartPage_subtotal.toFixed(2) + ' ' + currency;
        document.getElementById('cartPage_savings').textContent = cartPage_savings.toFixed(2) + ' ' + currency;

        // 🚛 Fixed Delivery Fee Logic
        const cart = getCart();
        const needsSystemDelivery = cart.some(item => parseInt(item.sellerIsDelevred || item.isDelevred) !== 1);

        const FIXED_DELIVERY_FEE = needsSystemDelivery ? 40 : 0;
        const fixedDeliveryRow = document.getElementById('cartPage_summaryRowFixedDelivery');
        const fixedDeliveryElement = document.getElementById('cartPage_fixedDeliveryFee');

        if (fixedDeliveryRow) {
            fixedDeliveryRow.style.display = needsSystemDelivery ? 'flex' : 'none';
        }
        if (fixedDeliveryElement) {
            fixedDeliveryElement.textContent = FIXED_DELIVERY_FEE.toFixed(2) + ' ' + currency;
        }

        // 🧠 Calculate Smart Delivery Cost
        const smartDeliveryRow = document.getElementById('cartPage_summaryRowSmartDelivery');
        const smartDeliveryElement = document.getElementById('cartPage_smartDeliveryFee');

        // Check for Admin
        const user = window.userSession;
        const isAdmin = user && (typeof ADMIN_IDS !== "undefined" && ADMIN_IDS.includes(user.user_key));

        if (smartDeliveryRow) {
            // Only show smart delivery to admin AND if there are items needing delivery
            smartDeliveryRow.style.display = (isAdmin && needsSystemDelivery) ? 'flex' : 'none';
        }

        // (Office coords already loaded above)

        // Get Customer Location from Session or use Default
        let customerCoords = { lat: 30.0500, lng: 31.2400 }; // Default fallback
        console.log("%c🔍 [Debug] فحص جلسة المستخدم للموقع:", "color: #e67e22; font-weight: bold;", window.userSession);

        if (window.userSession) {
            // Priority 1: Check if lat/lng exist as direct properties
            if (window.userSession.lat && window.userSession.lng) {
                customerCoords = {
                    lat: parseFloat(window.userSession.lat),
                    lng: parseFloat(window.userSession.lng)
                };
                console.log("%c✅ [Session] تم العثور على lat/lng مباشرة.", "color: #27ae60;");
            }
            // Priority 2: Check standard 'location' field (handle Location or location)
            const locField = window.userSession.location || window.userSession.Location;
            if (locField && String(locField).includes(',')) {
                const [lat, lng] = String(locField).split(',');
                customerCoords = {
                    lat: parseFloat(lat),
                    lng: parseFloat(lng)
                };
                console.log("%c✅ [Session] تم استخراج الموقع من حقل الموقع (Location/location).", "color: #27ae60;");
            } else {
                console.warn("%c⚠️ [Session] لم يتم العثور على أي بيانات موقع في الجلسة!", "color: #e67e22;");
                console.log("%c💡 [Tip] يرجى تحديث موقعك من صفحة 'الملف الشخصي' لضمان دقة حسابات التوصيل.", "color: #27ae60; font-weight: bold;");
                console.log("%cℹ️ [Session Debug]: فحص كافة المفاتيح المحتملة للموقع:", "color: #3498db;", {
                    "userSession.location": window.userSession.location,
                    "userSession.lat": window.userSession.lat,
                    "userSession.lng": window.userSession.lng,
                    "userSession.Address": window.userSession.Address,
                    "Raw Keys": Object.keys(window.userSession)
                });
            }
        }

        try {
            // Check if calculateCartDeliveryCost is available
            if (typeof calculateCartDeliveryCost === 'function') {
                const deliveryResult = await calculateCartDeliveryCost(officeCoords, customerCoords);

                if (deliveryResult && !deliveryResult.error) {
                    const smartFee = deliveryResult.totalCost;
                    smartDeliveryElement.textContent = smartFee.toFixed(2) + ' ' + window.langu('cart_currency');

                    // Store delivery details globally for the details button
                    window.lastDeliveryCalculation = deliveryResult;

                    // Show details button
                    const detailsBtn = document.getElementById('cartPage_deliveryDetailsBtn');
                    if (detailsBtn) {
                        detailsBtn.style.display = 'inline-block';
                        detailsBtn.onclick = () => showDeliveryDetails(deliveryResult);
                    }

                    // Final Total = Subtotal + Fixed Fee (35 EGP) for all users
                    const finalTotal = cartPage_subtotal + FIXED_DELIVERY_FEE;
                    document.getElementById('cartPage_total').textContent = finalTotal.toFixed(2) + ' ' + currency;
                    return;
                }
            }
        } catch (calcError) {
            console.error('Error calculating smart delivery:', calcError);
        }

        // Fallback or Non-Admin state: Final Total is always Subtotal + Fixed Fee
        if (smartDeliveryElement) smartDeliveryElement.textContent = window.langu('cart_not_available');
        const finalTotalFallback = cartPage_subtotal + FIXED_DELIVERY_FEE;
        document.getElementById('cartPage_total').textContent = finalTotalFallback.toFixed(2) + ' ' + currency;

    } catch (error) {
        console.error('حدث خطأ أثناء تحديث ملخص السلة:', error);
    }
}

/**
 * @description Displays detailed breakdown of delivery cost calculation in a SweetAlert2 modal.
 * @function showDeliveryDetails
 * @param {Object} deliveryResult - Result object from calculateCartDeliveryCost
 * @returns {void}
 */
function showDeliveryDetails(deliveryResult) {
    if (!deliveryResult || !deliveryResult.costBreakdown) {
        Swal.fire({
            icon: 'error',
            title: 'خطأ',
            text: 'لا توجد تفاصيل متاحة للعرض.',
            confirmButtonText: 'موافق'
        });
        return;
    }

    const breakdown = deliveryResult.costBreakdown;
    const totalDistance = deliveryResult.totalDistanceKm;
    const totalCost = deliveryResult.totalCost;
    const optimalRoute = deliveryResult.optimalRoute || [];

    // 🆕 Use configuration from result or fallback to default object
    const fullConfig = deliveryResult.deliveryConfig || {};
    // Extract defaults object where values live
    const defaults = fullConfig.defaults || {
        base_fee: 15,
        price_per_km: 5,
        high_order_value_threshold: 5000,
        high_order_fee: 20,
        discount_threshold: 200,
        discount_value: 5,
        special_vehicle_factor: 0.5,
        vehicle_factors: { bike: 0, car: 0.25, truck: 0.6 },
        weather_factors: { normal: 0, light_rain: 0.1, heavy_rain: 0.3 },
        location_factors: { city: 0, suburbs: 0.15, outside_city: 0.3 },
        eta_factors: { normal: 0, fast: 0.2, instant: 0.4 },
        driver_rating_config: { excellent_threshold: 4.5, excellent_discount: -0.05, good_threshold: 4.0, good_factor: 0, poor_factor: 0.1 }
    };

    // Calculate each component using DEFAULTS
    const distanceCost = totalDistance * defaults.price_per_km;
    const orderValueFee = breakdown.orderValue >= defaults.high_order_value_threshold ? defaults.high_order_fee : 0;
    const specialVehicleCost = breakdown.specialVehicle ? distanceCost * defaults.special_vehicle_factor : 0;

    const weatherFactor = (defaults.weather_factors && defaults.weather_factors[breakdown.weather]) || 0;
    const weatherCost = distanceCost * weatherFactor;

    const locationFactor = (defaults.location_factors && defaults.location_factors[breakdown.location]) || 0;
    const locationCost = distanceCost * locationFactor;

    const vehicleFactor = (defaults.vehicle_factors && defaults.vehicle_factors[breakdown.vehicleType]) || 0;
    const vehicleCost = distanceCost * vehicleFactor;

    // Driver Rating Logic
    let driverRatingFactor = 0;
    if (defaults.driver_rating_config) {
        if (breakdown.driverRating >= defaults.driver_rating_config.excellent_threshold) driverRatingFactor = defaults.driver_rating_config.excellent_discount;
        else if (breakdown.driverRating >= defaults.driver_rating_config.good_threshold) driverRatingFactor = defaults.driver_rating_config.good_factor;
        else driverRatingFactor = defaults.driver_rating_config.poor_factor;
    }
    const ratingCost = distanceCost * driverRatingFactor;

    const etaFactor = (defaults.eta_factors && defaults.eta_factors[breakdown.etaType]) || 0;
    const etaCost = distanceCost * etaFactor;

    const discount = breakdown.orderValue < defaults.discount_threshold ? defaults.discount_value : 0;

    // Use translation system first, fallback to config only if translation fails
    const currency = window.langu('cart_currency') || defaults.currency_symbol || 'EGP';

    // ... HTML construction ... (Updated to use currency variable)
    // Note: Since showDeliveryDetails is a massive template literal block, best to replace 'ج.م' with '${currency}'

    // Build distance breakdown by segments
    let distanceBreakdown = '';
    // ... (unchanged distance breakdown logic) ...

    if (breakdown.distances && breakdown.distances.length > 0) {
        const segments = breakdown.distances;
        let segmentHTML = '<div style="padding: 8px 0;">';

        if (segments.length === 1) {
            // Direct route: Office to Customer
            segmentHTML += `
                <div class="delivery-row" style="margin-bottom: 8px;">
                    <span style="flex: 1;">${window.langu('cart_delivery_segment_direct')}</span>
                    <span style="font-weight: bold; color: var(--primary-color);">${segments[0].toFixed(2)} كم</span>
                </div>
            `;
        } else {
            // Multi-stop route
            segmentHTML += `
                <div class="delivery-row" style="margin-bottom: 8px;">
                    <span style="flex: 1;">${window.langu('cart_delivery_segment_first')}</span>
                    <span style="font-weight: bold; color: var(--primary-color);">${segments[0].toFixed(2)} كم</span>
                </div>
            `;

            // Between sellers
            for (let i = 1; i < segments.length - 1; i++) {
                segmentHTML += `
                    <div class="delivery-row" style="margin-bottom: 8px;">
                        <span style="flex: 1;">${window.langu('cart_delivery_segment_between').replace('{i}', i).replace('{j}', i + 1)}</span>
                        <span style="font-weight: bold; color: var(--primary-color);">${segments[i].toFixed(2)} كم</span>
                    </div>
                `;
            }

            // Last seller to customer
            segmentHTML += `
                <div class="delivery-row" style="margin-bottom: 8px;">
                    <span style="flex: 1;">${window.langu('cart_delivery_segment_last')}</span>
                    <span style="font-weight: bold; color: var(--primary-color);">${segments[segments.length - 1].toFixed(2)} كم</span>
                </div>
            `;
        }

        segmentHTML += '</div>';
        distanceBreakdown = segmentHTML;
    }

    // Build detailed HTML content
    let detailsHTML = `
        <div class="container-fluid">
            <h3 class="delivery-details-header">${window.langu('cart_delivery_details_title')}</h3>
            
            <div style="max-height: 50vh; overflow-y: auto; padding-right: 5px;">
                <div class="delivery-section delivery-section-stages">
                    <strong style="display: block; margin-bottom: 10px;">${window.langu('cart_delivery_stages')}</strong>
                    ${distanceBreakdown}
                    <hr style="margin: 10px 0; border: none; border-top: 1px dashed #ccc;">
                    <div class="delivery-row" style="margin-top: 10px;">
                        <span style="flex: 1; font-weight: bold;">${window.langu('cart_delivery_total_dist')}</span>
                        <span style="font-weight: bold; color: #2196F3; font-size: 1.1rem;">${totalDistance.toFixed(2)} كم</span>
                    </div>
                    <div class="delivery-row-detail">
                        <span class="delivery-label">${window.langu('cart_delivery_dist_cost').replace('{dist}', totalDistance.toFixed(2)).replace('{price}', defaults.price_per_km)}</span>
                        <span class="delivery-cost-minus">+${distanceCost.toFixed(2)} ${currency}</span>
                    </div>
                </div>

                <div class="delivery-section delivery-section-vehicle">
                    <div class="delivery-row">
                        <strong>${window.langu('cart_delivery_vehicle_label')}</strong>
                        <span>${breakdown.vehicleType === 'truck' ? window.langu('cart_delivery_vehicle_truck') :
            breakdown.vehicleType === 'car' ? window.langu('cart_delivery_vehicle_car') : window.langu('cart_delivery_vehicle_bike')}</span>
                    </div>
                    ${vehicleCost > 0 ? `
                    <div class="delivery-row-detail">
                        <span class="delivery-label">تكلفة إضافية (${(vehicleFactor * 100).toFixed(0)}%):</span>
                        <span class="delivery-cost-plus">+${vehicleCost.toFixed(2)} ${currency}</span>
                    </div>
                    ` : ''}
                </div>

                <div class="delivery-section delivery-section-value">
                    <div class="delivery-row">
                        <strong>${window.langu('cart_delivery_value_label')}</strong>
                        <span>${breakdown.orderValue.toFixed(2)} ${currency}</span>
                    </div>
                    ${orderValueFee > 0 ? `
                    <div class="delivery-row-detail">
                        <span class="delivery-label">رسوم طلب كبير (أكبر من أو يساوي ${defaults.high_order_value_threshold}):</span>
                        <span class="delivery-cost-plus">+${orderValueFee.toFixed(2)} ${currency}</span>
                    </div>
                    ` : `
                    <div class="delivery-row-detail" style="color: #4caf50;">
                        ✓ لا توجد رسوم إضافية (الطلب أقل من ${defaults.high_order_value_threshold} ${currency})
                    </div>
                    `}
                </div>

                <div class="delivery-section delivery-section-weather">
                    <div class="delivery-row">
                        <strong>${window.langu('cart_delivery_weather_label')}</strong>
                        <span>${breakdown.weather === 'heavy_rain' ? window.langu('cart_delivery_weather_heavy') :
            breakdown.weather === 'light_rain' ? window.langu('cart_delivery_weather_light') : window.langu('cart_delivery_weather_normal')}</span>
                    </div>
                    ${weatherCost > 0 ? `
                    <div class="delivery-row-detail">
                        <span class="delivery-label">تكلفة إضافية (${(weatherFactor * 100).toFixed(0)}%):</span>
                        <span class="delivery-cost-plus">+${weatherCost.toFixed(2)} ${currency}</span>
                    </div>
                    ` : ''}
                </div>

                <div class="delivery-section delivery-section-location">
                    <div class="delivery-row">
                        <strong>${window.langu('cart_delivery_location_label')}</strong>
                        <span>${breakdown.location === 'outside_city' ? window.langu('cart_delivery_location_outside') :
            breakdown.location === 'suburbs' ? window.langu('cart_delivery_location_suburbs') : window.langu('cart_delivery_location_inside')}</span>
                    </div>
                    ${locationCost > 0 ? `
                    <div class="delivery-row-detail">
                        <span class="delivery-label">تكلفة إضافية (${(locationFactor * 100).toFixed(0)}%):</span>
                        <span class="delivery-cost-plus">+${locationCost.toFixed(2)} ${currency}</span>
                    </div>
                    ` : ''}
                </div>

                <div class="delivery-section delivery-section-eta">
                    <div class="delivery-row">
                        <strong>${window.langu('cart_delivery_speed_label')}</strong>
                        <span>${breakdown.etaType === 'instant' ? window.langu('cart_delivery_speed_instant') :
            breakdown.etaType === 'fast' ? window.langu('cart_delivery_speed_fast') : window.langu('cart_delivery_speed_normal')}</span>
                    </div>
                    ${etaCost > 0 ? `
                    <div class="delivery-row-detail">
                        <span class="delivery-label">تكلفة إضافية (${(etaFactor * 100).toFixed(0)}%):</span>
                        <span class="delivery-cost-plus">+${etaCost.toFixed(2)} ${currency}</span>
                    </div>
                    ` : ''}
                </div>

                ${breakdown.specialVehicle ? `
                <div class="delivery-section delivery-section-special">
                    <div class="delivery-row">
                        <strong>${window.langu('cart_delivery_special_label')}</strong>
                        <span>${window.langu('cart_delivery_special_yes')}</span>
                    </div>
                    <div class="delivery-row-detail">
                        <span class="delivery-label">تكلفة إضافية (${(defaults.special_vehicle_factor * 100).toFixed(0)}%):</span>
                        <span class="delivery-cost-plus">+${specialVehicleCost.toFixed(2)} ${currency}</span>
                    </div>
                </div>
                ` : ''}

                <div class="delivery-section delivery-section-rating">
                    <div class="delivery-row">
                        <strong>${window.langu('cart_delivery_rating_label')}</strong>
                        <span>${window.langu('cart_delivery_stars').replace('{n}', breakdown.driverRating.toFixed(1))}</span>
                    </div>
                    ${ratingCost !== 0 ? `
                    <div class="delivery-row-detail">
                        <span class="delivery-label">${ratingCost > 0 ? 'رسوم إضافية' : 'خصم'} (${(driverRatingFactor * 100).toFixed(0)}%):</span>
                        <span style="font-weight: bold; color: ${ratingCost > 0 ? '#f44336' : '#4caf50'};">${ratingCost > 0 ? '+' : ''}${ratingCost.toFixed(2)} ${currency}</span>
                    </div>
                    ` : ''}
                </div>

                <div class="delivery-section delivery-section-base">
                    <div class="delivery-row">
                        <strong style="color: #f57c00;">${window.langu('cart_delivery_base_fee')}</strong>
                        <span style="font-weight: bold;">+${defaults.base_fee.toFixed(2)} ${currency}</span>
                    </div>
                </div>
                    ${discount > 0 ? `
                    <div class="delivery-row" style="padding-top: 8px; border-top: 1px solid #fff59d;">
                        <strong style="color: #388e3c;">${window.langu('cart_delivery_discount_label')} (للطلبات < ${defaults.discount_threshold} ${currency}):</strong>
                        <span class="delivery-cost-minus">-${discount.toFixed(2)} ${currency}</span>
                    </div>
                    ` : `
                    <div style="padding-top: 8px; border-top: 1px solid #fff59d; color: #666; font-size: 0.9rem;">
                        ℹ️ لا يوجد خصم (الطلب ≥ ${defaults.discount_threshold} ${currency})
                    </div>
                    `}
                </div>

                <hr style="margin: 20px 0; border: none; border-top: 2px solid #e0e0e0;">

                <div class="delivery-section-total">
                    <strong>${window.langu('cart_delivery_final_total').replace('{total}', totalCost.toFixed(2)).replace('{currency}', currency)}</strong>
                </div>
            </div>
        </div>
    `;

    Swal.fire({
        html: detailsHTML,
        width: '600px',
        confirmButtonText: window.langu('alert_confirm_btn'),
        confirmButtonColor: 'var(--primary-color)',
        showCloseButton: true,
        customClass: {
            popup: 'delivery-details-popup'
        }
    });
}
