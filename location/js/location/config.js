/**
 * @file config.js
 * @description Configuration and base object for the Location Selection Application.
 * This file defines the global location_app object and its constant properties.
 * 
 * @author Antigravity
 * @version 1.0.0
 */

/**
 * Global application object for location management
 * @namespace location_app
 */
const location_app = {
    /**
     * Leaflet map instance
     * @type {L.Map|null}
     */
    location_map: null,

    /**
     * Current marker on the map
     * @type {L.Marker|null}
     */
    location_marker: null,

    /**
     * Accuracy circle for GPS locations
     * @type {L.Circle|null}
     */
    location_accuracyCircle: null,

    /**
     * Timer for long press detection on mobile
     * @type {number|null}
     */
    location_longPressTimer: null,

    /**
     * Flag to prevent multiple simultaneous operations
     * @type {boolean}
     */
    location_isBusy: false,

    /**
     * Default coordinates (Suez, Egypt)
     * @type {number[]}
     */
    location_defaultCoords: [29.9668, 32.5498],

    /**
     * Default zoom level
     * @type {number}
     */
    location_defaultZoom: 13,

    /**
     * Local storage key for saved location
     * @type {string}
     */
    location_storageKey: 'bidstory_user_saved_location'
};
