/**
 * @file utils.js
 * @description Utility functions for the location application.
 * Contains clipboard operations and reset functionality.
 * 
 * @author Antigravity
 * @version 1.0.0
 */

/**
 * Reset the saved location to defaults
 * @memberof location_app
 * @returns {Promise<void>}
 */
location_app.resetLocation = async function () {
    try {
        const location_confirmation = await Swal.fire({
            title: 'إعادة التعيين؟',
            text: 'سيتم حذف الموقع المحفوظ وإعادة التعيين إلى الإعدادات الافتراضية',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'نعم، احذف',
            cancelButtonText: 'إلغاء',
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            customClass: { popup: 'location_fullscreen-swal' }
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
        this.location_showAlert('تمت العملية', 'تمت إعادة التعيين بنجاح', 'success');

    } catch (error) {
        console.error('Error resetting location:', error);
        this.location_showAlert('خطأ', 'تعذر إعادة التعيين', 'error');
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
                'لا توجد بيانات',
                'لا يوجد موقع محفوظ لمشاركته',
                'warning'
            );
            return;
        }

        const location_coordinates = `${location_saved.lat}, ${location_saved.lng}`;

        // Ask user whether to copy or open in maps
        const location_choice = await Swal.fire({
            title: 'خيارات الموقع',
            text: 'ماذا تريد أن تفعل بالإحداثيات؟',
            icon: 'question',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: 'فتح في الخرائط',
            denyButtonText: 'نسخ الإحداثيات',
            cancelButtonText: 'إلغاء',
            confirmButtonColor: '#2563eb',
            denyButtonColor: '#10b981',
            cancelButtonColor: '#6b7280',
            customClass: { popup: 'location_fullscreen-swal' }
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
            this.location_showAlert('تم النسخ', 'تم نسخ الإحداثيات إلى الحافظة', 'success');
        }

    } catch (error) {
        console.error('Error in location options:', error);
        this.location_showAlert('خطأ', 'حدث خطأ في معالجة طلبك', 'error');
    }
};
