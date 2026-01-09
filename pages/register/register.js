/**
 * @file pages/register/register.js
 * @description Handles new user registration functionality, including form validation, password confirmation, and serial number generation for user keys.
 */

// [Immediate Check] Redirect to dashboard if user is already logged in.
(function () {
  var currentUser = typeof SessionManager !== 'undefined' ? SessionManager.getUser() : null;
  if (currentUser) {
    console.log("[Register] User already logged in, redirecting to dashboard.");
    if (typeof mainLoader === 'function') {
      mainLoader(
        "pages/user-dashboard.html",
        "index-user-container",
        0,
        undefined,
        "showHomeIcon",
        true
      );
    }
  }
})();

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

// --- Seller Options Logic ---
var register_sellerOptionsBtn = document.getElementById("register_seller-options-btn");
var register_isDelevredInput = document.getElementById("register_is-delevred");
var register_limitPackageInput = document.getElementById("register_limit-package");

if (register_sellerOptionsBtn) {
  register_sellerOptionsBtn.addEventListener("click", async () => {
    var { value: formValues } = await Swal.fire({
      title: window.langu("register_seller_settings_title"),
      html: `
        <div style="font-family: 'Tajawal', sans-serif;">
          <div class="register-modal-section">
            <label class="register-modal-label">
              <i class="fas fa-truck-moving" style="color: #10b981;"></i> ${window.langu("register_delivery_question")}
            </label>
            <select id="swal_is-delevred" class="swal2-input register-modal-input">
              <option value="0" ${register_isDelevredInput.value == "0" ? "selected" : ""}>${window.langu("register_delivery_no")}</option>
              <option value="1" ${register_isDelevredInput.value == "1" ? "selected" : ""}>${window.langu("register_delivery_yes")}</option>
            </select>
          </div>
          <div class="register-modal-section" style="margin-bottom: 0;">
            <label class="register-modal-label">
              <i class="fas fa-hand-holding-usd" style="color: #10b981;"></i> ${window.langu("register_min_order_question")}
            </label>
            <select id="swal_has-limit" class="swal2-input register-modal-input">
              <option value="no" ${register_limitPackageInput.value == "0" ? "selected" : ""}>${window.langu("register_min_order_no")}</option>
              <option value="yes" ${register_limitPackageInput.value != "0" ? "selected" : ""}>${window.langu("register_min_order_yes")}</option>
            </select>
            <div id="swal_limit-container" style="margin-top: 15px; display: ${register_limitPackageInput.value != "0" ? "block" : "none"};">
              <label class="register-modal-sublabel">${window.langu("register_min_order_value_label")}</label>
              <input type="number" id="swal_limit-value" class="swal2-input register-modal-input" value="${register_limitPackageInput.value}" placeholder="${window.langu("register_min_order_placeholder")}">
            </div>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: window.langu("register_save_settings_btn"),
      cancelButtonText: window.langu("alert_cancel_btn"),
      customClass: {
        popup: 'modern-swal-popup',
        confirmButton: 'modern-swal-confirm',
        cancelButton: 'modern-swal-cancel'
      },
      didOpen: () => {
        var hasLimitSelect = document.getElementById("swal_has-limit");
        var limitContainer = document.getElementById("swal_limit-container");
        hasLimitSelect.addEventListener("change", (e) => {
          limitContainer.style.display = e.target.value === "yes" ? "block" : "none";
        });
      },
      preConfirm: () => {
        var isDelevred = document.getElementById("swal_is-delevred").value;
        var hasLimit = document.getElementById("swal_has-limit").value;
        var limitValue = document.getElementById("swal_limit-value").value;

        if (hasLimit === "yes" && (!limitValue || limitValue <= 0)) {
          Swal.showValidationMessage(window.langu("register_invalid_min_order"));
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
      var isSet = (formValues.isDelevred === 1 || formValues.limitPackage > 0);
      var statusText = isSet ? ` ${window.langu("register_seller_options_set")}` : ` ${window.langu("register_seller_options_none")}`;
      register_sellerOptionsBtn.innerHTML = `<i class="fas fa-store"></i> ${window.langu("register_seller_options_btn")}${statusText}`;
      register_sellerOptionsBtn.style.background = isSet ? "#d1fae5" : "#f0fdf4";
      register_sellerOptionsBtn.style.borderStyle = isSet ? "solid" : "dashed";
    }
  });
}

// Embedded Map Message Listener
var handleRegisterMessage = (event) => {
  var mapStatus = document.getElementById("register_map-status");
  var mapError = document.getElementById("register_map-error");
  var coordsInput = document.getElementById("register_coords");

  if (event.data && event.data.type === 'LOCATION_SELECTED') {
    var coords = event.data.coordinates;
    console.log("[Register] Received coordinates from map:", coords);
    if (coordsInput) coordsInput.value = coords;

    if (mapStatus) {
      mapStatus.style.color = "#10b981";
      mapStatus.innerHTML = `<i class="fas fa-check-circle"></i> ${window.langu("register_map_success")}`;
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
    var mapError = document.getElementById("register_map-error");
    if (mapError) mapError.style.display = "none";

    // Validate Username
    var usernameValidation = AuthValidators.validateUsername(register_username.value.trim());
    if (!usernameValidation.isValid) {
      AuthUI.showFieldValidationMsg(register_username, usernameValidation.message);
      register_isValid = false;
    }

    // Validate Phone
    var normalizedPhone = AuthValidators.normalizePhone(register_phone.value.trim());
    var phoneValidation = AuthValidators.validatePhone(normalizedPhone);
    if (!phoneValidation.isValid) {
      AuthUI.showFieldValidationMsg(register_phone, phoneValidation.message);
      register_isValid = false;
    }

    // Validate Password
    var passwordValidation = AuthValidators.validatePassword(register_password.value.trim());
    if (!passwordValidation.isValid) {
      AuthUI.showFieldValidationMsg(register_password, passwordValidation.message);
      register_isValid = false;
    }

    // Mandatory Location Validation
    var coordsValue = document.getElementById("register_coords")?.value || "";
    if (!coordsValue) {
      if (mapError) {
        mapError.textContent = window.langu("register_map_mandatory_error");
        mapError.style.display = "block";
        mapError.style.color = "#dc2626";
        mapError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      register_isValid = false;
    }

    // Validate Address Detail
    var addressValidation = AuthValidators.validateAddress(register_address.value.trim(), !!coordsValue);
    if (!addressValidation.isValid) {
      AuthUI.showFieldValidationMsg(register_address, addressValidation.message);
      register_isValid = false;
    }

    if (!register_isValid) return;

    // 2. Password Confirmation
    var { value: register_confirmedPassword } = await Swal.fire({
      customClass: {
        popup: 'modern-confirm-pw-popup',
        confirmButton: 'modern-swal-confirm',
        cancelButton: 'modern-swal-cancel'
      },
      html: `
        <div class="confirm-pw-header">
          <div class="confirm-pw-icon-wrapper">
            <i class="fas fa-key"></i>
          </div>
          <h3 class="confirm-pw-title">${window.langu("register_confirm_identity_title")}</h3>
        </div>
        <div class="confirm-pw-body">
          <p>${window.langu("register_confirm_identity_text")}</p>
          <div class="modern-pw-input-group">
            <input type="password" id="register_swal-confirm-password" placeholder="${window.langu("register_password_placeholder")}">
            <i class="fa fa-eye modern-pw-toggle" id="register_swal-toggle-confirm-password"></i>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: window.langu("register_confirm_account_btn"),
      cancelButtonText: window.langu("alert_cancel_btn"),
      buttonsStyling: false,
      didOpen: () => {
        var confirmInput = document.getElementById("register_swal-confirm-password");
        var toggleIcon = document.getElementById("register_swal-toggle-confirm-password");
        if (confirmInput) confirmInput.focus();
        if (toggleIcon && confirmInput) {
          toggleIcon.addEventListener("click", () => {
            var isPassword = confirmInput.type === "password";
            confirmInput.type = isPassword ? "text" : "password";
            toggleIcon.classList.toggle("fa-eye");
            toggleIcon.classList.toggle("fa-eye-slash");
          });
        }
      },
      preConfirm: () => {
        var confirmValue = document.getElementById("register_swal-confirm-password").value;
        if (!confirmValue) {
          Swal.showValidationMessage(window.langu("register_error_no_password"));
          return false;
        }
        if (confirmValue !== register_password.value) {
          Swal.showValidationMessage(window.langu("register_error_password_mismatch"));
          return false;
        }
        return confirmValue;
      },
    });


    if (!register_confirmedPassword) return;

    // 3. Create User
    var register_userKey = generateSerial();
    var register_newUser = {
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
    AuthUI.showLoading(window.langu("register_creating_account"));

    try {
      var register_result = await addUser(register_newUser);
      AuthUI.close();

      if (register_result && register_result.message) {
        // Success
        var register_loggedInUserData = {
          username: register_newUser.username,
          phone: register_newUser.phone,
          user_key: register_newUser.user_key,
          Address: register_newUser.address,
          location: register_newUser.location,
          isDelevred: register_newUser.isDelevred,
          limitPackage: register_newUser.limitPackage,
          is_seller: 0,
        };

        // Use SessionManager (no auto redirect, we handle it)
        await SessionManager.login(register_loggedInUserData, false);

        // Success UI
        Swal.fire({
          icon: "success",
          title: window.langu("register_success_title"),
          html: `
            <p style="font-size: 1.1rem; color: #333;">${window.langu("register_success_subtitle")}</p>
            <div style="text-align: right; margin-top: 20px; padding-right: 15px; font-size: 1rem;">
                <p style="margin-bottom: 10px;">${window.langu("register_success_feature_1")}</p>
                <p style="margin-bottom: 10px;">${window.langu("register_success_feature_2")}</p>
                <p>${window.langu("register_success_feature_3")}</p>
            </div>
            `,
          allowOutsideClick: false,
          confirmButtonText: window.langu("register_go_home_btn"),
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
  var register_loginLink = document.getElementById(
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
    var type =
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
  var savedLocation = localStorage.getItem('saved_location') || localStorage.getItem('bidstory_user_saved_location');
  var coordsInput = document.getElementById("register_coords");
  var mapIframe = document.getElementById("register_location-iframe");

  if (coordsInput) {
    let initialCoords = "";
    if (savedLocation) {
      try {
        var parsed = JSON.parse(savedLocation);
        if (parsed && (parsed.lat || parsed.lng)) {
          initialCoords = parsed.coordinates || `${parsed.lat}, ${parsed.lng}`;
        }
      } catch (e) {
        console.error("Error parsing saved location:", e);
      }
    }

    if (initialCoords) {
      coordsInput.value = initialCoords;
      var mapStatus = document.getElementById("register_map-status");
      if (mapStatus) {
        mapStatus.style.color = "#10b981";
        mapStatus.innerHTML = `<i class="fas fa-check-circle"></i> ${window.langu("register_map_restored")}`;
        mapStatus.style.display = "block";
      }

      // Update Iframe with saved coords + cache busting
      if (mapIframe) {
        var [lt, ln] = initialCoords.split(",").map(c => c.trim());
        var timestamp = new Date().getTime();
        mapIframe.src = `location/LOCATION.html?lat=${lt}&lng=${ln}&embedded=true&hideSave=true&v=${timestamp}`;
      }
    } else if (mapIframe) {
      // No saved location, just add cache busting
      var timestamp = new Date().getTime();
      mapIframe.src = `location/LOCATION.html?embedded=true&hideSave=true&v=${timestamp}`;
    }
  }
}

// Global execution for the custom loader
register_restoreSavedLocation();

