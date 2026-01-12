/**
 * @file pages/profile-modal/js/profile-handlers.js
 * @description Main event handlers and API interaction logic for the profile modal.
 */

/**
 * Handles the "Change Password" checkbox interaction.
 * Verifies identity if necessary before showing password fields.
 * @async
 */
async function profileHandleChangePasswordCheck() {
    try {
        const els = profileGetElements();
        const user = window.userSession;
        if (!els.changePasswordCheckbox || !user) return;

        if (els.changePasswordCheckbox.checked) {
            // If user has no existing password, allow setting one directly
            if (!user.Password) {
                if (els.passwordFieldsContainer) {
                    els.passwordFieldsContainer.style.display = "block";
                }
                profileIsPasswordVerified = true;
                return;
            }

            // Verify current identity
            const passwordEntered = await AuthUI.confirmPassword(
                window.langu("profile_confirm_identity_title"),
                window.langu("profile_confirm_identity_text")
            );

            if (passwordEntered) {
                AuthUI.showLoading(window.langu("profile_verifying"));
                const result = await verifyUserPassword(user.phone, passwordEntered);
                AuthUI.close();

                if (result && !result.error) {
                    if (els.passwordFieldsContainer) {
                        els.passwordFieldsContainer.style.display = "block";
                    }
                    profileIsPasswordVerified = true;
                } else {
                    els.changePasswordCheckbox.checked = false;
                    AuthUI.showError(window.langu("alert_title_info"), window.langu("profile_invalid_password"));
                }
            } else {
                els.changePasswordCheckbox.checked = false;
            }
        } else {
            // Hide password fields if checkbox is unchecked
            if (els.passwordFieldsContainer) {
                els.passwordFieldsContainer.style.display = "none";
            }
            profileIsPasswordVerified = false;
        }
    } catch (error) {
        console.error("Error in profileHandleChangePasswordCheck:", error);
    }
}

/**
 * Handles the "Seller Options" button click.
 * Shows a SweetAlert2 modal to configure self-delivery and order limit.
 * @async
 */
async function profileHandleSellerOptions() {
    try {
        const els = profileGetElements();
        const user = window.userSession;
        if (!els.sellerOptionsBtn || !user) return;

        const currentIsDelevred = els.isDelevredInput.value;
        const currentLimitPackage = els.limitPackageInput.value;

        const { value: formValues } = await Swal.fire({
            title: window.langu("profile_seller_settings_title"),
            html: `
                <div class="swal-profile-container">
                    <div class="swal-profile-section">
                        <label class="swal-profile-label">
                            ${window.langu("profile_delivery_question")}
                        </label>
                        <select id="swal-profile_is-delevred" class="swal2-input swal-profile-input">
                            <option value="0" ${currentIsDelevred == "0" ? "selected" : ""}>${window.langu("profile_delivery_no")}</option>
                            <option value="1" ${currentIsDelevred == "1" ? "selected" : ""}>${window.langu("profile_delivery_yes")}</option>
                        </select>
                    </div>
                    <div class="swal-profile-section">
                        <label class="swal-profile-label">
                            ${window.langu("profile_min_order_question")}
                        </label>
                        <select id="swal-profile_has-limit" class="swal2-input swal-profile-input">
                            <option value="no" ${currentLimitPackage == "0" ? "selected" : ""}>${window.langu("profile_min_order_no")}</option>
                            <option value="yes" ${currentLimitPackage != "0" ? "selected" : ""}>${window.langu("profile_min_order_yes")}</option>
                        </select>
                        <div id="swal-profile_limit-container" style="margin-top: 15px; display: ${currentLimitPackage != "0" ? "block" : "none"};">
                            <label class="swal-profile-label-sub">${window.langu("profile_min_order_value_label")}</label>
                            <input type="number" id="swal-profile_limit-value" class="swal2-input swal-profile-input" value="${currentLimitPackage}" placeholder="${window.langu("profile_min_order_placeholder")}">
                        </div>
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: window.langu("profile_save_settings_btn"),
            cancelButtonText: window.langu("alert_cancel_btn"),
            buttonsStyling: false,
            customClass: {
                popup: 'swal-modern-mini-popup',
                title: 'swal-modern-mini-title',
                htmlContainer: 'swal-modern-mini-text',
                confirmButton: 'swal-modern-mini-confirm',
                cancelButton: 'swal-modern-mini-cancel'
            },
            didOpen: () => {
                const hasLimitSelect = document.getElementById("swal-profile_has-limit");
                const limitContainer = document.getElementById("swal-profile_limit-container");
                hasLimitSelect.addEventListener("change", (e) => {
                    limitContainer.style.display = e.target.value === "yes" ? "block" : "none";
                });
            },
            preConfirm: () => {
                const isDelevred = document.getElementById("swal-profile_is-delevred").value;
                const hasLimit = document.getElementById("swal-profile_has-limit").value;
                const limitValue = document.getElementById("swal-profile_limit-value").value;

                if (hasLimit === "yes" && (!limitValue || limitValue <= 0)) {
                    Swal.showValidationMessage(window.langu("profile_invalid_min_order"));
                    return false;
                }

                return {
                    isDelevred: parseInt(isDelevred),
                    limitPackage: hasLimit === "yes" ? parseFloat(limitValue) : 0
                };
            }
        });

        if (formValues) {
            els.isDelevredInput.value = formValues.isDelevred;
            els.limitPackageInput.value = formValues.limitPackage;

            // Update UI feedback on the button
            const isSet = (formValues.isDelevred === 1 || formValues.limitPackage > 0);
            els.sellerOptionsBtn.innerHTML = `<i class="fas fa-store"></i> ${window.langu("profile_seller_options_btn")} ${isSet ? window.langu("profile_seller_options_set") : ""}`;
            els.sellerOptionsBtn.style.background = isSet ? "#d1fae5" : "#f0fdf4";
            els.sellerOptionsBtn.style.color = isSet ? "#065f46" : "#166534"; // Ensure text readability
        }
    } catch (error) {
        console.error("Error in profileHandleSellerOptions:", error);
    }
}

/**
 * Handles the save changes request.
 * Performs final validation and calls the update API.
 * @async
 */
async function profileHandleSaveChanges() {
    const els = profileGetElements();
    const validationResult = profileValidateInputs();
    if (!validationResult.isValid) return;

    const { username, phone, address, password } = validationResult.data;
    const user = window.userSession;
    if (!user) return;

    const updatedData = { user_key: user.user_key };
    if (username !== user.username) updatedData.username = username;
    if (phone !== user.phone) updatedData.phone = phone;

    const currentAddress = (user.Address || user.address || "").trim();
    if (address !== currentAddress) {
        updatedData.address = address;
    }

    // Normalized location comparison
    const currentCoords = (user.location || user.Location || "").toString().trim().replace(/\s+/g, '');
    const newCoords = (els.coordsInput?.value || "").toString().trim().replace(/\s+/g, '');

    // Mandatory Location Check
    const mapError = document.getElementById("profile-map-error");
    if (!newCoords) {
        if (mapError) {
            mapError.textContent = window.langu("profile_map_mandatory_error");
            mapError.style.display = "block";
            mapError.style.color = "#dc2626";
            mapError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    } else {
        if (mapError) mapError.style.display = "none";
    }

    if (newCoords && newCoords !== currentCoords) {
        updatedData.location = newCoords.includes(',') ? newCoords.replace(',', ', ') : newCoords;
    }

    if (els.changePasswordCheckbox?.checked && password) {
        updatedData.password = password;
    }

    // Include Seller Options
    const newIsDelevred = parseInt(els.isDelevredInput?.value || 0);
    const newLimitPackage = parseFloat(els.limitPackageInput?.value || 0);

    if (newIsDelevred !== (user.isDelevred || 0)) {
        updatedData.isDelevred = newIsDelevred;
    }
    if (newLimitPackage !== (user.limitPackage || 0)) {
        updatedData.limitPackage = newLimitPackage;
    }

    // Check if any actual changes were made
    if (Object.keys(updatedData).length === 1) {
        await AuthUI.showSuccess(window.langu("profile_no_changes_title"), window.langu("profile_no_changes_text"));
        return;
    }

    // Verify identity before critical update if not already verified
    if (user.Password && !profileIsPasswordVerified) {
        const passwordEntered = await AuthUI.confirmPassword(
            window.langu("profile_confirm_identity_title"),
            window.langu("profile_save_confirm_text")
        );
        if (!passwordEntered) return;

        AuthUI.showLoading(window.langu("profile_verifying"));
        const verification = await verifyUserPassword(user.phone, passwordEntered);
        AuthUI.close();

        if (!verification || verification.error) {
            AuthUI.showError(window.langu("alert_title_info"), window.langu("profile_invalid_password"));
            return;
        }
    }

    // Execute update
    AuthUI.showLoading(window.langu("profile_saving"));
    const result = await updateUser(updatedData);
    AuthUI.close();

    if (result && !result.error) {
        profileUpdateSession(updatedData);
        await AuthUI.showSuccess(window.langu("profile_update_success_title"), result.message);
        mainLoader("pages/user-dashboard.html", "index-user-container", 0, undefined, "showHomeIcon", true);
    } else {
        AuthUI.showError(window.langu("alert_title_info"), result?.error || window.langu("profile_update_fail"));
    }
}

/**
 * Updates the local user session data.
 * @param {Object} updatedData - The newly updated user data.
 */
function profileUpdateSession(updatedData) {
    SessionManager.updateUser(updatedData);
}

/**
 * Handles the secure account deletion process.
 * @async
 */
async function profileHandleAccountDeletion() {
    const confirmation = await Swal.fire({
        title: window.langu("profile_delete_confirm_title"),
        text: window.langu("profile_delete_confirm_text"),
        showCancelButton: true,
        confirmButtonText: window.langu("profile_delete_yes"),
        cancelButtonText: window.langu("alert_cancel_btn"),
        buttonsStyling: false,
        customClass: {
            popup: 'swal-modern-mini-popup',
            title: 'swal-modern-mini-title',
            htmlContainer: 'swal-modern-mini-text',
            confirmButton: 'swal-modern-mini-confirm',
            cancelButton: 'swal-modern-mini-cancel'
        }
    });

    if (!confirmation.isConfirmed) return;

    const user = window.userSession;
    if (user.Password) {
        const password = await AuthUI.confirmPassword(
            window.langu("profile_delete_verify_title"),
            window.langu("profile_delete_verify_text")
        );
        if (!password) return;

        AuthUI.showLoading(window.langu("profile_verifying"));
        const verification = await verifyUserPassword(user.phone, password);
        AuthUI.close();

        if (!verification || verification.error) {
            AuthUI.showError(window.langu("alert_title_info"), window.langu("profile_invalid_password"));
            return;
        }
    }

    AuthUI.showLoading(window.langu("profile_deleting"));
    const result = await deleteUser(user.user_key);
    AuthUI.close();

    if (result && !result.error) {
        await SessionManager.logout();
        await Swal.fire(window.langu("profile_delete_success_title"), window.langu("profile_delete_success_text"), "success");
    } else {
        AuthUI.showError(window.langu("alert_title_info"), result?.error || window.langu("profile_delete_fail"));
    }
}
