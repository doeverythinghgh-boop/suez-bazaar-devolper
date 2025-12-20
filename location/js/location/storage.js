/**
 * @file storage.js
 * @description Data persistence and validation logic for the location application.
 * Handles interaction with localStorage and coordinate validation.
 * 
 * @author Antigravity
 * @version 1.0.0
 */

/**
 * Save location data locally in memory (Temporary state)
 * @memberof location_app
 * @param {number} lat - Latitude coordinate
 * @param {number} lng - Longitude coordinate
 * @returns {void}
 */
location_app.location_saveLocation = function (lat, lng) {
    this.location_currentSelection = {
        lat: lat,
        lng: lng,
        zoom: this.location_map ? this.location_map.getZoom() : 15,
        timestamp: new Date().toISOString()
    };
    console.log('Location updated in memory:', this.location_currentSelection);
};

/**
 * Retrieve current location selection from memory or URL params
 * @memberof location_app
 * @returns {Object|null} The current location object or null if not set
 */
location_app.location_getSavedLocation = function () {
    // 1. Check memory state
    if (this.location_currentSelection) return this.location_currentSelection;

    // 2. Check URL params (passed from parent)
    const params = new URLSearchParams(window.location.search);
    const latParam = params.get('lat');
    const lngParam = params.get('lng');

    if (latParam !== null && lngParam !== null) {
        const lat = parseFloat(latParam);
        const lng = parseFloat(lngParam);

        if (!isNaN(lat) && !isNaN(lng)) {
            this.location_currentSelection = {
                lat: lat,
                lng: lng,
                zoom: 15,
                timestamp: new Date().toISOString()
            };
            return this.location_currentSelection;
        }
    }

    return null;
};

/**
 * Validate geographic coordinates
 * @memberof location_app
 * @param {number} lat - Latitude coordinate
 * @param {number} lng - Longitude coordinate
 * @returns {boolean} True if coordinates are within valid ranges
 */
location_app.location_isValidCoordinate = function (lat, lng) {
    return !isNaN(lat) &&
        !isNaN(lng) &&
        lat >= -90 && lat <= 90 &&
        lng >= -180 && lng <= 180;
};
