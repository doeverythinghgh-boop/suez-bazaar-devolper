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
const profileElements = {
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
let profileIsPasswordVerified = false;

// 2. Local Helper Functions
// ----------------------------------------------------

/**
 * @function profileShowError
 * @description Displays a specific error message in the error element corresponding to the input field.
 * @param {HTMLElement} inputElement - The input element where the error occurred.
 * @param {string} message - The error message to display.
 * @param {object} validationState - Object to track validation state (sets isValid to false).
 */
const profileShowError = (inputElement, message, validationState) => {
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
const profileClearErrors = () => {
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
const profileTogglePasswordVisibility = (inputId, toggleId) => {
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
    const validationState = { isValid: true };
    profileClearErrors();

    const username = profileElements.usernameInput.value.trim();
    const phone = profileElements.phoneInput.value.trim();
    const address = profileElements.addressInput.value.trim();
    const password = profileElements.newPasswordInput.value;
    const confirmPassword = profileElements.confirmPasswordInput.value;

    // Validate Name
    if (!username || username.length < 8) {
        profileShowError(profileElements.usernameInput, "الاسم مطلوب ويجب أن يكون 8 أحرف على الأقل.", validationState);
    }

    // Validate Phone
    if (!phone || phone.length < 11) {
        profileShowError(profileElements.phoneInput, "رقم الهاتف مطلوب ويجب أن يكون 11 رقمًا على الأقل.", validationState);
    }

    // Check password match if change option is selected
    if (profileElements.changePasswordCheckbox.checked && password !== confirmPassword) {
        profileShowError(profileElements.confirmPasswordInput, "كلمتا المرور غير متطابقتين.", validationState);
    }

    const data = { username, phone, address, password };
    return { isValid: validationState.isValid, data };
}

/**
 * @function profileHandleSaveChanges
 * @description Handles the save changes request. Validates inputs, verifies identity if needed, and updates user data via API.
 * @async
 */
async function profileHandleSaveChanges() {
    try {
        const validationResult = profileValidateInputs();
        if (!validationResult.isValid) return;

        const { username, phone, address, password } = validationResult.data;

        // 1. Prepare data for update
        const updatedData = { user_key: userSession.user_key };
        if (username !== userSession.username) updatedData.username = username;
        if (phone !== userSession.phone) updatedData.phone = phone;
        if (address !== (userSession.Address || "")) updatedData.address = address;
        if (profileElements.changePasswordCheckbox.checked && password) {
            updatedData.password = password;
        }

        // Check for no changes
        if (Object.keys(updatedData).length === 1) {
            await Swal.fire("لم يتغير شيء", "لم تقم بإجراء أي تغييرات على بياناتك.", "info");
            return;
        }

        // 2. Verify current password (if necessary)
        if (userSession.Password && !profileIsPasswordVerified) {
            const { isConfirmed } = await Swal.fire({
                title: "تأكيد الهوية",
                text: "لحفظ التغييرات، يرجى إدخال كلمة المرور الحالية.",
                input: "password",
                inputPlaceholder: "أدخل كلمة المرور الحالية",
                inputAttributes: { autocapitalize: "off", autocorrect: "off" },
                customClass: { popup: 'fullscreen-swal' }, // Apply cached custom style
                showCancelButton: true,
                confirmButtonText: "تأكيد وحفظ",
                cancelButtonText: "إلغاء",
                showLoaderOnConfirm: true,
                preConfirm: async (enteredPassword) => {
                    const verificationResult = await verifyUserPassword(userSession.phone, enteredPassword);
                    if (verificationResult && verificationResult.error) {
                        Swal.showValidationMessage(`كلمة المرور غير صحيحة.`);
                        return false;
                    }
                    return true; // Verification successful
                },
                allowOutsideClick: () => !Swal.isLoading(),
            });

            if (!isConfirmed) return; // User cancelled
        }

        // 3. Show loading screen and execute update
        Swal.fire({
            title: "جاري حفظ التغييرات...",
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
            customClass: { popup: 'fullscreen-swal' },
        });

        const result = await updateUser(updatedData);
        Swal.close();

        // 4. Handle update results
        if (result && !result.error) {
            profileUpdateSession(updatedData); // Update local session data

            await Swal.fire({
                icon: "success",
                title: "تم التحديث بنجاح!",
                text: result.message,
            });

            // Reload home page to update interface (Header)
        } else {
            await Swal.fire({
                icon: "error",
                title: "حدث خطأ",
                text: result.error || "فشل تحديث البيانات. يرجى المحاولة مرة أخرى.",
            });
        }
    } catch (error) {
        console.error("خطأ في حفظ التغييرات (profileHandleSaveChanges):", error);

    }
}

/**
 * @function profileUpdateSession
 * @description Updates the global `userSession` object and `localStorage` after a successful profile update.
 * @param {object} updatedData - The data that was successfully updated.
 */
function profileUpdateSession(updatedData) {
    try {
        if (updatedData.username) userSession.username = updatedData.username;
        if (updatedData.phone) userSession.phone = updatedData.phone;
        if (updatedData.address !== undefined) userSession.Address = updatedData.address;
        if (updatedData.password) userSession.Password = true;

        localStorage.setItem("loggedInUser", JSON.stringify(userSession));
    } catch (error) {
        console.error("خطأ في تحديث بيانات الجلسة (profileUpdateSession):", error);
    }
}

/**
 * @function profileHandleAccountDeletion
 * @description Handles the secure account deletion process, including confirmation prompts and password verification.
 * @async
 * @param {object} userSession - Object containing the current user's session data.
 * @returns {Promise<void>}
 */
async function profileHandleAccountDeletion(userSession) {
    try {
        // 1. Initial Deletion Confirmation
        const confirmationResult = await Swal.fire({
            title: "هل أنت متأكد تمامًا؟",
            html: `<div style="text-align: right; color: #e74c3c; font-weight: bold;">
                سيتم حذف حسابك وجميع بياناتك نهائيًا. <br> هذا الإجراء لا يمكن التراجع عنه.
            </div>`,
            icon: "warning",
            customClass: { popup: 'fullscreen-swal' },
            showCancelButton: true,
            confirmButtonText: "نعم، أفهم وأريد المتابعة",
            cancelButtonText: "إلغاء",
            confirmButtonColor: "#d33",
        });

        if (!confirmationResult.isConfirmed) return;

        let canDelete = !userSession.Password;

        // 2. Final verification with password if exists
        if (userSession.Password) {
            const { value: password } = await Swal.fire({
                title: "التحقق النهائي",
                text: "لحماية حسابك، يرجى إدخال كلمة المرور الخاصة بك لتأكيد الحذف.",
                input: "password",
                inputPlaceholder: "أدخل كلمة المرور",
                customClass: { popup: 'fullscreen-swal' },
                showCancelButton: true,
                confirmButtonText: "تأكيد الحذف",
                cancelButtonText: "إلغاء",
                showLoaderOnConfirm: true,
                preConfirm: async (enteredPassword) => {
                    const verificationResult = await verifyUserPassword(userSession.phone, enteredPassword);
                    if (verificationResult && verificationResult.error) {
                        Swal.showValidationMessage("كلمة المرور غير صحيحة.");
                        return false;
                    }
                    return true;
                },
                allowOutsideClick: () => !Swal.isLoading(),
            });

            if (password) {
                canDelete = true;
            }
        }

        // 3. Execute Deletion
        if (canDelete) {
            Swal.fire({
                title: "جاري حذف الحساب...",
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading(),
                customClass: { popup: 'fullscreen-swal' },
            });

            const deleteResult = await deleteUser(userSession.user_key);

            if (deleteResult && !deleteResult.error) {
                await signOutAndClear();
                await Swal.fire("تم الحذف", "تم حذف حسابك بنجاح.", "success");
            } else {
                await Swal.fire("خطأ", `فشل حذف الحساب: ${deleteResult.error || "خطأ غير معروف."}`, "error");
            }
        }
    } catch (error) {
        console.error("خطأ في حذف الحساب (profileHandleAccountDeletion):", error);

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
