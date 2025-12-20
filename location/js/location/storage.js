/**
 * @file storage.js
 * @description Data persistence and validation logic for the location application.
 * Handles interaction with localStorage and coordinate validation.
 * 
 * @author Antigravity
 * @version 1.0.0
 */

/**
 * Save location data to local storage
 * @memberof location_app
 * @param {number} lat - Latitude coordinate
 * @param {number} lng - Longitude coordinate
 * @returns {void}
 * @throws {Error} If saving fails
 */
location_app.location_saveLocation = function (lat, lng) {
    try {
        const location_data = {
            lat: lat,
            lng: lng,
            zoom: this.location_map.getZoom(),
            timestamp: new Date().toISOString()
        };

        localStorage.setItem(this.location_storageKey, JSON.stringify(location_data));
        console.log('Location saved successfully:', location_data);
    } catch (error) {
        console.error('Error saving location:', error);
        throw new Error('تعذر حفظ الموقع في التخزين المحلي');
    }
};

/**
 * Retrieve saved location from local storage
 * @memberof location_app
 * @returns {Object|null} The saved location object or null if not found/invalid
 */
location_app.location_getSavedLocation = function () {
    try {
        const location_data = localStorage.getItem(this.location_storageKey);

        if (!location_data) {
            return null;
        }

        const location_parsed = JSON.parse(location_data);

        // Validate parsed data structure
        if (!location_parsed ||
            typeof location_parsed.lat !== 'number' ||
            typeof location_parsed.lng !== 'number') {
            localStorage.removeItem(this.location_storageKey);
            return null;
        }

        return location_parsed;
    } catch (error) {
        console.error('Error retrieving saved location:', error);
        localStorage.removeItem(this.location_storageKey);
        return null;
    }
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
