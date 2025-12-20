/**
 * @file pages/profile-modal/profile-modal.js
 * @description Profile Management Module. Handles user profile updates (name, phone, address), password changes, and account deletion.
 * Follows SRP (Single Responsibility Principle) and SoC (Separation of Concerns).
 */

// Import Header as initial action (Must remain outside main function)
// Container ID changed to "profile-header-container"
insertUniqueSnapshot("pages/header.html", "profile-header-container", 300);

// 1. Define Elements and Variables (DOM Elements & State)
// ----------------------------------------------------
/**
 * @function profileGetElements
 * @description Safely retrieves DOM elements for the profile module.
 */
function profileGetElements() {
    return {
        // Input Fields
        usernameInput: document.getElementById("profile-username"),
        phoneInput: document.getElementById("profile-phone"),
        addressInput: document.getElementById("profile-address"),
        newPasswordInput: document.getElementById("profile-new-password"),
        confirmPasswordInput: document.getElementById("profile-confirm-password"),
        coordsInput: document.getElementById("profile-coords"),

        // Controls
        changePasswordCheckbox: document.getElementById("profile-change-password-checkbox"),
        passwordFieldsContainer: document.getElementById("profile-password-fields-container"),
        saveButton: document.getElementById("profile-save-button"),
        deleteButton: document.getElementById("profile-delete-account-button"),
        locationBtn: document.getElementById("profile-location-btn"),

        // Feedback
        passwordErrorDiv: document.getElementById("profile-password-error"),
        addressError: document.getElementById("profile-address-error")
    };
}

// State to track if old password was successfully verified (to reduce Swal.fire repetition)
var profileIsPasswordVerified = false;

// 2. Local Helper Functions
// ----------------------------------------------------

/**
 * @function profileShowError
 * @description Displays a specific error message in the error element corresponding to the input field.
 * @param {HTMLElement} inputElement - The input element where the error occurred.
 * @param {string} message - The error message to display.
 * @param {object} validationState - Object to track validation state (sets isValid to false).
 */
var profileShowError = (inputElement, message, validationState) => {
    try {
        const errorDiv = document.getElementById(`${inputElement.id}-error`);
        if (errorDiv) errorDiv.textContent = message;
        validationState.isValid = false;
    } catch (error) {
        console.error("خطأ في عرض رسالة الخطأ (profileShowError):", error);
    }
};

/**
 * @function profileClearErrors
 * @description Clears all error messages from the form fields.
 */
var profileClearErrors = () => {
    try {
        document.querySelectorAll(".profile-error-message")
            .forEach((el) => (el.textContent = ""));
    } catch (error) {
        console.error("خطأ في حذف رسائل الخطأ (profileClearErrors):", error);
    }
};

/**
 * @function profileTogglePasswordVisibility
 * @description Toggles the visibility of the password field and updates the accompanying icon.
 * @param {string} inputId - The ID of the input field.
 * @param {string} toggleId - The ID of the toggle icon.
 */
var profileTogglePasswordVisibility = (inputId, toggleId) => {
    try {
        const input = document.getElementById(inputId);
        const toggleIcon = document.getElementById(toggleId);
        if (!input || !toggleIcon) return;

        toggleIcon.addEventListener("click", () => {
            const isPassword = input.type === "password";
            input.type = isPassword ? "text" : "password";
            toggleIcon.classList.toggle("fa-eye");
            toggleIcon.classList.toggle("fa-eye-slash");
        });
    } catch (error) {
        console.error(`خطأ في تبديل ظهور كلمة المرور لـ ${inputId}:`, error);
    }
};

// ----------------------------------------------------
// 3. Core Handler Functions
// ----------------------------------------------------

/**
 * @function profileInitializeData
 * @description Initializes the form fields with data from the current user session when the modal/page loads.
 */
function profileInitializeData() {
    try {
        const els = profileGetElements();
        const user = window.userSession;

        console.log("[Profile] Initializing data. Session:", user);
        console.log("[Profile] Elements found:", !!els.usernameInput, !!els.locationBtn, !!els.coordsInput);

        if (!user) {
            console.warn("[Profile] No active session found.");
            return;
        }

        if (els.usernameInput) els.usernameInput.value = user.username || "";
        if (els.phoneInput) els.phoneInput.value = user.phone || "";

        // Handle both casing possibilities for address
        if (els.addressInput) {
            els.addressInput.value = user.Address || user.address || "";
        }

        // Reset password fields
        if (els.changePasswordCheckbox) els.changePasswordCheckbox.checked = false;
        if (els.passwordFieldsContainer) els.passwordFieldsContainer.style.display = "none";
        if (els.newPasswordInput) els.newPasswordInput.value = "";
        if (els.confirmPasswordInput) els.confirmPasswordInput.value = "";
        if (els.passwordErrorDiv) els.passwordErrorDiv.textContent = "";

        // Restore saved location
        // Search in all possible property names to be safe
        console.log("[Profile] Available session keys:", Object.keys(user));
        let initialCoords = user.location || user.Coordinates || user.coordinates || user.user_location || "";
        console.log("[Profile] Raw extracted coordinates:", initialCoords);

        // Final fallback: check direct localStorage for very old sessions if needed
        if (!initialCoords) {
            initialCoords = localStorage.getItem("saved_location") || "";
        }

        if (initialCoords && initialCoords.includes(",")) {
            if (els.coordsInput) els.coordsInput.value = initialCoords;
            if (els.locationBtn) els.locationBtn.classList.add("is-success");

            if (els.addressError) {
                els.addressError.style.color = "#10b981";
                els.addressError.style.display = "block";

                const addressInput = document.getElementById("profile-address");
                const hasDetails = addressInput && addressInput.value.trim() !== "";
                if (hasDetails) {
                    els.addressError.innerHTML = '<i class="fas fa-check-circle"></i> تم ربط موقعك المحفوظ بنجاح!';
                } else {
                    els.addressError.innerHTML = '<i class="fas fa-check-circle"></i> تم العثور على موقعك المحفوظ.<br/>يرجى الآن كتابة وصف دقيق (مثلاً: الدور أو علامة مميزة) أعلاه.';
                }
            }
        }
    } catch (error) {
        console.error("خطأ في تهيئة بيانات الملف الشخصي:", error);
    }
}

/**
 * @function profileHandleChangePasswordCheck
 * @description Handles the "Change Password" checkbox interaction. Verifies the identity before showing fields.
 * @async
 */
async function profileHandleChangePasswordCheck() {
    try {
        const els = profileGetElements();
        const user = window.userSession;
        if (!els.changePasswordCheckbox || !user) return;

        if (els.changePasswordCheckbox.checked) {
            // If user has NO password set, just show fields
            if (!user.Password) {
                if (els.passwordFieldsContainer) els.passwordFieldsContainer.style.display = "block";
                profileIsPasswordVerified = true;
                return;
            }

            // Verify identity
            const passwordEntered = await AuthUI.confirmPassword("تأكيد الهوية", "يرجى إدخال كلمة المرور الحالية لتغييرها.");
            if (passwordEntered) {
                AuthUI.showLoading("جاري التحقق...");
                const result = await verifyUserPassword(user.phone, passwordEntered);
                AuthUI.close();

                if (result && !result.error) {
                    if (els.passwordFieldsContainer) els.passwordFieldsContainer.style.display = "block";
                    profileIsPasswordVerified = true;
                } else {
                    els.changePasswordCheckbox.checked = false;
                    AuthUI.showError("خطأ", "كلمة المرور غير صحيحة.");
                }
            } else {
                els.changePasswordCheckbox.checked = false;
            }
        } else {
            if (els.passwordFieldsContainer) els.passwordFieldsContainer.style.display = "none";
            profileIsPasswordVerified = false;
        }
    } catch (error) {
        console.error("خطأ في معالج تغيير كلمة المرور:", error);
    }
}

/**
 * @function profileValidateInputs
 * @description Validates the form inputs before submission.
 * @returns {{isValid: boolean, data: object}} - An object containing the validity status and the extracted form data.
 */
function profileValidateInputs() {
    const els = profileGetElements();
    const result = { isValid: true, data: {} };

    // Use AuthUI to clear errors
    if (els.usernameInput) AuthUI.clearFieldValidationMsg(els.usernameInput);
    if (els.phoneInput) AuthUI.clearFieldValidationMsg(els.phoneInput);
    if (els.newPasswordInput) AuthUI.clearFieldValidationMsg(els.newPasswordInput);
    if (els.confirmPasswordInput) AuthUI.clearFieldValidationMsg(els.confirmPasswordInput);
    if (els.addressInput) AuthUI.clearFieldValidationMsg(els.addressInput);

    const username = els.usernameInput?.value.trim() || "";
    const phone = els.phoneInput?.value.trim() || "";
    const address = els.addressInput?.value.trim() || "";
    const password = els.newPasswordInput?.value || "";
    const confirmPassword = els.confirmPasswordInput?.value || "";

    // Validate Name
    const nameValidation = AuthValidators.validateUsername(username);
    if (!nameValidation.isValid) {
        AuthUI.showFieldValidationMsg(els.usernameInput, nameValidation.message);
        result.isValid = false;
    }

    // Validate Phone
    const phoneValidation = AuthValidators.validatePhone(phone);
    if (!phoneValidation.isValid) {
        AuthUI.showFieldValidationMsg(els.phoneInput, phoneValidation.message);
        result.isValid = false;
    }

    // Validate Address
    const hasCoords = !!(els.coordsInput?.value);
    const addressValidation = AuthValidators.validateAddress(address, hasCoords);
    if (!addressValidation.isValid) {
        AuthUI.showFieldValidationMsg(els.addressInput, addressValidation.message);
        result.isValid = false;
    }

    // Password validation if checkbox checked
    if (els.changePasswordCheckbox?.checked) {
        const passValidation = AuthValidators.validatePassword(password);
        if (!passValidation.isValid) {
            AuthUI.showFieldValidationMsg(els.newPasswordInput, passValidation.message);
            result.isValid = false;
        }
        if (password !== confirmPassword) {
            AuthUI.showFieldValidationMsg(els.confirmPasswordInput, "كلمتا المرور غير متطابقتين.");
            result.isValid = false;
        }
    }

    result.data = { username, phone, address, password };
    return result;
}

/**
 * @function profileHandleSaveChanges
 * @description Handles the save changes request. Validates inputs, verifies identity if needed, and updates user data via API.
 * @async
 */
async function profileHandleSaveChanges() {
    const els = profileGetElements();
    const validationResult = profileValidateInputs();
    if (!validationResult.isValid) return;

    const { username, phone, address, password } = validationResult.data;

    const user = window.userSession;
    if (!user) return;

    // 1. Prepare data
    const updatedData = { user_key: user.user_key };
    if (username !== user.username) updatedData.username = username;
    if (phone !== user.phone) updatedData.phone = phone;

    // Check against both casings to avoid redundant updates
    const currentAddress = user.Address || user.address || "";
    if (address !== currentAddress) {
        // We use 'address' for payload but SessionManager should merge correctly
        updatedData.address = address;
    }

    if (els.coordsInput && els.coordsInput.value) {
        updatedData.location = els.coordsInput.value;
    }

    if (els.changePasswordCheckbox?.checked && password) {
        updatedData.password = password;
    }

    if (Object.keys(updatedData).length === 1) {
        await AuthUI.showSuccess("لم يتغير شيء", "لم تقم بإجراء أي تغييرات.");
        return;
    }

    // 2. Verify current password logic (using AuthUI)
    const sessionAuth = window.userSession;
    if (sessionAuth.Password && !profileIsPasswordVerified) {
        const passwordEntered = await AuthUI.confirmPassword("تأكيد الهوية", "أدخل كلمة المرور الحالية لحفظ التغييرات.");
        if (!passwordEntered) return;

        AuthUI.showLoading("جاري التحقق...");
        const verification = await verifyUserPassword(sessionAuth.phone, passwordEntered);
        AuthUI.close();

        if (!verification || verification.error) {
            AuthUI.showError("خطأ", "كلمة المرور غير صحيحة.");
            return;
        }
    }

    // 3. Save
    AuthUI.showLoading("جاري الحفظ...");
    const result = await updateUser(updatedData);
    AuthUI.close();

    if (result && !result.error) {
        SessionManager.updateUser(updatedData);
        await AuthUI.showSuccess("تم التحديث بنجاح!", result.message);
        mainLoader("pages/user-dashboard.html", "index-user-container", 0, undefined, "showHomeIcon", true);
    } else {
        AuthUI.showError("خطأ", result?.error || "فشل التحديث.");
    }
}

/**
 * @function profileUpdateSession
 * @description Updates the global `window.userSession` object and `localStorage` after a successful profile update.
 * @param {object} updatedData - The data that was successfully updated.
 */
function profileUpdateSession(updatedData) {
    SessionManager.updateUser(updatedData);
}

/**
 * @function profileHandleAccountDeletion
 * @description Handles the secure account deletion process, including confirmation prompts and password verification.
 * @async
 * @param {object} session - Object containing the current user's session data.
 * @returns {Promise<void>}
 */
async function profileHandleAccountDeletion(session) {
    const confirmation = await Swal.fire({
        title: "هل أنت متأكد تمامًا؟",
        text: "سيتم حذف حسابك نهائياً.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "نعم، حذف",
        cancelButtonText: "إلغاء",
        confirmButtonColor: "#d33"
    });

    if (!confirmation.isConfirmed) return;

    // Verify Password
    if (window.userSession.Password) {
        const password = await AuthUI.confirmPassword("تأكيد الحذف", "أدخل كلمة المرور لتأكيد الحذف.");
        if (!password) return;

        AuthUI.showLoading("جاري التحقق...");
        const verification = await verifyUserPassword(window.userSession.phone, password);
        AuthUI.close();

        if (!verification || verification.error) {
            AuthUI.showError("خطأ", "كلمة المرور غير صحيحة.");
            return;
        }
    }

    AuthUI.showLoading("جاري الحذف...");
    const result = await deleteUser(window.userSession.user_key);
    AuthUI.close();

    if (result && !result.error) {
        await SessionManager.logout();
        await Swal.fire("تم الحذف", "تم حذف الحساب بنجاح.", "success");
    } else {
        AuthUI.showError("خطأ", result?.error || "حدث خطأ أثناء الحذف.");
    }
}


// 4. Event Listeners
// ----------------------------------------------------

/**
 * @function profileSetupListeners
 * @description Initializes all event listeners for the profile module elements.
 */
function profileSetupListeners() {
    try {
        const els = profileGetElements();

        // 1. Initialize Password Visibility
        profileTogglePasswordVisibility("profile-new-password", "profile-toggle-new-password");
        profileTogglePasswordVisibility("profile-confirm-password", "profile-toggle-confirm-password-icon");

        // 2. Change Password Option Handler
        if (els.changePasswordCheckbox) {
            els.changePasswordCheckbox.addEventListener("click", profileHandleChangePasswordCheck);
        }

        // 3. Save Button Handler
        if (els.saveButton) {
            els.saveButton.addEventListener("click", profileHandleSaveChanges);
        }

        // 4. Delete Account Button Handler
        if (els.deleteButton) {
            els.deleteButton.addEventListener("click", (e) => {
                e.preventDefault();
                profileHandleAccountDeletion(window.userSession);
            });
        }

        // Location Picker Support
        if (els.locationBtn) {
            els.locationBtn.addEventListener("click", () => {
                const existingCoords = els.coordsInput?.value || "";
                let iframeSrc = "location/LOCATION.html";

                if (existingCoords && existingCoords.includes(",")) {
                    const coords = existingCoords.split(",").map(c => c.trim());
                    if (coords.length === 2) {
                        iframeSrc += `?lat=${coords[0]}&lng=${coords[1]}`;
                    }
                }

                Swal.fire({
                    html: `
                              <div style="width: 100%; height: 500px; overflow: hidden; border-radius: 15px;">
                                <iframe 
                                  src="${iframeSrc}" 
                          style="width: 100%; height: 100%; border: none;"
                          id="profile_location-iframe"
                        ></iframe>
                      </div>
                    `,
                    showConfirmButton: false,
                    showCloseButton: false,
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    padding: '0px',
                    customClass: { popup: 'fullscreen-swal' },
                    didOpen: () => {
                        const handleProfileMessage = (event) => {
                            const locationBtn = document.getElementById("profile-location-btn");
                            const addressError = document.getElementById("profile-address-error");
                            const profile_coordsInput = document.getElementById("profile-coords");

                            if (event.data && event.data.type === 'LOCATION_SELECTED') {
                                const coords = event.data.coordinates;
                                if (profile_coordsInput) profile_coordsInput.value = coords;

                                // UX Improvement: Show success state and update hint
                                if (locationBtn) locationBtn.classList.add("is-success");
                                if (addressError) {
                                    const addressInput = document.getElementById("profile-address");
                                    addressError.style.color = "#10b981";
                                    addressError.style.display = "block";

                                    if (addressInput && addressInput.value.trim() !== "") {
                                        // Specific address already exists, just show success icon/msg
                                        addressError.innerHTML = '<i class="fas fa-check-circle"></i> تم ربط الموقع بنجاح!';
                                    } else {
                                        // Address empty, show reminder
                                        addressError.innerHTML = '<i class="fas fa-check-circle"></i> شكراً لك على تحديد موقعك بدقة!<br/>يرجى الآن كتابة وصف دقيق (مثلاً: الدور أو علامة مميزة) أعلاه.';
                                    }
                                }
                            } else if (event.data && event.data.type === 'LOCATION_RESET') {
                                if (profile_coordsInput) profile_coordsInput.value = "";
                                if (locationBtn) locationBtn.classList.remove("is-success");
                                if (addressError) {
                                    addressError.style.color = "";
                                    addressError.innerHTML = "أسرع للتوصيل: اختيار موقعك من الخريطة يضمن وصول المندوب إليك بسرعة فائقة.";
                                }
                            } else if (event.data && event.data.type === 'CLOSE_LOCATION_MODAL') {
                                Swal.close();
                                window.removeEventListener('message', handleProfileMessage);
                            }
                        };
                        window.addEventListener('message', handleProfileMessage);
                    }
                });
            });
        }
    } catch (error) {
        console.error("خطأ في تهيئة مستمعي الأحداث (profileSetupListeners):", error);
    }
}

// ----------------------------------------------------
// 5. Entry Point: Start Module
// ----------------------------------------------------
profileInitializeData();
profileSetupListeners();
