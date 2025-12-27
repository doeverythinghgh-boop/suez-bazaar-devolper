/**
 * @file pages/profile-modal/profile-modal.js
 * @description Profile Management Module. Handles user profile updates (name, phone, address), password changes, and account deletion.
 * Follows SRP (Single Responsibility Principle) and SoC (Separation of Concerns).
 */

// Import Header as initial action (Must remain outside main function)
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
        locationIframe: document.getElementById("profile-location-iframe"),

        // Controls
        changePasswordCheckbox: document.getElementById("profile-change-password-checkbox"),
        passwordFieldsContainer: document.getElementById("profile-password-fields-container"),
        saveButton: document.getElementById("profile-save-button"),
        deleteButton: document.getElementById("profile-delete-account-button"),

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

        if (!user) return;

        if (els.usernameInput) els.usernameInput.value = user.username || "";
        if (els.phoneInput) els.phoneInput.value = user.phone || "";
        if (els.addressInput) els.addressInput.value = user.Address || user.address || "";

        // Reset password fields
        if (els.changePasswordCheckbox) els.changePasswordCheckbox.checked = false;
        if (els.passwordFieldsContainer) els.passwordFieldsContainer.style.display = "none";
        if (els.newPasswordInput) els.newPasswordInput.value = "";
        if (els.confirmPasswordInput) els.confirmPasswordInput.value = "";
        if (els.passwordErrorDiv) els.passwordErrorDiv.textContent = "";

        // Restore saved location
        let initialCoords = user.location || user.Location || user.Coordinates || user.coordinates || user.user_location || "";
        if (!initialCoords) initialCoords = localStorage.getItem("saved_location") || "";

        if (initialCoords && initialCoords.includes(",")) {
            if (els.coordsInput) els.coordsInput.value = initialCoords;

            // Update Iframe Source with coordinates
            if (els.locationIframe) {
                const [lat, lng] = initialCoords.split(",").map(c => c.trim());
                const timestamp = new Date().getTime();
                els.locationIframe.src = `location/LOCATION.html?lat=${lat}&lng=${lng}&embedded=true&hideSave=true&v=${timestamp}`;
            }

            if (els.addressError) {
                const addressInput = document.getElementById("profile-address");
                const hasDetails = addressInput && addressInput.value.trim() !== "";
                els.addressError.style.color = "#10b981";
                els.addressError.style.display = "block";

                if (hasDetails) {
                    els.addressError.innerHTML = '<i class="fas fa-check-circle"></i> تم ربط موقعك المحفوظ بنجاح!';
                } else {
                    els.addressError.innerHTML = '<i class="fas fa-check-circle"></i> تم العثور على موقعك المحفوظ.<br/>يرجى الآن كتابة وصف دقيق لحقيبة التوصيل.';
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
            if (!user.Password) {
                if (els.passwordFieldsContainer) els.passwordFieldsContainer.style.display = "block";
                profileIsPasswordVerified = true;
                return;
            }

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

    const nameValidation = AuthValidators.validateUsername(username);
    if (!nameValidation.isValid) {
        AuthUI.showFieldValidationMsg(els.usernameInput, nameValidation.message);
        result.isValid = false;
    }

    const phoneValidation = AuthValidators.validatePhone(phone);
    if (!phoneValidation.isValid) {
        AuthUI.showFieldValidationMsg(els.phoneInput, phoneValidation.message);
        result.isValid = false;
    }

    const hasCoords = !!(els.coordsInput?.value);
    const addressValidation = AuthValidators.validateAddress(address, hasCoords);
    if (!addressValidation.isValid) {
        AuthUI.showFieldValidationMsg(els.addressInput, addressValidation.message);
        result.isValid = false;
    }

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

    const updatedData = { user_key: user.user_key };
    if (username !== user.username) updatedData.username = username;
    if (phone !== user.phone) updatedData.phone = phone;

    const currentAddress = (user.Address || user.address || "").trim();
    if (address !== currentAddress) {
        console.log("[Profile] Address changed:", { old: currentAddress, new: address });
        updatedData.address = address;
    }

    // Capture location change with normalization
    const currentCoords = (user.location || user.Location || "").toString().trim().replace(/\s+/g, '');
    const newCoords = (els.coordsInput?.value || "").toString().trim().replace(/\s+/g, '');

    console.log("[Profile] Comparing coordinates:", { currentCoords, newCoords });

    if (newCoords && newCoords !== currentCoords) {
        console.log("[Profile] Location changed detected!");
        updatedData.location = newCoords.includes(',') ? newCoords.replace(',', ', ') : newCoords;
    }

    if (els.changePasswordCheckbox?.checked && password) {
        updatedData.password = password;
    }

    console.log("[Profile] Final Update Payload:", updatedData);

    if (Object.keys(updatedData).length === 1) {
        console.warn("[Profile] No changes detected in payload.");
        await AuthUI.showSuccess("لم يتغير شيء", "لم تقم بإجراء أي تغييرات.");
        return;
    }

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

        profileTogglePasswordVisibility("profile-new-password", "profile-toggle-new-password");
        profileTogglePasswordVisibility("profile-confirm-password", "profile-toggle-confirm-password-icon");

        if (els.changePasswordCheckbox) {
            els.changePasswordCheckbox.addEventListener("click", profileHandleChangePasswordCheck);
        }

        if (els.saveButton) {
            els.saveButton.addEventListener("click", profileHandleSaveChanges);
        }

        if (els.deleteButton) {
            els.deleteButton.addEventListener("click", (e) => {
                e.preventDefault();
                profileHandleAccountDeletion(window.userSession);
            });
        }

        // Embedded Map Message Listener
        const handleProfileMessage = (event) => {
            const mapStatus = document.getElementById("profile-map-status");
            const coordsInput = document.getElementById("profile-coords");

            if (event.data && event.data.type === 'LOCATION_SELECTED') {
                const coords = event.data.coordinates;
                console.log("[Profile] Received coordinates from map:", coords);
                if (coordsInput) coordsInput.value = coords;

                if (mapStatus) {
                    mapStatus.style.color = "#10b981";
                    mapStatus.innerHTML = '<i class="fas fa-check-circle"></i> تم ربط الموقع بنجاح! شكراً لك.';
                }
            } else if (event.data && event.data.type === 'LOCATION_RESET') {
                if (coordsInput) coordsInput.value = "";
                if (mapStatus) {
                    mapStatus.style.color = "";
                    mapStatus.innerHTML = "";
                }
            }
        };

        window.addEventListener('message', handleProfileMessage);

    } catch (error) {
        console.error("خطأ في تهيئة مستمعي الأحداث (profileSetupListeners):", error);
    }
}

// 5. Entry Point: Start Module
// ----------------------------------------------------
profileInitializeData();
profileSetupListeners();
