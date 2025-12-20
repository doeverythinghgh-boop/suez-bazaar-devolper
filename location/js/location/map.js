/**
 * @file map.js
 * @description Leaflet map integration and interaction logic.
 * Handles map initialization, marker updates, and selection events.
 * 
 * @author Antigravity
 * @version 1.0.0
 */

/**
 * Initialize the Leaflet map instance
 * @memberof location_app
 * @returns {void}
 */
location_app.location_initMap = function () {
    try {
        const location_savedLocation = this.location_getSavedLocation();
        const location_startCoords = location_savedLocation ?
            [location_savedLocation.lat, location_savedLocation.lng] :
            this.location_defaultCoords;
        const location_startZoom = location_savedLocation?.zoom || this.location_defaultZoom;

        console.log("[Map] Initializing Leaflet at:", location_startCoords, "Zoom:", location_startZoom);

        this.location_map = L.map('location_map', {
            center: location_startCoords,
            zoom: location_startZoom,
            tap: false,
            zoomControl: true,
            attributionControl: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(this.location_map);

        if (location_savedLocation) {
            console.log("[Map] Found saved location. Setting view and marker...");
            this.location_map.setView([location_savedLocation.lat, location_savedLocation.lng], location_savedLocation.zoom);
            this.location_updateMarker(location_savedLocation.lat, location_savedLocation.lng);
        } else {
            console.log("[Map] No saved location. Opening at default (Suez).");
        }

        console.log('[Map] Leaflet map initialized and layers added.');
    } catch (error) {
        console.error('Failed to initialize map:', error);
        throw new Error('تعذر تحميل الخريطة. تحقق من اتصال الإنترنت.');
    }
};

/**
 * Set up event listeners for map interactions (click, double click, long press)
 * @memberof location_app
 * @returns {void}
 */
location_app.location_setupEventListeners = function () {
    if (!this.location_map || this.viewOnly) {
        if (this.viewOnly) console.log("[Map] Mode: ViewOnly. Event listeners for selection disabled.");
        return;
    }

    try {
        // Desktop: Double click to select location
        this.location_map.on('dblclick', (event) => {
            this.location_handleLocationSelection(event.latlng.lat, event.latlng.lng);
        });

        // Mobile: Long press to select location
        this.location_map.on('mousedown touchstart', (event) => {
            this.location_longPressTimer = setTimeout(() => {
                const location_latlng = event.latlng ||
                    this.location_map.mouseEventToLatLng(event.originalEvent.touches[0]);
                this.location_handleLocationSelection(location_latlng.lat, location_latlng.lng);
            }, 700);
        });

        this.location_map.on('mouseup touchend touchmove', () => {
            clearTimeout(this.location_longPressTimer);
        });

        console.log('Event listeners set up successfully');
    } catch (error) {
        console.error('Failed to set up event listeners:', error);
    }
};

/**
 * Update the marker position and popup content
 * @memberof location_app
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {void}
 */
location_app.location_updateMarker = function (lat, lng) {
    try {
        if (this.location_marker) {
            this.location_map.removeLayer(this.location_marker);
        }

        const location_customIcon = L.divIcon({
            className: 'location_custom-marker',
            html: '<div class="location_marker-pin"></div>',
            iconSize: [30, 42],
            iconAnchor: [15, 42]
        });

        this.location_marker = L.marker([lat, lng], {
            icon: location_customIcon,
            title: 'الموقع المحدد',
            alt: 'موقع المستخدم على الخريطة'
        }).addTo(this.location_map);

        this.location_marker.bindPopup(`
            <b id="location_popupTitle">الموقع المحدد</b><br>
            <span id="location_popupLat">خط العرض: ${lat.toFixed(6)}</span><br>
            <span id="location_popupLng">خط الطول: ${lng.toFixed(6)}</span>
        `);

    } catch (error) {
        console.error('Error updating marker:', error);
    }
};

/**
 * Handle location selection with confirmation dialog
 * @memberof location_app
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<void>}
 */
location_app.location_handleLocationSelection = async function (lat, lng) {
    try {
        if (this.location_isBusy) return;

        if (!this.location_isValidCoordinate(lat, lng)) {
            this.location_showAlert('خطأ', 'إحداثيات غير صالحة', 'error');
            return;
        }

        const location_existingLocation = this.location_getSavedLocation();

        if (location_existingLocation) {
            const location_confirmation = await Swal.fire({
                title: 'تعديل الموقع؟',
                text: 'هل تريد استبدال الموقع المحفوظ بالموقع الجديد؟',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'نعم، استبدل',
                cancelButtonText: 'إلغاء',
                confirmButtonColor: '#2563eb',
                cancelButtonColor: '#6b7280',
                customClass: { popup: 'fullscreen-swal' }
            });

            if (!location_confirmation.isConfirmed) return;
        }

        this.location_saveLocation(lat, lng);
        this.location_updateMarker(lat, lng);
        this.location_map.flyTo([lat, lng], 15);

    } catch (error) {
        console.error('Error in location selection:', error);
        this.location_showAlert('خطأ', 'تعذر حفظ الموقع', 'error');
    }
};

/**
 * Load the initial location on startup
 * @memberof location_app
 * @returns {void}
 */
location_app.location_loadInitialLocation = function () {
    // Auto-GPS removed to strictly follow "Open at Default Location" if no saved location exists.
    // User can still click the 'Deteremine' (GPS) button.
    console.log('Map initialized at target location (Saved or Default).');
};
