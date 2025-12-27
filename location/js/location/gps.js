/**
 * @file gps.js
 * @description Geolocation Services (GPS) integration for the location application.
 * Handles requesting and processing user's real-time position.
 * 
 * @author Antigravity
 * @version 1.0.0
 */

/**
 * Start the GPS location retrieval process
 * @memberof location_app
 * @returns {Promise<void>}
 */
location_app.getLocationByGPS = function () {
    return new Promise((resolve) => {
        try {
            if (!navigator.geolocation) {
                this.location_showAlert('غير مدعوم', 'المتصفح الحالي لا يدعم خدمة تحديد الموقع', 'error');
                resolve();
                return;
            }

            if (this.location_isBusy) {
                this.location_showAlert('جاري العمل', 'يتم الآن تحديد موقع آخر، الرجاء الانتظار', 'info');
                resolve();
                return;
            }

            this.location_isBusy = true;
            this.location_gpsAborted = false; // Reset abortion flag
            this.location_map.dragging.disable();

            Swal.fire({
                title: 'جاري تحديد الموقع...',
                html: `
                    <p style="margin-bottom: 20px;">يرجى السماح بالوصول إلى بيانات الموقع</p>
                    <div class="swal2-loading" style="display: flex; justify-content: center; margin-bottom: 10px;">
                        <div class="swal2-loader" style="display: block;"></div>
                    </div>
                `,
                allowOutsideClick: false,
                allowEscapeKey: false,
                showCancelButton: true,
                cancelButtonText: 'إلغاء',
                showConfirmButton: false, // Hide confirm button during search
                cancelButtonColor: '#d33',
                customClass: { popup: 'location_fullscreen-swal' }
            }).then((result) => {
                if (result.isDismissed || result.dismiss === Swal.DismissReason.cancel) {
                    console.log("[GPS] User cancelled location retrieval.");
                    this.location_gpsAborted = true;
                    this.location_isBusy = false;
                    this.location_map.dragging.enable();
                }
            });

            console.log("[GPS] Starting Priority 1 (High Accuracy)...");

            const attemptPosition = (options, isFallback = false) => {
                if (this.location_gpsAborted) return; // Stop if user cancelled

                console.log(`[GPS] Calling getCurrentPosition (${isFallback ? "Fallback" : "Primary"})...`, options);

                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        if (this.location_gpsAborted) return;
                        console.log("[GPS] Success callback triggered.");
                        this.location_onGPSSuccess(position, resolve);
                    },
                    (error) => {
                        if (this.location_gpsAborted) return;
                        console.warn(`[GPS] Error callback (${isFallback ? "Fallback" : "Primary"}). Code:`, error.code, "Msg:", error.message);

                        // If primary HighAccuracy failed with Timeout (3) or Position Unavailable (2), try LowAccuracy
                        if (!isFallback && (error.code === 3 || error.code === 2)) {
                            console.log("[GPS] Attempting Fallback (HighAccuracy: false) with generous cache...");
                            attemptPosition({
                                enableHighAccuracy: false,
                                timeout: 20000,
                                maximumAge: 600000 // 10 minutes cache allowance
                            }, true);
                        } else {
                            this.location_onGPSError(error, resolve);
                        }
                    },
                    options
                );
            };

            // Initial Attempt: High Accuracy, 20s timeout
            attemptPosition({
                enableHighAccuracy: true,
                timeout: 20000,
                maximumAge: 0
            });

        } catch (error) {
            console.error('Error in GPS location retrieval:', error);
            this.location_onGPSError({ code: 0 }, resolve);
        }
    });
};

/**
 * Handle successful GPS location update
 * @memberof location_app
 * @param {GeolocationPosition} position - Success position object
 * @param {Function} resolve - Resolution for the main GPS promise
 * @returns {void}
 */
location_app.location_onGPSSuccess = function (position, resolve) {
    try {
        Swal.close();
        this.location_isBusy = false;
        this.location_map.dragging.enable();

        const location_lat = position.coords.latitude;
        const location_lng = position.coords.longitude;
        const location_accuracy = position.coords.accuracy;
        console.log("[GPS] Position acquired:", location_lat, location_lng, "Accuracy:", location_accuracy);

        this.location_handleLocationSelection(location_lat, location_lng);

        if (location_accuracy && this.location_map) {
            if (this.location_accuracyCircle) {
                this.location_map.removeLayer(this.location_accuracyCircle);
            }
            this.location_accuracyCircle = L.circle([location_lat, location_lng], {
                radius: location_accuracy,
                fillOpacity: 0.1,
                color: '#2563eb',
                weight: 1
            }).addTo(this.location_map);
        }

        resolve();
    } catch (error) {
        console.error('Error processing GPS success:', error);
        resolve();
    }
};

/**
 * Handle GPS errors (permission denied, timeout, unavailable)
 * @memberof location_app
 * @param {GeolocationPositionError} error - Error object
 * @param {Function} resolve - Resolution for the main GPS promise
 * @returns {void}
 */
location_app.location_onGPSError = function (error, resolve) {
    try {
        Swal.close();
        this.location_isBusy = false;

        if (this.location_map) {
            this.location_map.dragging.enable();
        }

        const location_errorMessages = {
            1: 'تم رفض الإذن. الرجاء السماح بالوصول إلى الموقع في إعدادات المتصفح.',
            2: 'الموقع غير متاح حالياً. تحقق من اتصال الإنترنت.',
            3: 'استغرقت العملية وقتاً طويلاً. حاول مرة أخرى.',
            0: 'حدث خطأ غير متوقع أثناء تحديد الموقع.'
        };

        this.location_showAlert(
            'خطأ في تحديد الموقع',
            location_errorMessages[error.code] || location_errorMessages[0],
            'error'
        );

        resolve();
    } catch (innerError) {
        console.error('Error handling GPS error:', innerError);
        resolve();
    }
};
