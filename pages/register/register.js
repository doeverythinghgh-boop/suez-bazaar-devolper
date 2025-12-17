/**
 * @file pages/register/register.js
 * @description Handles new user registration functionality, including form validation, password confirmation, and serial number generation for user keys.
 */

const register_form = document.getElementById("register_form");
const register_username = document.getElementById("register_username");
const register_phone = document.getElementById("register_phone");
const register_password = document.getElementById("register_password");
const register_address = document.getElementById("register_address");

// Clear input fields on page load to ensure they are always empty.
if (register_username) register_username.value = "";
if (register_phone) register_phone.value = "";
if (register_password) register_password.value = "";
if (register_address) register_address.value = "";


// Add input event listener to sanitize phone number in real-time.
if (register_phone) {
  register_phone.addEventListener("input", function (e) {
    try {
      let value = e.target.value;
      // Dictionary to convert Indic digits to Arabic numerals.
      const hindiToArabic = {
        "٠": "0",
        "١": "1",
        "٢": "2",
        "٣": "3",
        "٤": "4",
        "٥": "5",
        "٦": "6",
        "٧": "7",
        "٨": "8",
        "٩": "9",
      };

      // Replace Indic digits with Arabic numerals.
      value = value.replace(/[٠-٩]/g, (d) => hindiToArabic[d]);

      // Remove any non-numeric characters (0-9).
      value = value.replace(/[^0-9]/g, "");

      // Update input value.
      e.target.value = value;
    } catch (error) {
      console.error("[تسجيل] خطأ في معالجة إدخال الهاتف:", error);
    }
  });
}

if (register_form) {
  /**
   * @description Handles the registration form submission. Validates username, phone, and password, performs password confirmation via popup, and creates a new user via API.
   * @event submit
   * @async
   */
  register_form.addEventListener("submit", async function (e) {
    e.preventDefault(); // Prevent form from submitting
    console.log("%c[تسجيل] تم إرسال النموذج.", "color: blue;");
    let register_isValid = true;

    // --- Validation ---

    // 1. Username validation
    clearError(register_username);
    const register_usernameValue = register_username.value.trim();
    console.log("[تسجيل] جاري التحقق من الاسم...");
    if (register_usernameValue === "") {
      showError(register_username, "الاسم مطلوب.");
      register_isValid = false;
    } else if (
      register_usernameValue.length < 8 ||
      register_usernameValue.length > 30
    ) {
      showError(register_username, "يجب أن يكون الاسم بين 8 و 30 حرفًا.");
      register_isValid = false;
    }

    // 2. Phone validation
    clearError(register_phone);
    const register_phoneValue = register_phone.value.trim();
    console.log("[تسجيل] جاري التحقق من رقم الهاتف...");
    if (register_phoneValue === "") {
      showError(register_phone, "رقم الهاتف مطلوب.");
      register_isValid = false;
    } else if (register_phoneValue.length < 11) {
      showError(register_phone, "يجب أن يتكون رقم الهاتف من 11 رقمًا على الأقل.");
      register_isValid = false;
    }

    // 3. Password validation
    clearError(register_password);
    const register_passwordValue = register_password.value.trim();
    console.log("[تسجيل] جاري التحقق من كلمة المرور...");
    if (register_passwordValue === "") {
      showError(register_password, "كلمة المرور مطلوبة.");
      register_isValid = false;
    } else if (register_passwordValue.length < 4) {
      showError(
        register_password,
        "يجب أن تكون كلمة المرور 4 أحرف على الأقل."
      );
      register_isValid = false;
    }

    if (!register_isValid) {
      console.warn("[تسجيل] فشل التحقق.");
      return;
    }

    // Password confirmation is now mandatory
    console.log("[تسجيل] طلب تأكيد كلمة المرور...");
    const { value: register_confirmedPassword } = await Swal.fire({
      title: "تأكيد كلمة المرور",
      html: `
        <p>يرجى إعادة إدخال كلمة المرور للتأكيد</p>
        <div class="register_password-container">
          <input type="password" id="register_swal-confirm-password" class="swal2-input" placeholder="أعد إدخال كلمة المرور">
          <i class="fa fa-eye register_toggle-password" id="register_swal-toggle-confirm-password" style="top: 60%;"></i>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "تأكيد",
      cancelButtonText: "إلغاء",
      didOpen: () => {
        const confirmInput = document.getElementById(
          "register_swal-confirm-password"
        );
        const toggleIcon = document.getElementById(
          "register_swal-toggle-confirm-password"
        );
        confirmInput.focus();
        toggleIcon.addEventListener("click", () => {
          const isPassword = confirmInput.type === "password";
          confirmInput.type = isPassword ? "text" : "password";
          toggleIcon.classList.toggle("fa-eye");
          toggleIcon.classList.toggle("fa-eye-slash");
        });
      },
      preConfirm: () => {
        const confirmValue = document.getElementById(
          "register_swal-confirm-password"
        ).value;
        if (confirmValue !== register_password.value) {
          Swal.showValidationMessage("كلمات المرور غير متطابقة!");
          return false;
        }
        return confirmValue;
      },
    });

    // If user cancelled, stop registration.
    if (!register_confirmedPassword) {
      console.log("[تسجيل] تم إلغاء تأكيد كلمة المرور من قبل المستخدم.");
      return;
    }
    const register_userKey = generateSerial(); // 🔑 Generate unique serial number (user_key)
    console.log(`[تسجيل] تم توليد user_key جديد: ${register_userKey}`);
    const register_newUser = {
      username: register_username.value.trim(),
      phone: register_phone.value.trim(),
      user_key: register_userKey, // Add serial number to user data
      password: register_password.value, // Can be empty if allowed
      address: register_address.value.trim(), // Can be empty
    };

    console.log(
      "[تسجيل] إرسال بيانات المستخدم الجديد إلى API...",
      register_newUser
    );
    // Show loading message using SweetAlert2
    Swal.fire({
      title: "إنشاء حساب...",
      text: "يرجى الانتظار لحظة.",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const register_result = await addUser(register_newUser);
      Swal.close(); // Close waiting message

      if (register_result && register_result.message) {
        console.log(
          "%c[تسجيل] تم التسجيل بنجاح.",
          "color: green;",
          register_result
        );
        // Save user data in local storage for login
        // ✅ Fix: Ensure all user-entered data is saved, including address
        const register_loggedInUserData = {
          username: register_newUser.username,
          phone: register_newUser.phone,
          user_key: register_newUser.user_key,
          Address: register_newUser.address, // Add address to saved object
          is_seller: 0, // Default seller status
        };
        localStorage.setItem(
          "loggedInUser",
          JSON.stringify(register_loggedInUserData)
        );

        // Update global session
        userSession = register_loggedInUserData;

        // ✅ New: Initialize notifications for new user as in login page
        console.log(
          "[تسجيل] تهيئة الإشعارات للمستخدم الجديد..."
        );
        if (userSession.user_key != "guest_user") {
          try {
            if (typeof setupFCM === "function") {
              await setupFCM();
            }
            if (typeof askForNotificationPermission === "function") {
              await askForNotificationPermission();
            }
          } catch (notifyErr) {
            console.warn(
              "[تسجيل] خطأ في تهيئة الإشعارات:",
              notifyErr
            );
          }
        }
        console.log(
          "[تسجيل] تم حفظ بيانات المستخدم في localStorage. جاري التوجيه إلى index.html..."
        );

        // Show welcome message before redirecting to home
        Swal.fire({
          icon: "success",
          title: "تم إنشاء الحساب بنجاح!",
          html: `
  <p style="font-size: 1.1rem; color: #333;">أنت الآن جاهز لتجربة شراء فريدة!</p>
  <div style="text-align: right; margin-top: 20px; padding-right: 15px; font-size: 1rem;">
    <p style="margin-bottom: 10px;">🛍️ تصفح آلاف المنتجات بسهولة.</p>
    <p style="margin-bottom: 10px;">💰 استمتع بخصومات وعروض حصرية.</p>
    <p>✨ اكتشف ما هو جديد في سوق السويس.</p>
  </div>
`,
          allowOutsideClick: false, // Prevent closing on click outside
          confirmButtonText: "الانتقال إلى الصفحة الرئيسية",
        }).then((result) => {
          // Redirect user after clicking continue
          if (result.isConfirmed) {
            mainLoader(
              "./pages/home.html",
              "index-home-container",
              0,
              undefined,
              "hiddenHomeIcon",
              true
            );
            setUserNameInIndexBar();
          }
        });
      } else if (register_result && register_result.error) {
        console.warn(
          "[تسجيل] أعاد API خطأ:",
          register_result.error
        );
        // If server error (e.g., duplicate phone number)
        showError(register_phone, register_result.error);
      } else {
        console.error("[تسجيل] فشل API غير معروف.");
        // Unknown server failure
        showError(register_form, "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.");
      }
    } catch (error) {
      Swal.close(); // Ensure message is closed on error
      console.error(
        "%c[تسجيل] خطأ جسيم أثناء التسجيل:",
        "color: red; font-weight: bold;",
        error
      );
      // Connection or code error
      showError(register_form, "حدث خطأ في التطبيق. يرجى المحاولة مرة أخرى.");
    }
  });
}

// Handle navigation to the login page.
try {
  const register_loginLink = document.getElementById(
    "register_goToLoginLink"
  );
  if (register_loginLink) {
    register_loginLink.addEventListener("click", function (e) {
      e.preventDefault();
      mainLoader(
        "./pages/login/login.html",
        "index-user-container",
        0,
        undefined,
        "showHomeIcon",
        true
      );
    });
  }
} catch (error) {
  console.error("[تسجيل] لم يتم العثور على رابط تسجيل الدخول أو ربطه:", error);
}

// New: Add password visibility toggle for the main form.
const register_togglePasswordIcon = document.getElementById(
  "register_toggle-password-icon"
);
if (register_togglePasswordIcon && register_password) {
  register_togglePasswordIcon.addEventListener("click", function () {
    // Toggle input type.
    const type =
      register_password.getAttribute("type") === "password"
        ? "text"
        : "password";
    register_password.setAttribute("type", type);

    // Toggle eye icon.
    this.classList.toggle("fa-eye");
    this.classList.toggle("fa-eye-slash");
  });
}
// This element is inserted in the way followed in the project (hgh_sec).
insertUniqueSnapshot("/pages/header.html", "header-container1Xx", 300);
