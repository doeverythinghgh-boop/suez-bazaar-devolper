/**
 * @file pages/profile-modal/js/profile-handlers.js
 * @description Main event handlers and API interaction logic for the profile modal.
 */

/**
 * Handles the "Change Password" checkbox interaction.
 * Verifies identity if necessary before showing password fields.
 * @async
 */
async function profileHandleChangePasswordCheck() {
    try {
        const els = profileGetElements();
        const user = window.userSession;
        if (!els.changePasswordCheckbox || !user) return;

        if (els.changePasswordCheckbox.checked) {
            // If user has no existing password, allow setting one directly
            if (!user.Password) {
                if (els.passwordFieldsContainer) {
                    els.passwordFieldsContainer.style.display = "block";
                }
                profileIsPasswordVerified = true;
                return;
            }

            // Verify current identity
            const passwordEntered = await AuthUI.confirmPassword(
                "تأكيد الهوية",
                "يرجى إدخال كلمة المرور الحالية لتغييرها."
            );

            if (passwordEntered) {
                AuthUI.showLoading("جاري التحقق...");
                const result = await verifyUserPassword(user.phone, passwordEntered);
                AuthUI.close();

                if (result && !result.error) {
                    if (els.passwordFieldsContainer) {
                        els.passwordFieldsContainer.style.display = "block";
                    }
                    profileIsPasswordVerified = true;
                } else {
                    els.changePasswordCheckbox.checked = false;
                    AuthUI.showError("خطأ", "كلمة المرور غير صحيحة.");
                }
            } else {
                els.changePasswordCheckbox.checked = false;
            }
        } else {
            // Hide password fields if checkbox is unchecked
            if (els.passwordFieldsContainer) {
                els.passwordFieldsContainer.style.display = "none";
            }
            profileIsPasswordVerified = false;
        }
    } catch (error) {
        console.error("Error in profileHandleChangePasswordCheck:", error);
    }
}

/**
 * Handles the "Seller Options" button click.
 * Shows a SweetAlert2 modal to configure self-delivery and order limit.
 * @async
 */
async function profileHandleSellerOptions() {
    try {
        const els = profileGetElements();
        const user = window.userSession;
        if (!els.sellerOptionsBtn || !user) return;

        const currentIsDelevred = els.isDelevredInput.value;
        const currentLimitPackage = els.limitPackageInput.value;

        const { value: formValues } = await Swal.fire({
            title: "إعدادات البائع",
            html: `
                <div style="text-align: right; direction: rtl;">
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: bold;">هل لديك خدمة توصيل خاصة بك؟</label>
                        <select id="swal-profile_is-delevred" class="swal2-input" style="width: 100%; margin: 0;">
                            <option value="0" ${currentIsDelevred == "0" ? "selected" : ""}>لا (الاعتماد على مناديب التطبيق)</option>
                            <option value="1" ${currentIsDelevred == "1" ? "selected" : ""}>نعم (أقوم بالتوصيل بنفسي)</option>
                        </select>
                    </div>
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: bold;">هل تضع حداً أدنى لطلبات الشراء؟</label>
                        <select id="swal-profile_has-limit" class="swal2-input" style="width: 100%; margin: 0;">
                            <option value="no" ${currentLimitPackage == "0" ? "selected" : ""}>لا يوجد حد أدنى</option>
                            <option value="yes" ${currentLimitPackage != "0" ? "selected" : ""}>نعم، يوجد حد أدنى</option>
                        </select>
                    </div>
                    <div id="swal-profile_limit-container" style="display: ${currentLimitPackage != "0" ? "block" : "none"};">
                        <label style="display: block; margin-bottom: 8px; font-weight: bold;">الحد الأدنى للطلب (ج.م):</label>
                        <input type="number" id="swal-profile_limit-value" class="swal2-input" style="width: 100%; margin: 0;" value="${currentLimitPackage}" placeholder="مثلاً: 100">
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: "حفظ الإعدادات",
            cancelButtonText: "إلغاء",
            customClass: { popup: 'fullscreen-swal' },
            didOpen: () => {
                const hasLimitSelect = document.getElementById("swal-profile_has-limit");
                const limitContainer = document.getElementById("swal-profile_limit-container");
                hasLimitSelect.addEventListener("change", (e) => {
                    limitContainer.style.display = e.target.value === "yes" ? "block" : "none";
                });
            },
            preConfirm: () => {
                const isDelevred = document.getElementById("swal-profile_is-delevred").value;
                const hasLimit = document.getElementById("swal-profile_has-limit").value;
                const limitValue = document.getElementById("swal-profile_limit-value").value;

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
            els.isDelevredInput.value = formValues.isDelevred;
            els.limitPackageInput.value = formValues.limitPackage;

            // Update UI feedback on the button
            const isSet = (formValues.isDelevred === 1 || formValues.limitPackage > 0);
            els.sellerOptionsBtn.innerHTML = `<i class="fas fa-store"></i> خيارات البائع ${isSet ? "(تم الضبط ✅)" : ""}`;
            els.sellerOptionsBtn.style.background = isSet ? "#d1fae5" : "#f0fdf4";
        }
    } catch (error) {
        console.error("Error in profileHandleSellerOptions:", error);
    }
}

/**
 * Handles the save changes request.
 * Performs final validation and calls the update API.
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
        updatedData.address = address;
    }

    // Normalized location comparison
    const currentCoords = (user.location || user.Location || "").toString().trim().replace(/\s+/g, '');
    const newCoords = (els.coordsInput?.value || "").toString().trim().replace(/\s+/g, '');

    // Mandatory Location Check
    const mapError = document.getElementById("profile-map-error");
    if (!newCoords) {
        if (mapError) {
            mapError.textContent = "يرجى تحديد موقعك على الخريطة أولاً لضمان سرعة التوصيل.";
            mapError.style.display = "block";
            mapError.style.color = "#dc2626";
            mapError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    } else {
        if (mapError) mapError.style.display = "none";
    }

    if (newCoords && newCoords !== currentCoords) {
        updatedData.location = newCoords.includes(',') ? newCoords.replace(',', ', ') : newCoords;
    }

    if (els.changePasswordCheckbox?.checked && password) {
        updatedData.password = password;
    }

    // Include Seller Options
    const newIsDelevred = parseInt(els.isDelevredInput?.value || 0);
    const newLimitPackage = parseFloat(els.limitPackageInput?.value || 0);

    if (newIsDelevred !== (user.isDelevred || 0)) {
        updatedData.isDelevred = newIsDelevred;
    }
    if (newLimitPackage !== (user.limitPackage || 0)) {
        updatedData.limitPackage = newLimitPackage;
    }

    // Check if any actual changes were made
    if (Object.keys(updatedData).length === 1) {
        await AuthUI.showSuccess("لم يتغير شيء", "لم تقم بإجراء أي تغييرات.");
        return;
    }

    // Verify identity before critical update if not already verified
    if (user.Password && !profileIsPasswordVerified) {
        const passwordEntered = await AuthUI.confirmPassword(
            "تأكيد الهوية",
            "أدخل كلمة المرور الحالية لحفظ التغييرات."
        );
        if (!passwordEntered) return;

        AuthUI.showLoading("جاري التحقق...");
        const verification = await verifyUserPassword(user.phone, passwordEntered);
        AuthUI.close();

        if (!verification || verification.error) {
            AuthUI.showError("خطأ", "كلمة المرور غير صحيحة.");
            return;
        }
    }

    // Execute update
    AuthUI.showLoading("جاري الحفظ...");
    const result = await updateUser(updatedData);
    AuthUI.close();

    if (result && !result.error) {
        profileUpdateSession(updatedData);
        await AuthUI.showSuccess("تم التحديث بنجاح!", result.message);
        mainLoader("pages/user-dashboard.html", "index-user-container", 0, undefined, "showHomeIcon", true);
    } else {
        AuthUI.showError("خطأ", result?.error || "فشل التحديث.");
    }
}

/**
 * Updates the local user session data.
 * @param {Object} updatedData - The newly updated user data.
 */
function profileUpdateSession(updatedData) {
    SessionManager.updateUser(updatedData);
}

/**
 * Handles the secure account deletion process.
 * @async
 */
async function profileHandleAccountDeletion() {
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

    const user = window.userSession;
    if (user.Password) {
        const password = await AuthUI.confirmPassword(
            "تأكيد الحذف",
            "أدخل كلمة المرور لتأكيد الحذف."
        );
        if (!password) return;

        AuthUI.showLoading("جاري التحقق...");
        const verification = await verifyUserPassword(user.phone, password);
        AuthUI.close();

        if (!verification || verification.error) {
            AuthUI.showError("خطأ", "كلمة المرور غير صحيحة.");
            return;
        }
    }

    AuthUI.showLoading("جاري الحذف...");
    const result = await deleteUser(user.user_key);
    AuthUI.close();

    if (result && !result.error) {
        await SessionManager.logout();
        await Swal.fire("تم الحذف", "تم حذف الحساب بنجاح.", "success");
    } else {
        AuthUI.showError("خطأ", result?.error || "حدث خطأ أثناء الحذف.");
    }
}
