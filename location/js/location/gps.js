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
                this.location_showAlert(
                    'غير مدعوم',
                    'المتصفح الحالي لا يدعم خدمة تحديد الموقع',
                    'error'
                );
                resolve();
                return;
            }

            if (this.location_isBusy) {
                this.location_showAlert(
                    'جاري العمل',
                    'يتم الآن تحديد موقع آخر، الرجاء الانتظار',
                    'info'
                );
                resolve();
                return;
            }

            this.location_isBusy = true;
            this.location_map.dragging.disable();

            Swal.fire({
                title: 'جاري تحديد الموقع...',
                text: 'يرجى السماح بالوصول إلى بيانات الموقع',
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => Swal.showLoading(),
                customClass: { popup: 'location_fullscreen-swal' }
            });

            // Geolocation options (optimized for mobile and desktop)
            const location_options = {
                enableHighAccuracy: true,
                timeout: 30000, // 30 seconds for better mobile support
                maximumAge: 0
            };

            navigator.geolocation.getCurrentPosition(
                (position) => this.location_onGPSSuccess(position, resolve),
                (error) => this.location_onGPSError(error, resolve),
                location_options
            );

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
