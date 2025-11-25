/**
 * @file js/profile-modal.js
 * @description يحتوي هذا الملف على المنطق البرمجي الخاص بنافذة تعديل الملف الشخصي للمستخدم.
 * يوفر دوال لعرض النافذة، تحديث بيانات المستخدم، وحذف الحساب.
 * @requires module:sweetalert2 - لعرض رسائل وتنبيهات تفاعلية.
 * @requires module:api/users - للتفاعل مع واجهة برمجة التطبيقات (API) الخاصة بالمستخدمين (updateUser, deleteUser, verifyUserPassword).
 * @requires js/modal.js - لاستيراد `loadAndShowModal` و `setupModalLogic` لإدارة النوافذ المنبثقة.
 */

/**
 * @description يعرض نافذة منبثقة (Modal) لتعديل بيانات المستخدم الشخصية.
 * يقوم بتحميل محتوى النافذة من ملف HTML، يملأ الحقول ببيانات المستخدم الحالية،
 * ويدير منطق التحقق من صحة المدخلات، تغيير كلمة المرور، وحفظ التغييرات.
 * @function showEditProfileModal
 * @async
 * @param {object} currentUser - كائن يحتوي على بيانات المستخدم الحالية.
 * @param {string} currentUser.user_key - المفتاح الفريد للمستخدم.
 * @param {string} [currentUser.username] - اسم المستخدم.
 * @param {string} [currentUser.phone] - رقم هاتف المستخدم.
 * @param {string} [currentUser.Address] - عنوان المستخدم.
 * @param {boolean} currentUser.Password - علامة تشير إلى ما إذا كان المستخدم لديه كلمة مرور.
 * @returns {Promise<void>} - يُرجع وعدًا (Promise) يتم حله عند إغلاق النافذة أو اكتمال العملية، دون إرجاع قيمة.
 * @see loadAndShowModal
 * @see handleAccountDeletion
 * @see verifyUserPassword
 * @see updateUser
 */
async function showEditProfileModal(currentUser) {
  await loadAndShowModal("profile-modal-container", "pages/profile-modal.html", (modal) => {
    // --- Get DOM Elements ---
    const usernameInput = document.getElementById('profile-username');
    const phoneInput = document.getElementById('profile-phone');
    const addressInput = document.getElementById('profile-address');
    const changePasswordCheckbox = document.getElementById('profile-change-password-checkbox');
    const passwordFields = document.getElementById('profile-password-fields');
    const passwordInput = document.getElementById('profile-password');
    const confirmPasswordInput = document.getElementById('profile-confirm-password');
    const saveBtn = document.getElementById('profile-save-btn');
    const deleteBtn = document.getElementById('profile-delete-account-btn');
    const closeBtn = document.getElementById('profile-modal-close-btn');

    // ✅ جديد: متغير لتتبع ما إذا تم التحقق من كلمة المرور بالفعل
    let isPasswordVerified = false;

    // --- Populate Initial Data ---
    usernameInput.value = currentUser.username || '';
    phoneInput.value = currentUser.phone || '';
    addressInput.value = currentUser.Address || '';

    // ✅ جديد: إعادة تعيين حالة حقول كلمة المرور عند فتح النافذة
    changePasswordCheckbox.checked = false;
    passwordFields.style.display = 'none';
    passwordInput.value = '';
    confirmPasswordInput.value = '';
    document.getElementById('profile-password-error').textContent = '';

    // --- Close Button Logic ---
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        const modalLogic = setupModalLogic("profile-modal-container");
        if (modalLogic) modalLogic.close();
      });
    }

    // --- Event Listeners ---

    // Logic to show/hide password fields
    changePasswordCheckbox.addEventListener('click', async (event) => {
      if (!event.target.checked) {
        passwordFields.style.display = 'none';
        return;
      }

      event.preventDefault();

      if (!currentUser.Password) {
        changePasswordCheckbox.checked = true;
        passwordFields.style.display = 'block';
        return;
      }

      const { value: oldPassword, isConfirmed } = await Swal.fire({
        title: 'التحقق من الهوية',
        text: 'لتغيير كلمة المرور، الرجاء إدخال كلمة المرور القديمة أولاً.',
        input: 'password',
        inputPlaceholder: 'أدخل كلمة المرور القديمة',
        inputAttributes: { autocapitalize: 'off', autocorrect: 'off' },
        showCancelButton: true,
        confirmButtonText: 'تحقق',
        cancelButtonText: 'إلغاء',
        showLoaderOnConfirm: true,
        preConfirm: async (enteredOldPassword) => {
          if (!enteredOldPassword) {
            Swal.showValidationMessage('يجب إدخال كلمة المرور القديمة.');
            return false;
          }
          const verificationResult = await verifyUserPassword(currentUser.phone, enteredOldPassword);
          if (verificationResult.error) {
            Swal.showValidationMessage(`كلمة المرور القديمة غير صحيحة.`);
            return false;
          }
          return true;
        },
        allowOutsideClick: () => !Swal.isLoading()
      });

      if (isConfirmed && oldPassword) {
        changePasswordCheckbox.checked = true;
        passwordFields.style.display = 'block';
        // ✅ جديد: تمكين العلم للإشارة إلى أن المستخدم قد تحقق من كلمة المرور
        isPasswordVerified = true;
      }
    });

    // Toggle password visibility
    const togglePasswordVisibility = (inputId, toggleId) => {
      const input = document.getElementById(inputId);
      const toggleIcon = document.getElementById(toggleId);
      if (input && toggleIcon) {
        toggleIcon.addEventListener('click', () => {
          const isPassword = input.type === 'password';
          input.type = isPassword ? 'text' : 'password';
          toggleIcon.classList.toggle('fa-eye');
          toggleIcon.classList.toggle('fa-eye-slash');
          // Adjust position if label exists
          const label = input.previousElementSibling;
          if (label && label.tagName === 'LABEL') {
            toggleIcon.style.top = '70%';
          }
        });
      }
    };
    togglePasswordVisibility('profile-password', 'profile-toggle-password');
    /**
     * @todo يمكن نقل الدالة `togglePasswordVisibility` إلى ملف helpers مشترك
     * إذا تم استخدامها في أماكن أخرى لتقليل التكرار. حاليًا، هي دالة محلية.
     * @function togglePasswordVisibility
     * @inner
     */
    togglePasswordVisibility('profile-confirm-password', 'profile-toggle-confirm-password');

    // Handle account deletion
    deleteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleAccountDeletion(currentUser);
    });

    // Handle save changes
    saveBtn.addEventListener('click', async () => {
      // --- Validation ---
      let isValid = true;
      const showError = (input, message) => {
        const errorDiv = document.getElementById(`${input.id}-error`);
        if (errorDiv) errorDiv.textContent = message;
        isValid = false;
      };
      const clearErrors = () => {
        document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
        isValid = true;
      };
      clearErrors();

      const username = usernameInput.value.trim();
      const phone = phoneInput.value.trim();
      const address = addressInput.value.trim();
      const password = passwordInput.value;
      const confirmPassword = confirmPasswordInput.value;

      if (!username || username.length < 8) {
        showError(usernameInput, 'الاسم مطلوب ويجب أن يكون 8 أحرف على الأقل.');
      }
      if (!phone || phone.length < 11) {
        showError(phoneInput, 'رقم الهاتف مطلوب ويجب أن يكون 11 رقمًا على الأقل.');
      }
      if (changePasswordCheckbox.checked && password !== confirmPassword) {
        showError(confirmPasswordInput, 'كلمتا المرور غير متطابقتين.');
      }
      if (!isValid) return;

      // --- Prepare and Send Data ---
      const updatedData = { user_key: currentUser.user_key };
      if (username !== currentUser.username) updatedData.username = username;
      if (phone !== currentUser.phone) updatedData.phone = phone;
      if (address !== (currentUser.Address || '')) updatedData.address = address;
      if (changePasswordCheckbox.checked && password) updatedData.password = password;

      if (Object.keys(updatedData).length === 1) {
        Swal.fire('لم يتغير شيء', 'لم تقم بإجراء أي تغييرات على بياناتك.', 'info');
        return;
      }

      // --- Password Verification before saving ---
      // إذا كان لدى المستخدم كلمة مرور، فيجب علينا التحقق منها قبل حفظ أي تغييرات،
      // إلا إذا كان قد تم التحقق منها بالفعل عند محاولة تغيير كلمة المرور.
      if (currentUser.Password && !isPasswordVerified) {
        const { value: password, isConfirmed } = await Swal.fire({
          title: 'تأكيد الهوية',
          text: 'لحفظ التغييرات، يرجى إدخال كلمة المرور الحالية.',
          input: 'password',
          inputPlaceholder: 'أدخل كلمة المرور الحالية',
          inputAttributes: { autocapitalize: 'off', autocorrect: 'off' },
          showCancelButton: true,
          confirmButtonText: 'تأكيد وحفظ',
          cancelButtonText: 'إلغاء',
          showLoaderOnConfirm: true,
          preConfirm: async (enteredPassword) => {
            if (!enteredPassword) {
              Swal.showValidationMessage('يجب إدخال كلمة المرور.');
              return false;
            }
            const verificationResult = await verifyUserPassword(currentUser.phone, enteredPassword);
            if (verificationResult.error) {
              Swal.showValidationMessage(`كلمة المرور غير صحيحة.`);
              return false;
            }
            return true; // Verification successful
          },
          allowOutsideClick: () => !Swal.isLoading()
        });

        if (!isConfirmed) return; // User cancelled
      }

      Swal.fire({ title: 'جاري حفظ التغييرات...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

      const result = await updateUser(updatedData);
      Swal.close();

      if (result && !result.error) {
        // تحديث الكائن currentUser مباشرةً لضمان أن البيانات الجديدة ستُستخدم عند إعادة فتح النافذة
        if (updatedData.username) currentUser.username = updatedData.username;
        if (updatedData.phone) currentUser.phone = updatedData.phone;
        if (updatedData.address !== undefined) currentUser.Address = updatedData.address;
        // إذا تم تغيير كلمة المرور، قم بتحديث حالتها في الكائن الحالي
        if (updatedData.password) currentUser.Password = true; // أو أي قيمة تشير إلى وجودها

        localStorage.setItem('loggedInUser', JSON.stringify(currentUser));
         
        localStorage.setItem("userType", ROLE_NUMBER_TO_STRING_MAP.get(currentUser.is_seller));
        document.getElementById("welcome-message").textContent = `أهلاً بك، ${currentUser.username}`;

        Swal.fire({
          icon: 'success',
          title: 'تم التحديث بنجاح!',
          text: result.message,
        }).then(() => {
          // Close the modal after success
          const modalLogic = setupModalLogic("profile-modal-container");
          if (modalLogic) modalLogic.close();
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'حدث خطأ',
          text: result.error || 'فشل تحديث البيانات. يرجى المحاولة مرة أخرى.',
        });
      }
    });
  });
}

/**
 * @description يعالج عملية حذف حساب المستخدم بشكل آمن.
 * تبدأ العملية بعرض رسالة تحذير لتأكيد رغبة المستخدم في الحذف.
 * إذا كان للمستخدم كلمة مرور، يتم طلبها للتحقق النهائي قبل المتابعة.
 * بعد التحقق، يتم حذف المستخدم من قاعدة البيانات، مسح بياناته من المتصفح، وإعادة توجيهه إلى الصفحة الرئيسية.
 * @function handleAccountDeletion
 * @async
 * @param {object} currentUser - كائن يحتوي على بيانات المستخدم الحالي المراد حذف حسابه.
 * @param {string} currentUser.user_key - المفتاح الفريد للمستخدم.
 * @param {string} currentUser.phone - رقم هاتف المستخدم (يُستخدم للتحقق من كلمة المرور).
 * @param {boolean} currentUser.Password - علامة تشير إلى وجود كلمة مرور.
 * @returns {Promise<void>} - يُرجع وعدًا (Promise) لا يُرجع قيمة، ويكتمل عند انتهاء عملية الحذف أو إلغائها.
 * @see verifyUserPassword
 * @see deleteUser
 */
async function handleAccountDeletion(currentUser) {
  // Close the profile modal first
  const modalLogic = setupModalLogic("profile-modal-container");
  if (modalLogic) modalLogic.close();

  const confirmationResult = await Swal.fire({
    title: 'هل أنت متأكد تمامًا؟',
    html: `
      <div style="text-align: right; color: #e74c3c; font-weight: bold;">
        سيتم حذف حسابك وجميع بياناتك نهائيًا. <br> هذا الإجراء لا يمكن التراجع عنه.
      </div>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'نعم، أفهم وأريد المتابعة',
    cancelButtonText: 'إلغاء',
    confirmButtonColor: '#d33',
  });

  if (!confirmationResult.isConfirmed) {
    return;
  }

  let canDelete = !currentUser.Password;

  if (currentUser.Password) {
    const { value: password } = await Swal.fire({
      title: 'التحقق النهائي',
      text: 'لحماية حسابك، يرجى إدخال كلمة المرور الخاصة بك لتأكيد الحذف.',
      input: 'password',
      inputPlaceholder: 'أدخل كلمة المرور',
      showCancelButton: true,
      confirmButtonText: 'تأكيد الحذف',
      cancelButtonText: 'إلغاء',
      showLoaderOnConfirm: true,
      preConfirm: async (enteredPassword) => {
        const verificationResult = await verifyUserPassword(currentUser.phone, enteredPassword);
        if (verificationResult.error) {
          Swal.showValidationMessage('كلمة المرور غير صحيحة.');
          return false;
        }
        return true;
      },
      allowOutsideClick: () => !Swal.isLoading()
    });

    if (password) {
      canDelete = true;
    }
  }

  if (canDelete) {
    Swal.fire({ title: 'جاري حذف الحساب...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const deleteResult = await deleteUser(currentUser.user_key);

    if (deleteResult && !deleteResult.error) {
      localStorage.clear();
      sessionStorage.clear();
      await Swal.fire('تم الحذف', 'تم حذف حسابك بنجاح.', 'success');
      window.location.href = 'index.html';
    } else {
      Swal.fire('خطأ', `فشل حذف الحساب: ${deleteResult.error}`, 'error');
    }
  }
}