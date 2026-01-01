/**
 * @file pages/login/login.js
 * @description Handles user login functionality, including form validation, authentication via API, and guest login access.
 */

/**
 * @function loadPage
 * @description Main initialization function for the login page. Checks user session status and displays the login form only if the user is not logged in. Binds event handlers.
 * @async
 * @param {object} [params] - Optional parameters passed from the previous page.
 * @returns {Promise<void>}
 */
async function loadPage(params) {
    try {
        // Use SessionManager to get the latest state
        userSession = SessionManager.getUser();

        // Check if a user is already logged in.
        if (userSession) {
            // Attempt to initialize notifications for the current user if logged in.
            if (typeof mainLoader === "function") {
                mainLoader(
                    "pages/user-dashboard.html",
                    "index-user-container",
                    0,
                    undefined,
                    "showHomeIcon",
                    true
                );
            }
            // Stop execution to allow for redirection
            return;
        }

        // Show login form only if no user is logged in.
        const loginFormWrapper = document.getElementById("login_form-wrapper");
        if (loginFormWrapper) {
            // Use 'flex' as it matches the CSS.
            loginFormWrapper.style.display = "flex";
        }

        // Setup login form.
        login_setupLoginForm();

    } catch (error) {
        console.error("🚫 خطأ في دالة loadPage:", error);
        // Show generic error to user using SweetAlert2.

    }
}

/**
 * @function login_setupLoginForm
 * @description Sets up all event listeners for the login form.
 * Includes: password visibility toggle, phone number sanitization, and submit event handler.
 * @returns {void}
 */
function login_setupLoginForm() {
    try {
        // Get form elements
        const loginForm = document.getElementById("login_form");
        if (!loginForm) return;

        const loginPhoneInput = document.getElementById("login_phone");
        const loginPasswordInput = document.getElementById("login_password");
        const loginTogglePassword = document.getElementById("login_togglePassword");
        const loginGuestBtn = document.getElementById("login_guest-btn");

        // 1. Add password visibility toggle functionality
        if (loginTogglePassword && loginPasswordInput) {
            loginTogglePassword.addEventListener("click", function () {
                // Toggle input type
                const type =
                    loginPasswordInput.getAttribute("type") === "password" ? "text" : "password";
                loginPasswordInput.setAttribute("type", type);
                // Toggle eye icon
                this.classList.toggle("fa-eye");
                this.classList.toggle("fa-eye-slash");
            });
        }

        // 2. Input event handler for phone number (sanitization)
        if (loginPhoneInput) {
            loginPhoneInput.addEventListener("input", function (e) {
                // Use `normalizeDigits` to convert Indic digits (e.g. '٠١٢') to Arabic numerals ('012').
                const normalized = normalizeDigits(e.target.value);
                // Remove any non-numeric characters.
                e.target.value = normalized.replace(/[^0-9]/g, "");
            });
        }

        // 3. Login form submit handler
        loginForm.addEventListener("submit", login_handleSubmit);

        // 4. Bind "Login as Guest" button event.
        if (loginGuestBtn) {
            loginGuestBtn.addEventListener("click", login_handleGuestLogin);
        }

        // 5. Bind "Register Now" link event.
        const registerLink = document.getElementById("login_go-to-register-link");
        if (registerLink) {
            registerLink.addEventListener("click", login_handleRegisterClick);
        }

    } catch (error) {
        console.error("🚫 خطأ في دالة login_setupLoginForm:", error);
    }
}

/**
 * @function login_handleRegisterClick
 * @description Handles the click event on the "Register Now" link.
 * @param {Event} e - The event object.
 */
function login_handleRegisterClick(e) {
    e.preventDefault();
    mainLoader("./pages/register/register.html", "index-user-container", 0, undefined, "hiddenLoginIcon", true);
}


/**
 * @function login_handleSubmit
 * @description Handles the login form submission. Validates inputs and communicates with the backend to verify credentials.
 * @async
 * @param {Event} e - The submit event object.
 * @returns {Promise<void>}
 */
async function login_handleSubmit(e) {
    try {
        console.log(
            "%c[صفحة تسجيل الدخول] تم النقر على زر تسجيل الدخول.",
            "color: blue; font-weight: bold;"
        );
        // Prevent default form submission.
        e.preventDefault();

        const loginPhoneInput = document.getElementById("login_phone");
        const loginPasswordInput = document.getElementById("login_password");

        // 1. Get values
        const phoneValue = loginPhoneInput.value.trim();
        const passwordValue = loginPasswordInput.value.trim();

        // 2. Clear previous errors.
        if (typeof clearError === "function") {
            clearError(loginPhoneInput);
            clearError(loginPasswordInput);
        }

        // 3. Validation
        let loginIsValid = true;
        AuthUI.clearFieldValidationMsg(loginPhoneInput);
        AuthUI.clearFieldValidationMsg(loginPasswordInput);

        // Validate Phone using AuthValidators
        const normalizedPhone = AuthValidators.normalizePhone(phoneValue);
        const phoneValidation = AuthValidators.validatePhone(normalizedPhone);
        if (!phoneValidation.isValid) {
            AuthUI.showFieldValidationMsg(loginPhoneInput, phoneValidation.message);
            loginIsValid = false;
        }

        // Validate Password using AuthValidators
        const passwordValidation = AuthValidators.validatePassword(passwordValue);
        if (!passwordValidation.isValid) {
            AuthUI.showFieldValidationMsg(loginPasswordInput, passwordValidation.message);
            loginIsValid = false;
        }

        if (loginIsValid) {
            // 4. Show Loading
            AuthUI.showLoading("جاري تسجيل الدخول...");

            try {
                // 5. Verify Credentials
                const verificationResult = await verifyUserPassword(normalizedPhone, passwordValue);

                if (verificationResult && !verificationResult.error) {
                    // 6. Success -> Use SessionManager
                    SessionManager.login(verificationResult);
                    AuthUI.close();
                } else {
                    // 7. Error
                    AuthUI.close();
                    const errMsg = verificationResult?.error || "كلمة المرور أو رقم الهاتف غير صحيح.";
                    AuthUI.showError("خطأ", errMsg);
                    AuthUI.showFieldValidationMsg(loginPasswordInput, errMsg);
                }
            } catch (error) {
                console.error(error);
                AuthUI.close();
                AuthUI.showError("خطأ", "حدث خطأ غير متوقع.");
            }
        }
    } catch (error) {
        console.error("🚫 خطأ في login_handleSubmit:", error);
        // Close loading popup and show error.

    }
}

// Legacy functions login_handleLoginSuccess and login_handleGuestLogin replaced by inline logic / SessionManager
// Guest login handler
function login_handleGuestLogin(event) {
    event.preventDefault();
    const guestUser = {
        username: "Guest",
        is_guest: true,
        user_key: "guest_user",
        is_seller: -1,
        notifications_enabled: false
    };
    SessionManager.login(guestUser);
}



loadPage();

// This element is inserted in the way followed in the project (hgh_sec)
insertUniqueSnapshot("pages/header.html", "header-container1X", 300);
