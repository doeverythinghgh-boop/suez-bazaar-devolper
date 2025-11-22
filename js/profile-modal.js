/**
 * @file js/profile-modal.js
 * @description يحتوي على المنطق الخاص بنافذة تعديل الملف الشخصي للمستخدم.
 */

/**
 * @description يعرض نافذة منبثقة (Modal) لتعديل بيانات المستخدم الشخصية (الاسم، رقم الهاتف، العنوان، وكلمة المرور).
 *   يتضمن منطق التحقق من صحة المدخلات، ومطالبة المستخدم بكلمة المرور القديمة لتغييرها،
 *   وإمكانية حذف الحساب.
 * @function showEditProfileModal
 * @param {object} currentUser - كائن يحتوي على بيانات المستخدم الحالية التي يتم عرضها وتعديلها.
 * @returns {Promise<void>} - وعد (Promise) لا يُرجع قيمة عند الاكتمال.
 * @see handleAccountDeletion
 * @see verifyUserPassword
 * @see updateUser
 */
async function showEditProfileModal(currentUser) {
  const { value: formValues } = await Swal.fire({
    title: 'تعديل بياناتك الشخصية',
    html: `
      <div style="text-align: right; display: flex; flex-direction: column; gap: 1rem;">
        <input id="swal-username" class="swal2-input" placeholder="الاسم" value="${currentUser.username || ''}">
        <input id="swal-phone" class="swal2-input" placeholder="رقم الهاتف" value="${currentUser.phone || ''}">
        <input id="swal-address" class="swal2-input" placeholder="العنوان (اختياري)" value="${currentUser.Address || ''}">
        <hr style="border-top: 1px solid #eee; margin: 0.5rem 0;">
        <p style="font-size: 0.9rem; color: #555;">لتغيير كلمة المرور، أدخل كلمة المرور الجديدة أدناه.</p>
        <div class="swal2-password-container">
          <input type="password" id="swal-password" class="swal2-input" placeholder="كلمة المرور الجديدة (اختياري)">
          <i class="fas fa-eye swal2-password-toggle-icon" id="swal-toggle-password"></i>
        </div>
        <div class="swal2-password-container">
          <input type="password" id="swal-confirm-password" class="swal2-input" placeholder="تأكيد كلمة المرور الجديدة">
          <i class="fas fa-eye swal2-password-toggle-icon" id="swal-toggle-confirm-password"></i>
        </div>
      </div>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'حفظ التغييرات',
    cancelButtonText: 'إلغاء',
    footer: `<a href="#" id="swal-delete-account-btn" class="swal-delete-link">حذف الحساب</a>`,
    showLoaderOnConfirm: true,
    didOpen: () => {
      // وظيفة تبديل عرض كلمة المرور
      const togglePasswordVisibility = (inputId, toggleId) => {
        const passwordInput = document.getElementById(inputId);
        const toggleIcon = document.getElementById(toggleId);
        toggleIcon.addEventListener('click', () => {
          const isPassword = passwordInput.type === 'password';
          passwordInput.type = isPassword ? 'text' : 'password';
          toggleIcon.classList.toggle('fa-eye');
          toggleIcon.classList.toggle('fa-eye-slash');
        });
      };
      togglePasswordVisibility('swal-password', 'swal-toggle-password');
      togglePasswordVisibility('swal-confirm-password', 'swal-toggle-confirm-password');

      // ربط حدث النقر بزر حذف الحساب
      const deleteBtn = document.getElementById('swal-delete-account-btn');
      deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleAccountDeletion(currentUser); // استدعاء دالة الحذف
      });
    },
    preConfirm: async () => {
      const username = document.getElementById('swal-username').value;
      const phone = document.getElementById('swal-phone').value;
      const address = document.getElementById('swal-address').value;
      const password = document.getElementById('swal-password').value;
      const confirmPassword = document.getElementById('swal-confirm-password').value;

      if (!username.trim() || username.length < 8) {
        Swal.showValidationMessage('الاسم مطلوب ويجب أن يكون 8 أحرف على الأقل.');
        return false;
      }
      if (!phone.trim() || phone.length < 11) {
        Swal.showValidationMessage('رقم الهاتف مطلوب ويجب أن يكون 11 رقمًا على الأقل.');
        return false;
      }
      if (password && password !== confirmPassword) {
        Swal.showValidationMessage('كلمتا المرور غير متطابقتين.');
        return false;
      }

      if (password && currentUser.Password) {
        const { value: oldPassword } = await Swal.fire({
          title: 'التحقق من الهوية',
          text: 'لتغيير كلمة المرور، الرجاء إدخال كلمة المرور القديمة.',
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

        if (!oldPassword) {
          Swal.showValidationMessage('تم إلغاء تغيير كلمة المرور.');
          return false;
        }
      }

      const updatedData = { user_key: currentUser.user_key };
      if (username !== currentUser.username) updatedData.username = username;
      if (phone !== currentUser.phone) updatedData.phone = phone;
      if (address !== (currentUser.Address || '')) updatedData.address = address;
      if (password) updatedData.password = password;

      if (Object.keys(updatedData).length === 1) {
         Swal.fire('لم يتغير شيء', 'لم تقم بإجراء أي تغييرات على بياناتك.', 'info');
         return false;
      }

      return updatedData;
    }
  });

  if (formValues) {
    const result = await updateUser(formValues);

    if (result && !result.error) {
      const updatedUser = { ...currentUser };
      if (formValues.username) updatedUser.username = formValues.username;
      if (formValues.phone) updatedUser.phone = formValues.phone;
      if (formValues.address !== undefined) updatedUser.Address = formValues.address;

      localStorage.setItem('loggedInUser', JSON.stringify(updatedUser));
      document.getElementById("welcome-message").textContent = `أهلاً بك، ${updatedUser.username}`;

      Swal.fire({
        icon: 'success',
        title: 'تم التحديث بنجاح!',
        text: result.message,
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'حدث خطأ',
        text: result.error || 'فشل تحديث البيانات. يرجى المحاولة مرة أخرى.',
      });
    }
  }
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
  Swal.close();

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