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
var profileElements = {
    // Input Fields
    usernameInput: document.getElementById("profile-username"),
    phoneInput: document.getElementById("profile-phone"),
    addressInput: document.getElementById("profile-address"),
    newPasswordInput: document.getElementById("profile-new-password"),
    confirmPasswordInput: document.getElementById("profile-confirm-password"),

    // Controls
    changePasswordCheckbox: document.getElementById("profile-change-password-checkbox"),
    passwordFieldsContainer: document.getElementById("profile-password-fields-container"),
    saveButton: document.getElementById("profile-save-button"),
    deleteButton: document.getElementById("profile-delete-account-button"),

    // Errors
    passwordErrorDiv: document.getElementById("profile-password-error"),
};

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
        profileElements.usernameInput.value = userSession.username || "";
        profileElements.phoneInput.value = userSession.phone || "";
        // userSession.Address changed to userSession.address to standardize casing if needed 
        profileElements.addressInput.value = userSession.Address || "";

        // Reset password fields state (OCP: Open Closed Principle)
        profileElements.changePasswordCheckbox.checked = false;
        profileElements.passwordFieldsContainer.style.display = "none";
        profileElements.newPasswordInput.value = "";
        profileElements.confirmPasswordInput.value = "";
        profileElements.passwordErrorDiv.textContent = "";

        profileIsPasswordVerified = false; // Reset verification state
    } catch (error) {
        console.error("خطأ في تهيئة بيانات الملف الشخصي (profileInitializeData):", error);
    }
}

/**
 * @function profileHandleChangePasswordCheck
 * @description Handles the "Change Password" checkbox interaction. Verifies the old password before allowing the user to proceed with changing it.
 * @async
 * @param {Event} event - The click event on the checkbox.
 */
async function profileHandleChangePasswordCheck(event) {
    try {
        if (!event.target.checked) {
            profileElements.passwordFieldsContainer.style.display = "none";
            return;
        }

        event.preventDefault(); // Prevent immediate selection to trigger verification logic

        // If user has no password (e.g. external login), allow change immediately
        if (!userSession.Password) {
            profileElements.changePasswordCheckbox.checked = true;
            profileElements.passwordFieldsContainer.style.display = "block";
            return;
        }

        // SweetAlert2 for verifying old password
        const { isConfirmed } = await Swal.fire({
            title: "التحقق من الهوية",
            text: "لتغيير كلمة المرور، الرجاء إدخال كلمة المرور القديمة أولاً.",
            input: "password",
            inputPlaceholder: "أدخل كلمة المرور القديمة",
            inputAttributes: { autocapitalize: "off", autocorrect: "off" },
            customClass: { popup: 'fullscreen-swal' }, // Apply cached custom style
            showCancelButton: true,
            confirmButtonText: "تحقق",
            cancelButtonText: "إلغاء",
            showLoaderOnConfirm: true,
            preConfirm: async (enteredOldPassword) => {
                if (!enteredOldPassword) {
                    Swal.showValidationMessage("يجب إدخال كلمة المرور القديمة.");
                    return false;
                }
                const verificationResult = await verifyUserPassword(
                    userSession.phone,
                    enteredOldPassword
                );
                if (verificationResult && verificationResult.error) {
                    Swal.showValidationMessage(`كلمة المرور القديمة غير صحيحة.`);
                    return false;
                }
                return true;
            },
            allowOutsideClick: () => !Swal.isLoading(),
        });

        if (isConfirmed) {
            profileElements.changePasswordCheckbox.checked = true;
            profileElements.passwordFieldsContainer.style.display = "block";
            profileIsPasswordVerified = true; // Verified successfully
        }
    } catch (error) {
        console.error("خطأ في التحقق من كلمة المرور (profileHandleChangePasswordCheck):", error);

    }
}

/**
 * @function profileValidateInputs
 * @description Validates the form inputs before submission.
 * @returns {{isValid: boolean, data: object}} - An object containing the validity status and the extracted form data.
 */
function profileValidateInputs() {
    const result = { isValid: true, data: {} };

    // Use AuthUI to clear errors
    AuthUI.clearFieldValidationMsg(profileElements.usernameInput);
    AuthUI.clearFieldValidationMsg(profileElements.phoneInput);
    AuthUI.clearFieldValidationMsg(profileElements.newPasswordInput);
    AuthUI.clearFieldValidationMsg(profileElements.confirmPasswordInput);

    const username = profileElements.usernameInput.value.trim();
    const phone = profileElements.phoneInput.value.trim();
    const address = profileElements.addressInput.value.trim();
    const password = profileElements.newPasswordInput.value;
    const confirmPassword = profileElements.confirmPasswordInput.value;

    // Validate Name
    const nameValidation = AuthValidators.validateUsername(username);
    if (!nameValidation.isValid) {
        AuthUI.showFieldValidationMsg(profileElements.usernameInput, nameValidation.message);
        result.isValid = false;
    }

    // Validate Phone
    const phoneValidation = AuthValidators.validatePhone(phone);
    if (!phoneValidation.isValid) {
        AuthUI.showFieldValidationMsg(profileElements.phoneInput, phoneValidation.message);
        result.isValid = false;
    }

    // Password validation if checkbox checked
    if (profileElements.changePasswordCheckbox.checked) {
        const passValidation = AuthValidators.validatePassword(password);
        if (!passValidation.isValid) {
            AuthUI.showFieldValidationMsg(profileElements.newPasswordInput, passValidation.message);
            result.isValid = false;
        }
        if (password !== confirmPassword) {
            AuthUI.showFieldValidationMsg(profileElements.confirmPasswordInput, "كلمتا المرور غير متطابقتين.");
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
    const validationResult = profileValidateInputs();
    if (!validationResult.isValid) return;

    const { username, phone, address, password } = validationResult.data;

    // 1. Prepare data
    const updatedData = { user_key: userSession.user_key };
    if (username !== userSession.username) updatedData.username = username;
    if (phone !== userSession.phone) updatedData.phone = phone;
    if (address !== (userSession.Address || "")) updatedData.address = address;
    if (profileElements.changePasswordCheckbox.checked && password) {
        updatedData.password = password;
    }

    if (Object.keys(updatedData).length === 1) {
        await AuthUI.showSuccess("لم يتغير شيء", "لم تقم بإجراء أي تغييرات.");
        return;
    }

    // 2. Verify current password logic (using AuthUI)
    if (userSession.Password && !profileIsPasswordVerified) {
        const passwordEntered = await AuthUI.confirmPassword("تأكيد الهوية", "أدخل كلمة المرور الحالية لحفظ التغييرات.");
        if (!passwordEntered) return;

        AuthUI.showLoading("جاري التحقق...");
        const verification = await verifyUserPassword(userSession.phone, passwordEntered);
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
        // Reload page if needed or just modal closed? 
        // Original code reloaded mainLoader or similar? No, just success msg.
        // We can optionally refresh header or just let SessionManager update global vars.
    } else {
        AuthUI.showError("خطأ", result?.error || "فشل التحديث.");
    }
}

/**
 * @function profileUpdateSession
 * @description Updates the global `userSession` object and `localStorage` after a successful profile update.
 * @param {object} updatedData - The data that was successfully updated.
 */
function profileUpdateSession(updatedData) {
    SessionManager.updateUser(updatedData);
}

/**
 * @function profileHandleAccountDeletion
 * @description Handles the secure account deletion process, including confirmation prompts and password verification.
 * @async
 * @param {object} userSession - Object containing the current user's session data.
 * @returns {Promise<void>}
 */
async function profileHandleAccountDeletion(userSession) {
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
    if (userSession.Password) {
        const password = await AuthUI.confirmPassword("تأكيد الحذف", "أدخل كلمة المرور لتأكيد الحذف.");
        if (!password) return;

        AuthUI.showLoading("جاري التحقق...");
        const verification = await verifyUserPassword(userSession.phone, password);
        AuthUI.close();

        if (!verification || verification.error) {
            AuthUI.showError("خطأ", "كلمة المرور غير صحيحة.");
            return;
        }
    }

    AuthUI.showLoading("جاري الحذف...");
    const result = await deleteUser(userSession.user_key);
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
        // 1. Initialize Password Visibility
        profileTogglePasswordVisibility("profile-new-password", "profile-toggle-new-password");
        profileTogglePasswordVisibility("profile-confirm-password", "profile-toggle-confirm-password-icon");

        // 2. Change Password Option Handler
        profileElements.changePasswordCheckbox.addEventListener("click", profileHandleChangePasswordCheck);

        // 3. Save Button Handler
        profileElements.saveButton.addEventListener("click", profileHandleSaveChanges);

        // 4. Delete Account Button Handler
        profileElements.deleteButton.addEventListener("click", (e) => {
            e.preventDefault();
            profileHandleAccountDeletion(userSession);
        });
    } catch (error) {
        console.error("خطأ في تهيئة مستمعي الأحداث (profileSetupListeners):", error);
    }
}

// ----------------------------------------------------
// 5. Entry Point: Start Module
// ----------------------------------------------------
profileInitializeData();
profileSetupListeners();
