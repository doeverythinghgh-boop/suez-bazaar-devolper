/**
 * @file js/profile-modal.js
 * @description يحتوي على المنطق الخاص بنافذة تعديل الملف الشخصي للمستخدم.
 */

/**
 * @description يعرض نافذة منبثقة (Modal) لتعديل بيانات المستخدم الشخصية (الاسم، رقم الهاتف، العنوان، وكلمة المرور).
 *   يستخدم الآن بنية المودال القياسية في المشروع.
 * @function showEditProfileModal
 * @param {object} currentUser - كائن يحتوي على بيانات المستخدم الحالية التي يتم عرضها وتعديلها.
 * @returns {Promise<void>} - وعد (Promise) لا يُرجع قيمة عند الاكتمال.
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

    // --- Populate Initial Data ---
    usernameInput.value = currentUser.username || '';
    phoneInput.value = currentUser.phone || '';
    addressInput.value = currentUser.Address || '';

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
      // If the user has a password, we must verify it before saving any changes.
      if (currentUser.Password) {
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
        const updatedUser = { ...currentUser };
        if (updatedData.username) updatedUser.username = updatedData.username;
        if (updatedData.phone) updatedUser.phone = updatedData.phone;
        if (updatedData.address !== undefined) updatedUser.Address = updatedData.address;

        localStorage.setItem('loggedInUser', JSON.stringify(updatedUser));
        document.getElementById("welcome-message").textContent = `أهلاً بك، ${updatedUser.username}`;

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
 * @description يعالج عملية حذف الحساب بالكامل، بما في ذلك تأكيد المستخدم، التحقق من كلمة المرور إذا كانت موجودة،
 *   حذف المستخدم من قاعدة البيانات، ومسح بيانات الجلسة والتخزين المحلي، ثم إعادة توجيه المستخدم.
 * @function handleAccountDeletion
 * @param {object} currentUser - كائن يحتوي على بيانات المستخدم الحالي المراد حذف حسابه.
* @returns {Promise<void>} - وعد (Promise) لا يُرجع قيمة عند الاكتمال.
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