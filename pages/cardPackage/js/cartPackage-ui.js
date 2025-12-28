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
                                    <img id="cartPage_cartItemImg-${cartPage_item.product_key}" src="${cartPage_item.image || 'https://via.placeholder.com/120x120?text=No+Image'}" 
                                         alt="${cartPage_item.productName}">
                                </div>
                            </td>
                            <td id="cartPage_cartItemInfo-${cartPage_item.product_key}">
                                <div class="cartPage_cart-item-info">
                                    <h3 class="cartPage_cart-item-title" id="cartPage_cartItemTitle-${cartPage_item.product_key}">${cartPage_item.productName}</h3>
                                    <div class="cartPage_cart-item-price" id="cartPage_cartItemPriceContainer-${cartPage_item.product_key}">
                                        <span class="cartPage_current-price" id="cartPage_currentPrice-${cartPage_item.product_key}">${cartPage_item.price.toFixed(2)} ج.م</span>
                                        ${cartPage_item.original_price && cartPage_item.original_price > cartPage_item.price ?
                    `<span class="cartPage_original-price" id="cartPage_originalPrice-${cartPage_item.product_key}">${cartPage_item.original_price.toFixed(2)} ج.م</span>` : ''}
                                        ${cartPage_discount > 0 ?
                    `<span class="cartPage_discount-badge" id="cartPage_discountBadge-${cartPage_item.product_key}">توفير ${cartPage_discount}%</span>` : ''}
                                    </div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="2" id="cartPage_cartItemNoteContainer-${cartPage_item.product_key}">
                                <div class="cartPage_cart-item-note">
                                    <div class="cartPage_note-label" id="cartPage_noteLabel-${cartPage_item.product_key}">
                                        <i class="fas fa-sticky-note"></i>
                                        <span>ملاحظاتك:</span>
                                    </div>
                                    <div class="cartPage_note-text ${cartPage_item.note ? '' : 'empty'}" id="cartPage_noteText-${cartPage_item.product_key}">
                                        ${cartPage_item.note || 'لا توجد ملاحظات'}
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
                                    <i class="fas fa-trash"></i> حذف
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

        // Update basic values immediately
        document.getElementById('cartPage_itemCount').textContent = cartPage_itemCount;
        document.getElementById('cartPage_subtotal').textContent = cartPage_subtotal.toFixed(2) + ' ج.م';
        document.getElementById('cartPage_savings').textContent = cartPage_savings.toFixed(2) + ' ج.م';

        // 🧠 Calculate Smart Delivery Cost
        const smartDeliveryElement = document.getElementById('cartPage_smartDeliveryFee');

        // Default Office Coordinates (e.g., Cairo Center) if not defined
        /*lat
: 
29.975149513576273
lng 
: 
32.53395080566407*/
        const officeCoords = { lat: 29.968897130919654, lng: 32.53395080566407 };

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
                    smartDeliveryElement.textContent = smartFee.toFixed(2) + ' ج.م';

                    // Store delivery details globally for the details button
                    window.lastDeliveryCalculation = deliveryResult;

                    // Show details button
                    const detailsBtn = document.getElementById('cartPage_deliveryDetailsBtn');
                    if (detailsBtn) {
                        detailsBtn.style.display = 'inline-block';
                        detailsBtn.onclick = () => showDeliveryDetails(deliveryResult);
                    }

                    // Final Total uses Smart Fee + Subtotal
                    const finalTotal = cartPage_subtotal + smartFee;
                    document.getElementById('cartPage_total').textContent = finalTotal.toFixed(2) + ' ج.م';
                    return;
                }
            }
        } catch (calcError) {
            console.error('Error calculating smart delivery:', calcError);
        }

        // Fallback if smart calculation fails or not available
        smartDeliveryElement.textContent = 'غير متاح';
        document.getElementById('cartPage_total').textContent = cartPage_subtotal.toFixed(2) + ' ج.م';

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

    // Constants from deliveryCostCalculator.js
    const BASE_FEE = 15;
    const PRICE_PER_KM = 5;
    const HIGH_ORDER_VALUE_THRESHOLD = 5000;
    const HIGH_ORDER_FEE = 20;
    const DISCOUNT = 10;
    const SPECIAL_VEHICLE_FACTOR = 0.5;
    const VEHICLE_FACTORS = { bike: 0, car: 0.25, truck: 0.6 };
    const WEATHER_FACTORS = { normal: 0, light_rain: 0.1, heavy_rain: 0.3 };
    const LOCATION_FACTORS = { city: 0, suburbs: 0.15, outside_city: 0.3 };
    const ETA_FACTORS = { normal: 0, fast: 0.2, instant: 0.4 };

    // Calculate each component
    const distanceCost = totalDistance * PRICE_PER_KM;
    const orderValueFee = breakdown.orderValue >= HIGH_ORDER_VALUE_THRESHOLD ? HIGH_ORDER_FEE : 0;
    const specialVehicleCost = breakdown.specialVehicle ? distanceCost * SPECIAL_VEHICLE_FACTOR : 0;
    const weatherCost = distanceCost * (WEATHER_FACTORS[breakdown.weather] || 0);
    const locationCost = distanceCost * (LOCATION_FACTORS[breakdown.location] || 0);
    const vehicleCost = distanceCost * (VEHICLE_FACTORS[breakdown.vehicleType] || 0);
    const driverRatingFactor = breakdown.driverRating >= 4.5 ? -0.05 : (breakdown.driverRating >= 4 ? 0 : 0.1);
    const ratingCost = distanceCost * driverRatingFactor;
    const etaCost = distanceCost * (ETA_FACTORS[breakdown.etaType] || 0);

    // Build distance breakdown by segments
    let distanceBreakdown = '';
    if (breakdown.distances && breakdown.distances.length > 0) {
        const segments = breakdown.distances;
        let segmentHTML = '<div style="padding: 8px 0;">';

        if (segments.length === 1) {
            // Direct route: Office to Customer
            segmentHTML += `
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                    <span style="flex: 1;">🏢 المكتب ← 🏠 العميل</span>
                    <span style="font-weight: bold; color: var(--primary-color);">${segments[0].toFixed(2)} كم</span>
                </div>
            `;
        } else {
            // Multi-stop route
            segmentHTML += `
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                    <span style="flex: 1;">🏢 المكتب ← 📦 البائع الأول</span>
                    <span style="font-weight: bold; color: var(--primary-color);">${segments[0].toFixed(2)} كم</span>
                </div>
            `;

            // Between sellers
            for (let i = 1; i < segments.length - 1; i++) {
                segmentHTML += `
                    <div style="display: flex; align-items: center; margin-bottom: 8px;">
                        <span style="flex: 1;">📦 البائع ${i} ← 📦 البائع ${i + 1}</span>
                        <span style="font-weight: bold; color: var(--primary-color);">${segments[i].toFixed(2)} كم</span>
                    </div>
                `;
            }

            // Last seller to customer
            segmentHTML += `
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                    <span style="flex: 1;">📦 البائع الأخير ← 🏠 العميل</span>
                    <span style="font-weight: bold; color: var(--primary-color);">${segments[segments.length - 1].toFixed(2)} كم</span>
                </div>
            `;
        }

        segmentHTML += '</div>';
        distanceBreakdown = segmentHTML;
    }

    // Build detailed HTML content
    let detailsHTML = `
        <div style="text-align: right; direction: rtl; font-size: 0.95rem;">
            <h3 style="color: var(--primary-color); margin-bottom: 15px;">📊 تفاصيل حساب خدمة التوصيل</h3>
            
            <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
                <strong style="display: block; margin-bottom: 10px;">📏 مراحل التوصيل:</strong>
                ${distanceBreakdown}
                <hr style="margin: 10px 0; border: none; border-top: 1px dashed #ccc;">
                <div style="display: flex; align-items: center; margin-top: 10px;">
                    <span style="flex: 1; font-weight: bold;">المسافة الكلية:</span>
                    <span style="font-weight: bold; color: #2196F3; font-size: 1.1rem;">${totalDistance.toFixed(2)} كم</span>
                </div>
                <div style="display: flex; align-items: center; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e0e0e0;">
                    <span style="flex: 1; color: #666; font-size: 0.9rem;">تكلفة المسافة (${totalDistance.toFixed(2)} × ${PRICE_PER_KM}):</span>
                    <span style="font-weight: bold; color: #4caf50;">+${distanceCost.toFixed(2)} ج.م</span>
                </div>
            </div>

            <div style="background: #e3f2fd; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong>🚗 نوع المركبة:</strong>
                    <span>${breakdown.vehicleType === 'truck' ? '🚛 شاحنة' :
            breakdown.vehicleType === 'car' ? '🚗 سيارة' : '🏍️ دراجة نارية'}</span>
                </div>
                ${vehicleCost > 0 ? `
                <div style="display: flex; align-items: center; margin-top: 8px; padding-top: 8px; border-top: 1px solid #bbdefb;">
                    <span style="flex: 1; color: #666; font-size: 0.9rem;">تكلفة إضافية (${(VEHICLE_FACTORS[breakdown.vehicleType] * 100).toFixed(0)}%):</span>
                    <span style="font-weight: bold; color: #f44336;">+${vehicleCost.toFixed(2)} ج.م</span>
                </div>
                ` : ''}
            </div>

            <div style="background: #fff3e0; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong>💰 قيمة الطلب:</strong>
                    <span>${breakdown.orderValue.toFixed(2)} ج.م</span>
                </div>
                ${orderValueFee > 0 ? `
                <div style="display: flex; align-items: center; margin-top: 8px; padding-top: 8px; border-top: 1px solid #ffe0b2;">
                    <span style="flex: 1; color: #666; font-size: 0.9rem;">رسوم طلب كبير (أكبر من أو يساوي ${HIGH_ORDER_VALUE_THRESHOLD}):</span>
                    <span style="font-weight: bold; color: #f44336;">+${orderValueFee.toFixed(2)} ج.م</span>
                </div>
                ` : `
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ffe0b2; color: #4caf50; font-size: 0.9rem;">
                    ✓ لا توجد رسوم إضافية (الطلب أقل من ${HIGH_ORDER_VALUE_THRESHOLD} ج.م)
                </div>
                `}
            </div>

            <div style="background: #f3e5f5; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong>🌦️ حالة الطقس:</strong>
                    <span>${breakdown.weather === 'heavy_rain' ? '🌧️ أمطار غزيرة' :
            breakdown.weather === 'light_rain' ? '🌦️ أمطار خفيفة' : '☀️ طقس عادي'}</span>
                </div>
                ${weatherCost > 0 ? `
                <div style="display: flex; align-items: center; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e1bee7;">
                    <span style="flex: 1; color: #666; font-size: 0.9rem;">تكلفة إضافية (${(WEATHER_FACTORS[breakdown.weather] * 100).toFixed(0)}%):</span>
                    <span style="font-weight: bold; color: #f44336;">+${weatherCost.toFixed(2)} ج.م</span>
                </div>
                ` : ''}
            </div>

            <div style="background: #e8f5e9; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong>📍 المنطقة:</strong>
                    <span>${breakdown.location === 'outside_city' ? '🏞️ خارج المدينة' :
            breakdown.location === 'suburbs' ? '🏘️ الضواحي' : '🏙️ داخل المدينة'}</span>
                </div>
                ${locationCost > 0 ? `
                <div style="display: flex; align-items: center; margin-top: 8px; padding-top: 8px; border-top: 1px solid #c8e6c9;">
                    <span style="flex: 1; color: #666; font-size: 0.9rem;">تكلفة إضافية (${(LOCATION_FACTORS[breakdown.location] * 100).toFixed(0)}%):</span>
                    <span style="font-weight: bold; color: #f44336;">+${locationCost.toFixed(2)} ج.م</span>
                </div>
                ` : ''}
            </div>

            <div style="background: #fce4ec; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong>⚡ سرعة التوصيل:</strong>
                    <span>${breakdown.etaType === 'instant' ? '🚀 فوري' :
            breakdown.etaType === 'fast' ? '⚡ سريع' : '🕐 عادي'}</span>
                </div>
                ${etaCost > 0 ? `
                <div style="display: flex; align-items: center; margin-top: 8px; padding-top: 8px; border-top: 1px solid #f8bbd0;">
                    <span style="flex: 1; color: #666; font-size: 0.9rem;">تكلفة إضافية (${(ETA_FACTORS[breakdown.etaType] * 100).toFixed(0)}%):</span>
                    <span style="font-weight: bold; color: #f44336;">+${etaCost.toFixed(2)} ج.م</span>
                </div>
                ` : ''}
            </div>

            ${breakdown.specialVehicle ? `
            <div style="background: #ffebee; padding: 12px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #f44336;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong>⚠️ مركبة خاصة:</strong>
                    <span>نعم (حمولة ثقيلة)</span>
                </div>
                <div style="display: flex; align-items: center; margin-top: 8px; padding-top: 8px; border-top: 1px solid #ffcdd2;">
                    <span style="flex: 1; color: #666; font-size: 0.9rem;">تكلفة إضافية (${(SPECIAL_VEHICLE_FACTOR * 100).toFixed(0)}%):</span>
                    <span style="font-weight: bold; color: #f44336;">+${specialVehicleCost.toFixed(2)} ج.م</span>
                </div>
            </div>
            ` : ''}

            <div style="background: #c8e6c9; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong>⭐ تقييم السائق:</strong>
                    <span>${breakdown.driverRating.toFixed(1)} نجوم</span>
                </div>
                ${ratingCost !== 0 ? `
                <div style="display: flex; align-items: center; margin-top: 8px; padding-top: 8px; border-top: 1px solid #a5d6a7;">
                    <span style="flex: 1; color: #666; font-size: 0.9rem;">${ratingCost > 0 ? 'رسوم إضافية' : 'خصم'} (${(driverRatingFactor * 100).toFixed(0)}%):</span>
                    <span style="font-weight: bold; color: ${ratingCost > 0 ? '#f44336' : '#4caf50'};">${ratingCost > 0 ? '+' : ''}${ratingCost.toFixed(2)} ج.م</span>
                </div>
                ` : ''}
            </div>

            <div style="background: #fff9c4; padding: 12px; border-radius: 8px; margin-bottom: 15px; border: 2px solid #fbc02d;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <strong style="color: #f57c00;">💳 الرسوم الأساسية:</strong>
                    <span style="font-weight: bold;">+${BASE_FEE.toFixed(2)} ج.م</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid #fff59d;">
                    <strong style="color: #388e3c;">🎁 الخصم:</strong>
                    <span style="font-weight: bold; color: #388e3c;">-${DISCOUNT.toFixed(2)} ج.م</span>
                </div>
            </div>

            <hr style="margin: 20px 0; border: none; border-top: 2px solid #e0e0e0;">

            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 8px; text-align: center;">
                <strong style="font-size: 1.1rem;">💵 التكلفة النهائية: ${totalCost.toFixed(2)} ج.م</strong>
            </div>

            <p style="margin-top: 15px; font-size: 0.85rem; color: #666; text-align: center;">
                <i class="fas fa-info-circle"></i> التكلفة محسوبة بناءً على معادلة ذكية تأخذ في الاعتبار جميع العوامل المذكورة أعلاه
            </p>
        </div>
    `;

    Swal.fire({
        html: detailsHTML,
        width: '600px',
        confirmButtonText: 'فهمت',
        confirmButtonColor: 'var(--primary-color)',
        showCloseButton: true,
        customClass: {
            popup: 'delivery-details-popup'
        }
    });
}
