/**
 * @file utils.js
 * @description Utility functions for the location application.
 * Contains clipboard operations and reset functionality.
 * 
 * @author Antigravity
 * @version 1.0.0
 */

/**
 * Close the location app and notify parent
 * @memberof location_app
 * @returns {void}
 */
location_app.closeLocationApp = function () {
    if (window.parent && window.parent !== window) {
        // Silent save: if a location is selected, send it to parent without alerts
        const saved = this.location_getSavedLocation();
        if (saved) {
            window.parent.postMessage({
                type: 'LOCATION_SELECTED',
                coordinates: `${saved.lat}, ${saved.lng}`,
                lat: saved.lat,
                lng: saved.lng
            }, '*');
        } else {
            // No coordinates selected, notify parent to clear/reset
            window.parent.postMessage({ type: 'LOCATION_RESET' }, '*');
        }

        // Notify parent to close the modal
        window.parent.postMessage({ type: 'CLOSE_LOCATION_MODAL' }, '*');
    }
};

/**
 * Save current markers location and notify parent
 * @memberof location_app
 * @returns {void}
 */
location_app.saveSelectedLocation = function () {
    const saved = this.location_getSavedLocation();
    if (!saved) {
        this.location_showAlert(window.langu('location_alert_title'), window.langu('location_select_on_map_first'), 'warning');
        return;
    }

    if (window.parent && window.parent !== window) {
        window.parent.postMessage({
            type: 'LOCATION_SELECTED',
            coordinates: `${saved.lat}, ${saved.lng}`,
            lat: saved.lat,
            lng: saved.lng
        }, '*');
    }

    this.location_showAlert(window.langu('location_saved_title'), window.langu('location_saved_success'), 'success');
};

/**
 * Reset the saved location to defaults
 * @memberof location_app
 * @returns {Promise<void>}
 */
location_app.resetLocation = async function () {
    try {
        const location_confirmation = await Swal.fire({
            title: window.langu('location_reset_confirm_title'),
            text: window.langu('location_reset_confirm_text'),
            showCancelButton: true,
            confirmButtonText: window.langu('location_reset_yes'),
            cancelButtonText: window.langu('location_reset_cancel'),
            buttonsStyling: false,
            customClass: {
                popup: 'swal-modern-mini-popup',
                title: 'swal-modern-mini-title',
                htmlContainer: 'swal-modern-mini-text',
                confirmButton: 'swal-modern-mini-confirm', // Warning/Danger action can share the primary style or we rely on text
                cancelButton: 'swal-modern-mini-cancel'
            }
        });

        if (!location_confirmation.isConfirmed) return;

        localStorage.removeItem(this.location_storageKey);

        if (this.location_marker) {
            this.location_map.removeLayer(this.location_marker);
            this.location_marker = null;
        }

        if (this.location_accuracyCircle) {
            this.location_map.removeLayer(this.location_accuracyCircle);
            this.location_accuracyCircle = null;
        }

        this.location_map.flyTo(this.location_defaultCoords, this.location_defaultZoom);

        // Notify parent window that location has been reset
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'LOCATION_RESET' }, '*');
        }

    } catch (error) {
        console.error('Error resetting location:', error);
        this.location_showAlert(window.langu('location_error_title'), window.langu('location_reset_error'), 'error');
    }
};

/**
 * Share current location coordinates (copy to clipboard or open in maps)
 * @memberof location_app
 * @returns {Promise<void>}
 */
location_app.shareCoordinates = async function () {
    try {
        const location_saved = this.location_getSavedLocation();

        if (!location_saved) {
            this.location_showAlert(
                window.langu('location_no_data_title'),
                window.langu('location_no_location_saved'),
                'warning'
            );
            return;
        }

        const location_coordinates = `${location_saved.lat}, ${location_saved.lng}`;

        // Ask user whether to copy or open in maps
        const location_choice = await Swal.fire({
            title: window.langu('location_options_title'),
            text: window.langu('location_options_text'),
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: window.langu('location_open_in_maps'),
            denyButtonText: window.langu('location_copy_coordinates'),
            cancelButtonText: window.langu('location_reset_cancel'),
            buttonsStyling: false,
            customClass: {
                popup: 'swal-modern-mini-popup',
                title: 'swal-modern-mini-title',
                htmlContainer: 'swal-modern-mini-text',
                confirmButton: 'swal-modern-mini-confirm',
                denyButton: 'swal-modern-mini-confirm', // Use same style for alternative positive action
                cancelButton: 'swal-modern-mini-cancel'
            }
        });

        if (location_choice.isConfirmed) {
            // Open in external maps application
            const location_mapsUrl = `https://www.google.com/maps/search/?api=1&query=${location_coordinates}`;
            window.open(location_mapsUrl, '_blank');
        } else if (location_choice.isDenied) {
            // Copy to clipboard
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(location_coordinates);
            } else {
                const location_textArea = document.createElement('textarea');
                location_textArea.value = location_coordinates;
                document.body.appendChild(location_textArea);
                location_textArea.select();
                document.execCommand('copy');
                document.body.removeChild(location_textArea);
            }
            this.location_showAlert(window.langu('location_copied_title'), window.langu('location_copied_success'), 'success');
        }

        // NEW: Always try to notify parent window if in an iframe
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: 'LOCATION_SELECTED',
                coordinates: location_coordinates,
                lat: location_saved.lat,
                lng: location_saved.lng
            }, '*');
        }

    } catch (error) {
        console.error('Error in location options:', error);
        this.location_showAlert(window.langu('location_error_title'), window.langu('location_unexpected_error'), 'error');
    }
};
