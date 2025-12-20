/**
 * @file pages/register/register.js
 * @description Handles new user registration functionality, including form validation, password confirmation, and serial number generation for user keys.
 */

var register_form = document.getElementById("register_form");
var register_username = document.getElementById("register_username");
var register_phone = document.getElementById("register_phone");
var register_password = document.getElementById("register_password");
var register_address = document.getElementById("register_address");

// Clear input fields on page load to ensure they are always empty.
if (register_username) register_username.value = "";
if (register_phone) register_phone.value = "";
if (register_password) register_password.value = "";
if (register_address) register_address.value = "";


// Add input event listener to sanitize phone number in real-time.
if (register_phone) {
  register_phone.addEventListener("input", function (e) {
    e.target.value = AuthValidators.normalizePhone(e.target.value);
  });
}

if (register_form) {
  /**
   * @description Handles the registration form submission. Validates username, phone, and password, performs password confirmation via popup, and creates a new user via API.
   * @event submit
   * @async
   */
  register_form.addEventListener("submit", async function (e) {
    e.preventDefault();

    // 1. Validation
    let register_isValid = true;
    AuthUI.clearFieldValidationMsg(register_username);
    AuthUI.clearFieldValidationMsg(register_phone);
    AuthUI.clearFieldValidationMsg(register_password);
    AuthUI.clearFieldValidationMsg(register_address);

    // Validate Username
    const usernameValidation = AuthValidators.validateUsername(register_username.value.trim());
    if (!usernameValidation.isValid) {
      AuthUI.showFieldValidationMsg(register_username, usernameValidation.message);
      register_isValid = false;
    }

    // Validate Phone
    const normalizedPhone = AuthValidators.normalizePhone(register_phone.value.trim());
    const phoneValidation = AuthValidators.validatePhone(normalizedPhone);
    if (!phoneValidation.isValid) {
      AuthUI.showFieldValidationMsg(register_phone, phoneValidation.message);
      register_isValid = false;
    }

    // Validate Password
    const passwordValidation = AuthValidators.validatePassword(register_password.value.trim());
    if (!passwordValidation.isValid) {
      AuthUI.showFieldValidationMsg(register_password, passwordValidation.message);
      register_isValid = false;
    }

    // Validate Address
    const hasCoords = !!(document.getElementById("register_coords")?.value);
    const addressValidation = AuthValidators.validateAddress(register_address.value.trim(), hasCoords);
    if (!addressValidation.isValid) {
      AuthUI.showFieldValidationMsg(register_address, addressValidation.message);
      register_isValid = false;
    }

    if (!register_isValid) return;

    // 2. Password Confirmation
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
      customClass: { popup: 'fullscreen-swal' },
      didOpen: () => {
        const confirmInput = document.getElementById("register_swal-confirm-password");
        const toggleIcon = document.getElementById("register_swal-toggle-confirm-password");
        if (confirmInput) confirmInput.focus();
        if (toggleIcon && confirmInput) {
          toggleIcon.addEventListener("click", () => {
            const isPassword = confirmInput.type === "password";
            confirmInput.type = isPassword ? "text" : "password";
            toggleIcon.classList.toggle("fa-eye");
            toggleIcon.classList.toggle("fa-eye-slash");
          });
        }
      },
      preConfirm: () => {
        const confirmValue = document.getElementById("register_swal-confirm-password").value;
        if (confirmValue !== register_password.value) {
          Swal.showValidationMessage("كلمات المرور غير متطابقة!");
          return false;
        }
        return confirmValue;
      },
    });

    if (!register_confirmedPassword) return;

    // 3. Create User
    const register_userKey = generateSerial();
    const register_newUser = {
      username: register_username.value.trim(),
      phone: normalizedPhone,
      user_key: register_userKey,
      password: register_password.value,
      address: register_address.value.trim(),
      location: document.getElementById("register_coords")?.value || "",
    };

    // 4. Submit
    AuthUI.showLoading("إنشاء حساب...");

    try {
      const register_result = await addUser(register_newUser);
      AuthUI.close();

      if (register_result && register_result.message) {
        // Success
        const register_loggedInUserData = {
          username: register_newUser.username,
          phone: register_newUser.phone,
          user_key: register_newUser.user_key,
          Address: register_newUser.address,
          location: register_newUser.location,
          is_seller: 0,
        };

        // Use SessionManager (no auto redirect, we handle it)
        await SessionManager.login(register_loggedInUserData, false);

        // Success UI
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
          allowOutsideClick: false,
          confirmButtonText: "الانتقال إلى الصفحة الرئيسية",
          customClass: { popup: 'fullscreen-swal' }
        }).then((result) => {
          if (result.isConfirmed) {
            mainLoader(
              "./pages/home.html",
              "index-home-container",
              0,
              undefined,
              "hiddenHomeIcon",
              true
            );
            // setUserNameInIndexBar() is called by SessionManager.login
          }
        });

      } else if (register_result && register_result.error) {
        AuthUI.showError("خطأ", register_result.error);
        AuthUI.showFieldValidationMsg(register_phone, register_result.error);
      } else {
        AuthUI.showError("خطأ", "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.");
      }
    } catch (error) {
      console.error(error);
      AuthUI.close();
      AuthUI.showError("خطأ", "حدث خطأ في التطبيق. يرجى المحاولة مرة أخرى.");
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
var register_togglePasswordIcon = document.getElementById(
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

// Location Picker Logic
const register_locationBtn = document.getElementById("register_location-btn");
if (register_locationBtn) {
  register_locationBtn.addEventListener("click", () => {
    const existingCoords = document.getElementById("register_coords")?.value || "";
    let iframeSrc = "location/LOCATION.html";
    if (existingCoords && existingCoords.includes(",")) {
      const [lt, ln] = existingCoords.split(",").map(c => c.trim());
      iframeSrc += `?lat=${lt}&lng=${ln}`;
    }

    Swal.fire({
      html: `
            <div style="width: 100%; height: 500px; overflow: hidden; border-radius: 15px;">
              <iframe 
                src="${iframeSrc}" 
            style="width: 100%; height: 100%; border: none;"
            id="register_location-iframe"
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
        const handleMessage = (event) => {
          const locationBtn = document.getElementById("register_location-btn");
          const addressHint = document.getElementById("register_address-hint");
          const coordsInput = document.getElementById("register_coords");

          if (event.data && event.data.type === 'LOCATION_SELECTED') {
            const coords = event.data.coordinates;
            if (coordsInput) coordsInput.value = coords;

            // UX Improvement: Show success state and update hint
            if (locationBtn) locationBtn.classList.add("is-success");
            if (addressHint) {
              const addressInput = document.getElementById("register_address");
              if (addressInput && addressInput.value.trim() !== "") {
                // Address already has details, just show a simple thank you
                addressHint.innerHTML = '<span style="color: #10b981;"><i class="fas fa-check-circle"></i> تم ربط الموقع بنجاح!</span>';
              } else {
                // Address is empty, show the full reminder
                addressHint.innerHTML = '<span style="color: #10b981;"><i class="fas fa-check-circle"></i> شكراً لك على تحديد موقعك بدقة!</span><br/>يرجى الآن كتابة تفاصيل إضافية (مثل: الدور، الشقة، أو علامة مميزة) في الحقل أعلاه.';
              }
              // Ensure error div is hidden if we have success hint
              AuthUI.clearFieldValidationMsg(addressInput);
            }
          } else if (event.data && event.data.type === 'LOCATION_RESET') {
            if (coordsInput) coordsInput.value = "";
            if (locationBtn) locationBtn.classList.remove("is-success");
            if (addressHint) {
              addressHint.innerHTML = 'أسرع للتوصيل: اختيار موقعك من الخريطة يضمن وصول المندوب إليك بسرعة فائقة.';
            }
          } else if (event.data && event.data.type === 'CLOSE_LOCATION_MODAL') {
            Swal.close();
            window.removeEventListener('message', handleMessage);
          }
        };
        window.addEventListener('message', handleMessage);
      }
    });
  });
}
// This element is inserted in the way followed in the project (hgh_sec).
insertUniqueSnapshot("/pages/header.html", "header-container1Xx", 300);

// Check for saved location on load
/**
 * @description Automatically restores saved location from localStorage if available.
 * Adapted for the project's custom page loading system.
 */
function register_restoreSavedLocation() {
  const savedLocation = localStorage.getItem('saved_location') || localStorage.getItem('bidstory_user_saved_location');
  const locationBtn = document.getElementById("register_location-btn");
  const coordsInput = document.getElementById("register_coords");
  const addressHint = document.getElementById("register_address-hint");

  if (locationBtn && coordsInput) {
    let initialCoords = "";
    if (savedLocation) {
      try {
        const parsed = JSON.parse(savedLocation);
        if (parsed && (parsed.lat || parsed.lng)) {
          initialCoords = parsed.coordinates || `${parsed.lat}, ${parsed.lng}`;
        }
      } catch (e) {
        console.error("Error parsing saved location:", e);
      }
    }

    if (initialCoords) {
      coordsInput.value = initialCoords;
      locationBtn.classList.add("is-success");
      if (addressHint) {
        addressHint.innerHTML = '<span style="color: #10b981;"><i class="fas fa-check-circle"></i> شكراً لك على تحديد موقعك بدقة!</span><br/>الآن يرجى كتابة تفاصيل إضافية (مثل: الدور، الشقة، أو علامة مميزة) في الحقل أعلاه.';
      }
    }
  }
}

// Global execution for the custom loader
register_restoreSavedLocation();

