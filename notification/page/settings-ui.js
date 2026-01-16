/**
 * @file settings-ui.js
 * @description UI rendering and feedback for notification settings.
 */

Object.assign(notifiSetting_Controller, {
    /**
     * @description Dynamically builds the settings table.
     */
    notifiSetting_renderTable() {
        try {
            const mandatoryEvents = {
                'new-item-added': { label: 'Add Product', admin: true, seller: true, category: 'store' },
                'item-accepted': { label: 'Accept Product', admin: true, seller: true, category: 'store' },
                'item-updated': { label: 'Update Product', admin: true, seller: true, category: 'store' }
            };

            Object.keys(mandatoryEvents).forEach(eventKey => {
                if (this.notifiSetting_config && !this.notifiSetting_config[eventKey]) {
                    this.notifiSetting_config[eventKey] = mandatoryEvents[eventKey];
                }
            });

            const notifiSetting_tbody = document.getElementById('notifiSetting_settings-body');
            const notifiSetting_storeTbody = document.getElementById('notifiSetting_store-settings-body');
            if (!notifiSetting_tbody || !notifiSetting_storeTbody) return;

            notifiSetting_tbody.innerHTML = '';
            notifiSetting_storeTbody.innerHTML = '';

            if (!this.notifiSetting_config || Object.keys(this.notifiSetting_config).length === 0) {
                const emptyMsg = `<tr><td colspan="5" style="text-align:center; padding:20px;">${this._notifiSetting_safeLangu('notif_load_fail', 'No data available')}</td></tr>`;
                notifiSetting_tbody.innerHTML = emptyMsg;
                notifiSetting_storeTbody.innerHTML = emptyMsg;
                return;
            }

            Object.keys(this.notifiSetting_config).forEach(notifiSetting_key => {
                const notifiSetting_data = this.notifiSetting_config[notifiSetting_key];
                if (!notifiSetting_data) return;

                const isStoreEvent = notifiSetting_data.category === 'store';
                const notifiSetting_row = document.createElement('tr');

                if (!isStoreEvent) {
                    const transKey = `notif_label_${notifiSetting_key.replace('step-', '')}`;
                    const displayLabel = this._notifiSetting_safeLangu(transKey, notifiSetting_data.label || notifiSetting_key);

                    notifiSetting_row.innerHTML = `
                        <td class="notifiSetting_event-name">${displayLabel}</td>
                        <td>${this.notifiSetting_createCheckbox(notifiSetting_key, 'buyer', !!notifiSetting_data.buyer)}</td>
                        <td>${this.notifiSetting_createCheckbox(notifiSetting_key, 'admin', !!notifiSetting_data.admin)}</td>
                        <td>${this.notifiSetting_createCheckbox(notifiSetting_key, 'seller', !!notifiSetting_data.seller)}</td>
                        <td>${this.notifiSetting_createCheckbox(notifiSetting_key, 'delivery', !!notifiSetting_data.delivery)}</td>
                    `;
                    notifiSetting_tbody.appendChild(notifiSetting_row);
                } else {
                    const transKey = `notif_label_${notifiSetting_key.replace(/-/g, '_')}`;
                    const displayLabel = this._notifiSetting_safeLangu(transKey, notifiSetting_data.label || notifiSetting_key);

                    notifiSetting_row.innerHTML = `
                        <td class="notifiSetting_event-name">${displayLabel}</td>
                        <td>${this.notifiSetting_createCheckbox(notifiSetting_key, 'admin', !!notifiSetting_data.admin)}</td>
                        <td>${this.notifiSetting_createCheckbox(notifiSetting_key, 'seller', !!notifiSetting_data.seller)}</td>
                    `;
                    notifiSetting_storeTbody.appendChild(notifiSetting_row);
                }
            });
        } catch (notifiSetting_error) {
            console.error('[notifiSetting] Render failure:', notifiSetting_error);
        }
    },

    /**
     * @description Injects logical loading placeholder.
     */
    notifiSetting_renderLoading() {
        const notifiSetting_tbody = document.getElementById('notifiSetting_settings-body');
        const notifiSetting_storeTbody = document.getElementById('notifiSetting_store-settings-body');
        const loadingHtml = `<tr><td colspan="5" style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> ${this._notifiSetting_safeLangu('notifications_loading', 'Loading...')}</td></tr>`;

        if (notifiSetting_tbody) notifiSetting_tbody.innerHTML = loadingHtml;
        if (notifiSetting_storeTbody) notifiSetting_storeTbody.innerHTML = loadingHtml;
    },

    /**
     * @description Safe translation wrapper.
     */
    _notifiSetting_safeLangu(key, defaultText) {
        if (typeof window.langu === 'function') {
            const val = window.langu(key);
            return val !== key ? val : defaultText;
        }
        return defaultText;
    },

    /**
     * @description Generates HTML for a checkbox.
     */
    notifiSetting_createCheckbox(notifiSetting_eventKey, notifiSetting_role, notifiSetting_checked) {
        return `
            <div class="notifiSetting_checkbox-wrapper">
                <input type="checkbox" 
                    data-event="${notifiSetting_eventKey}" 
                    data-role="${notifiSetting_role}" 
                    ${notifiSetting_checked ? 'checked' : ''} 
                    onchange="notifiSetting_Controller.notifiSetting_handleCheckboxChange(this)"
                >
            </div>
        `;
    },

    /**
     * @description Show toast feedback.
     */
    notifiSetting_showToast(notifiSetting_message) {
        try {
            const notifiSetting_toast = document.getElementById('notifiSetting_toast');
            if (notifiSetting_toast) {
                notifiSetting_toast.textContent = notifiSetting_message;
                notifiSetting_toast.classList.add('notifiSetting_show');
                setTimeout(() => {
                    notifiSetting_toast.classList.remove('notifiSetting_show');
                }, 3000);
            }
        } catch (notifiSetting_error) {
            console.error('[notifiSetting] Toast failure:', notifiSetting_error);
        }
    }
});
