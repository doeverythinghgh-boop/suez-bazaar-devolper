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
        // Refresh userSession from localStorage to ensure we have the latest state.
        // This prevents the code from believing the user is still logged in after logout
        // if the global userSession variable hasn't been updated yet.
        userSession = JSON.parse(localStorage.getItem("loggedInUser")) || null;

        // Check if a user is already logged in.
        if (Number(userSession?.is_seller) >= 1) {
            // Attempt to initialize notifications for the current user if logged in.
            if (typeof initializeNotifications === "function") {
                //  initializeNotifications();
            }
            // Stop execution to allow for redirection (redirection should happen elsewhere)
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
    mainLoader("./pages/register.html", "index-user-container", 0, undefined, "hiddenLoginIcon", true);
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

        // 1. Clear previous errors.
        if (typeof clearError === "function") {
            clearError(loginPhoneInput);
            clearError(loginPasswordInput);
        }

        // 2. Get values and validate inputs.
        const phoneValue = loginPhoneInput.value.trim();
        const passwordValue = loginPasswordInput.value.trim();
        let loginIsValid = true;

        // Validate Phone
        if (phoneValue === "") {
            showError(loginPhoneInput, "رقم الهاتف مطلوب.");
            loginIsValid = false;
        } else if (phoneValue.length < 11) {
            showError(loginPhoneInput, "يجب أن يتكون رقم الهاتف من 11 رقمًا على الأقل.");
            loginIsValid = false;
        }

        // Validate Password
        if (passwordValue === "") {
            showError(loginPasswordInput, "كلمة المرور مطلوبة.");
            loginIsValid = false;
        } else if (passwordValue.length < 4) {
            showError(loginPasswordInput, "يجب أن تكون كلمة المرور 4 أحرف على الأقل.");
            loginIsValid = false;
        }

        // 3. If all inputs are valid.
        if (loginIsValid) {
            console.log("[صفحة تسجيل الدخول] النموذج صالح، جاري التحقق من الاعتمادات...");

            // Show loading popup.
            Swal.fire({
                title: "جاري تسجيل الدخول...",
                text: "يرجى الانتظار لحظة.",
                allowOutsideClick: false,
                didOpen: () => {
                    // Show loading spinner.
                    Swal.showLoading();
                },
                customClass: { popup: 'fullscreen-swal' }, // Apply custom style
            });

            // 4. Verify user credentials with server.
            const verificationResult = await verifyUserPassword(
                phoneValue,
                passwordValue
            );

            // 5. Handle verification result.
            if (verificationResult && !verificationResult.error) {

                login_handleLoginSuccess(verificationResult);
            } else {
                // Verification failed.
                console.error(
                    "[صفحة تسجيل الدخول] فشل تسجيل الدخول:",
                    verificationResult?.error || "خطأ غير معروف"
                );
                Swal.close();
                const errorMessage =
                    "كلمة المرور أو رقم الهاتف غير صحيح. يرجى التحقق منهم.";
                if (typeof showError === "function") {
                    showError(loginPasswordInput, errorMessage);
                }
            }
        }
    } catch (error) {
        console.error("🚫 خطأ في login_handleSubmit:", error);
        // Close loading popup and show error.

    }
}

/**
 * @function login_handleLoginSuccess
 * @description Handles actions after a successful login.
 * @param {object} user - The logged-in user object.
 * @async
 * @returns {Promise<void>}
 */
async function login_handleLoginSuccess(user) {
    try {
        console.log(
            "%c[صفحة تسجيل الدخول] تم الدخول إلى login_handleLoginSuccess. بيانات المستخدم:",
            "color: green;",
            user
        );

        // 1. Save user data and update session.
        localStorage.setItem("loggedInUser", JSON.stringify(user));
        userSession = user; // Update user session global object.
        setUserNameInIndexBar();
        // 2. Setup FCM notifications if eligible.
        if (userSession.user_key != "guest_user") {
            await setupFCM();
            await askForNotificationPermission();
        } else {
            console.log(
                "[صفحة تسجيل الدخول] المستخدم غير مؤهل للإشعارات، تخطي setupFCM()."
            );
        }

        // 3. Show welcome message and redirect to home.
        Swal.fire({
            title: `🎉 مرحباً بك، ${userSession.username}! 🎉`,
            html: `
        <p style="font-size: 1.1rem; color: #333;">أنت الآن جاهز لتجربة تسوق فريدة!</p>
        <div style="text-align: right; margin-top: 20px; padding-right: 15px; font-size: 1rem;">
          <p style="margin-bottom: 10px;">🛍️ تصفح آلاف المنتجات بسهولة.</p>
          <p style="margin-bottom: 10px;">💰 استمتع بخصومات وعروض حصرية.</p>
          <p>✨ اكتشف ما هو جديد في سوق السويس.</p>
        </div>
      `,
            icon: "success",
            allowOutsideClick: false, // Prevent closing on click outside
            confirmButtonText: "ابدأ التسوق الآن!",
            confirmButtonColor: "#3b82f6",
            customClass: { popup: 'fullscreen-swal' }, // Apply custom style
        }).then((result) => {
            // Redirect to home page on button click.
            if (result.isConfirmed) {
                if (typeof mainLoader === "function") {
                    mainLoader("./pages/home.html", "index-home-container", 0, undefined, "hiddenHomeIcon", true);
                }
            }
        });

    } catch (error) {
        console.error("🚫 خطأ في دالة login_handleLoginSuccess:", error);
    }
}


/**
 * @function login_handleGuestLogin
 * @description Handles guest login process. Creates a dummy guest user session.
 * @param {Event} event - The event object to prevent default link behavior.
 * @returns {void}
 */
function login_handleGuestLogin(event) {
    try {
        event.preventDefault(); // Prevent link from updating page.
        console.log("[Auth] تسجيل الدخول كضيف.");

        // Create guest user object.
        const guestUser = {
            username: "Guest",
            is_guest: true,
            user_key: "guest_user",
            is_seller: -1,
            notifications_key: null, // Guest has no notifications key.
            notifications_enabled: false, // Notifications disabled for guest.
        };

        // Save guest data in localStorage and update session.
        localStorage.setItem("loggedInUser", JSON.stringify(guestUser));
        userSession = guestUser;
        setUserNameInIndexBar();
        // Reload home page fully to update UI.
        if (typeof mainLoader === "function") {
            mainLoader(
                "./pages/home.html",
                "index-home-container",
                0,
                undefined,
                "hiddenHomeIcon", true
            );
        }
    } catch (error) {
        console.error("🚫 خطأ في دالة login_handleGuestLogin:", error);
    }
}



loadPage();

// This element is inserted in the way followed in the project (hgh_sec)
insertUniqueSnapshot("pages/header.html", "header-container1X", 300);
