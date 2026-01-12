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
            doubleClickZoom: false, // Disabled to allow dblclick for location selection
            zoomControl: true,
            attributionControl: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(this.location_map);

        // Add Recenter Control
        const recenterControl = L.Control.extend({
            options: { position: 'topleft' },
            onAdd: function (map) {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-recenter');
                const button = L.DomUtil.create('a', 'recenter-button', container);
                button.innerHTML = '<i class="fas fa-crosshairs"></i>';
                button.href = '#';
                button.title = window.langu('location_recenter_title');

                // Styles are now handled by location_styles.css using .leaflet-control-recenter class

                L.DomEvent.on(button, 'click', L.DomEvent.stop)
                    .on(button, 'click', function (e) {
                        L.DomEvent.stopPropagation(e);
                        L.DomEvent.preventDefault(e);

                        if (location_app.location_marker) {
                            const latlng = location_app.location_marker.getLatLng();
                            map.flyTo(latlng, map.getZoom());
                        } else {
                            map.flyTo(location_app.location_defaultCoords, location_app.location_defaultZoom);
                        }
                    });

                return container;
            }
        });
        this.location_map.addControl(new recenterControl());

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
        throw new Error(window.langu('location_load_error'));
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
            title: window.langu('location_marker_title'),
            alt: window.langu('location_marker_alt')
        }).addTo(this.location_map);

        this.location_marker.bindPopup(`
            <b id="location_popupTitle">${window.langu('location_marker_title')}</b><br>
            <span id="location_popupLat">${window.langu('location_lat_label')}: ${lat.toFixed(6)}</span><br>
            <span id="location_popupLng">${window.langu('location_lng_label')}: ${lng.toFixed(6)}</span>
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
            this.location_showAlert(window.langu('location_error_title'), window.langu('location_invalid_coords'), 'error');
            return;
        }

        const location_existingLocation = this.location_getSavedLocation();

        if (location_existingLocation) {
            const location_confirmation = await Swal.fire({
                title: window.langu('location_edit_confirm_title'),
                text: window.langu('location_edit_confirm_text'),
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: window.langu('location_edit_replace'),
                cancelButtonText: window.langu('location_reset_cancel'),
                confirmButtonColor: '#2563eb',
                cancelButtonColor: '#6b7280',
                customClass: { popup: 'fullscreen-swal' }
            });

            if (!location_confirmation.isConfirmed) return;
        }

        this.location_saveLocation(lat, lng);
        this.location_updateMarker(lat, lng);
        this.location_map.flyTo([lat, lng], 15);

        // Auto-notify parent if internal save button is hidden or we are in an iframe
        if (window.parent && window.parent !== window) {
            console.log("[Map] Broadcasting selection to parent. HideSave state:", this.hideSave);
            window.parent.postMessage({
                type: 'LOCATION_SELECTED',
                coordinates: `${lat}, ${lng}`,
                lat: lat,
                lng: lng
            }, '*');
        }

    } catch (error) {
        console.error('Error in location selection:', error);
        this.location_showAlert(window.langu('location_error_title'), window.langu('location_save_error'), 'error');
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
