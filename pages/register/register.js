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

// Embedded Map Message Listener
const handleRegisterMessage = (event) => {
  const mapStatus = document.getElementById("register_map-status");
  const mapError = document.getElementById("register_map-error");
  const coordsInput = document.getElementById("register_coords");

  if (event.data && event.data.type === 'LOCATION_SELECTED') {
    const coords = event.data.coordinates;
    console.log("[Register] Received coordinates from map:", coords);
    if (coordsInput) coordsInput.value = coords;

    if (mapStatus) {
      mapStatus.style.color = "#10b981";
      mapStatus.innerHTML = '<i class="fas fa-check-circle"></i> تم ربط الموقع بنجاح!';
      mapStatus.style.display = "block";
    }
    if (mapError) mapError.style.display = "none";

  } else if (event.data && event.data.type === 'LOCATION_RESET') {
    if (coordsInput) coordsInput.value = "";
    if (mapStatus) {
      mapStatus.style.display = "none";
      mapStatus.innerHTML = "";
    }
    if (mapError) mapError.style.display = "none";
  }
};
window.addEventListener('message', handleRegisterMessage);

if (register_form) {
  register_form.addEventListener("submit", async function (e) {
    e.preventDefault();

    // 1. Validation
    let register_isValid = true;
    AuthUI.clearFieldValidationMsg(register_username);
    AuthUI.clearFieldValidationMsg(register_phone);
    AuthUI.clearFieldValidationMsg(register_password);
    AuthUI.clearFieldValidationMsg(register_address);

    // Clear Map Errors
    const mapError = document.getElementById("register_map-error");
    if (mapError) mapError.style.display = "none";

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

    // Mandatory Location Validation
    const coordsValue = document.getElementById("register_coords")?.value || "";
    if (!coordsValue) {
      if (mapError) {
        mapError.textContent = "يرجى تحديد موقعك على الخريطة أولاً لضمان سرعة التوصيل.";
        mapError.style.display = "block";
        mapError.style.color = "#dc2626";
        mapError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      register_isValid = false;
    }

    // Validate Address Detail
    const addressValidation = AuthValidators.validateAddress(register_address.value.trim(), !!coordsValue);
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

    // Seller Options Logic
    const register_sellerOptionsBtn = document.getElementById("register_seller-options-btn");
    const register_isDelevredInput = document.getElementById("register_is-delevred");
    const register_limitPackageInput = document.getElementById("register_limit-package");

    if (register_sellerOptionsBtn) {
      register_sellerOptionsBtn.addEventListener("click", async () => {
        const { value: formValues } = await Swal.fire({
          title: "إعدادات البائع",
          html: `
        <div style="text-align: right; direction: rtl; font-family: 'Tajawal', sans-serif;">
          <div style="background: #f8fafc; padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; font-weight: 700; color: #1e293b; font-size: 1rem;">
              <i class="fas fa-truck-moving" style="color: #10b981;"></i> هل لديك خدمة توصيل خاصة بك؟
            </label>
            <select id="swal_is-delevred" class="swal2-input" style="width: 100%; margin: 0; height: 50px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; font-family: 'Tajawal', sans-serif;">
              <option value="0" ${register_isDelevredInput.value == "0" ? "selected" : ""}>لا (الاعتماد على مناديب التطبيق)</option>
              <option value="1" ${register_isDelevredInput.value == "1" ? "selected" : ""}>نعم (أقوم بالتوصيل بنفسي)</option>
            </select>
          </div>
          <div style="background: #f8fafc; padding: 15px; border-radius: 12px; margin-bottom: 0px; border: 1px solid #e2e8f0;">
            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; font-weight: 700; color: #1e293b; font-size: 1rem;">
              <i class="fas fa-hand-holding-usd" style="color: #10b981;"></i> هل تضع حداً أدنى لطلبات الشراء؟
            </label>
            <select id="swal_has-limit" class="swal2-input" style="width: 100%; margin: 0; height: 50px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; font-family: 'Tajawal', sans-serif;">
              <option value="no" ${register_limitPackageInput.value == "0" ? "selected" : ""}>لا يوجد حد أدنى</option>
              <option value="yes" ${register_limitPackageInput.value != "0" ? "selected" : ""}>نعم، يوجد حد أدنى للطلب</option>
            </select>
            <div id="swal_limit-container" style="margin-top: 15px; display: ${register_limitPackageInput.value != "0" ? "block" : "none"};">
              <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #64748b; font-size: 0.9rem;">الحد الأدنى للطلب (ج.م):</label>
              <input type="number" id="swal_limit-value" class="swal2-input" style="width: 100%; margin: 0; height: 50px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; font-family: 'Tajawal', sans-serif;" value="${register_limitPackageInput.value}" placeholder="مثلاً: 100">
            </div>
          </div>
        </div>
      `,
          focusConfirm: false,
          showCancelButton: true,
          confirmButtonText: "حفظ الإعدادات",
          cancelButtonText: "إلغاء",
          customClass: {
            popup: 'modern-swal-popup',
            confirmButton: 'modern-swal-confirm',
            cancelButton: 'modern-swal-cancel'
          },
          didOpen: () => {
            const hasLimitSelect = document.getElementById("swal_has-limit");
            const limitContainer = document.getElementById("swal_limit-container");
            hasLimitSelect.addEventListener("change", (e) => {
              limitContainer.style.display = e.target.value === "yes" ? "block" : "none";
            });
          },
          preConfirm: () => {
            const isDelevred = document.getElementById("swal_is-delevred").value;
            const hasLimit = document.getElementById("swal_has-limit").value;
            const limitValue = document.getElementById("swal_limit-value").value;

            if (hasLimit === "yes" && (!limitValue || limitValue <= 0)) {
              Swal.showValidationMessage("يرجى إدخال قيمة صحيحة للحد الأدنى");
              return false;
            }

            return {
              isDelevred: parseInt(isDelevred),
              limitPackage: hasLimit === "yes" ? parseFloat(limitValue) : 0
            };
          }
        });

        if (formValues) {
          register_isDelevredInput.value = formValues.isDelevred;
          register_limitPackageInput.value = formValues.limitPackage;

          // Update UI feedback on the button
          const isSet = (formValues.isDelevred === 1 || formValues.limitPackage > 0);
          const statusText = isSet ? " (تم ضبط الإعدادات ✅)" : " (لا توجد إعدادات خاصة)";
          register_sellerOptionsBtn.innerHTML = `<i class="fas fa-store"></i> خيارات البائع ${statusText}`;
          register_sellerOptionsBtn.style.background = isSet ? "#d1fae5" : "#f0fdf4";
          register_sellerOptionsBtn.style.borderStyle = isSet ? "solid" : "dashed";
        }
      });
    }

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
      isDelevred: parseInt(register_isDelevredInput.value),
      limitPackage: parseFloat(register_limitPackageInput.value),
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

// This element is inserted in the way followed in the project (hgh_sec).
insertUniqueSnapshot("/pages/header.html", "header-container1Xx", 300);

// Check for saved location on load
function register_restoreSavedLocation() {
  const savedLocation = localStorage.getItem('saved_location') || localStorage.getItem('bidstory_user_saved_location');
  const coordsInput = document.getElementById("register_coords");
  const mapIframe = document.getElementById("register_location-iframe");

  if (coordsInput) {
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
      const mapStatus = document.getElementById("register_map-status");
      if (mapStatus) {
        mapStatus.style.color = "#10b981";
        mapStatus.innerHTML = '<i class="fas fa-check-circle"></i> تم استرجاع موقعك المحفوظ.';
        mapStatus.style.display = "block";
      }

      // Update Iframe with saved coords + cache busting
      if (mapIframe) {
        const [lt, ln] = initialCoords.split(",").map(c => c.trim());
        const timestamp = new Date().getTime();
        mapIframe.src = `location/LOCATION.html?lat=${lt}&lng=${ln}&embedded=true&hideSave=true&v=${timestamp}`;
      }
    } else if (mapIframe) {
      // No saved location, just add cache busting
      const timestamp = new Date().getTime();
      mapIframe.src = `location/LOCATION.html?embedded=true&hideSave=true&v=${timestamp}`;
    }
  }
}

// Global execution for the custom loader
register_restoreSavedLocation();

