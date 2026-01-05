/**
 * @file pages/profile-modal/js/profile-validation.js
 * @description Input validation logic for the profile form.
 */

/**
 * Validates all profile form inputs before submission.
 * @returns {Object} An object containing the validity status and the normalized form data.
 */
function profileValidateInputs() {
    const els = profileGetElements();
    const result = { isValid: true, data: {} };

    // Clear previous validation messages
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

    // Validate Username
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

    // Validate Location/Address
    const hasCoords = !!(els.coordsInput?.value);
    const addressValidation = AuthValidators.validateAddress(address, hasCoords);
    if (!addressValidation.isValid) {
        AuthUI.showFieldValidationMsg(els.addressInput, addressValidation.message);
        result.isValid = false;
    }

    // Optional Password Validation
    if (els.changePasswordCheckbox?.checked) {
        const passValidation = AuthValidators.validatePassword(password);
        if (!passValidation.isValid) {
            AuthUI.showFieldValidationMsg(els.newPasswordInput, passValidation.message);
            result.isValid = false;
        }
        if (password !== confirmPassword) {
            AuthUI.showFieldValidationMsg(els.confirmPasswordInput, window.langu("profile_passwords_mismatch"));
            result.isValid = false;
        }
    }

    result.data = { username, phone, address, password };
    return result;
}
