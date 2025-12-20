/**
 * @file js/auth/validators.js
 * @description Pure functions for validating authentication inputs.
 */

const AuthValidators = {
    /**
     * @function normalizePhone
     * @description Converts Indic digits to Arabic numerals and removes non-digit characters.
     * @param {string} phone - The input phone string.
     * @returns {string} - The normalized phone string.
     */
    normalizePhone: (phone) => {
        if (!phone) return "";
        const hindiToArabic = {
            "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
            "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9"
        };
        let normalized = phone.replace(/[٠-٩]/g, (d) => hindiToArabic[d]);
        return normalized.replace(/[^0-9]/g, "");
    },

    /**
     * @function validatePhone
     * @description Validates a normalized phone number.
     * @param {string} phone - The normalized phone number.
     * @returns {object} - { isValid: boolean, message: string }
     */
    validatePhone: (phone) => {
        if (!phone) {
            return { isValid: false, message: "رقم الهاتف مطلوب." };
        }
        if (phone.length < 11) {
            return { isValid: false, message: "يجب أن يتكون رقم الهاتف من 11 رقمًا على الأقل." };
        }
        return { isValid: true, message: "" };
    },

    /**
     * @function validatePassword
     * @description Validates a password.
     * @param {string} password - The password string.
     * @returns {object} - { isValid: boolean, message: string }
     */
    validatePassword: (password) => {
        if (!password) {
            return { isValid: false, message: "كلمة المرور مطلوبة." };
        }
        if (password.length < 4) {
            return { isValid: false, message: "يجب أن تكون كلمة المرور 4 أحرف على الأقل." };
        }
        return { isValid: true, message: "" };
    },

    /**
     * @function validateUsername
     * @description Validates a username.
     * @param {string} username - The username string.
     * @returns {object} - { isValid: boolean, message: string }
     */
    validateUsername: (username) => {
        if (!username) {
            return { isValid: false, message: "الاسم مطلوب." };
        }
        if (username.length < 8 || username.length > 30) {
            return { isValid: false, message: "يجب أن يكون الاسم بين 8 و 30 حرفًا." };
        }
        return { isValid: true, message: "" };
    }
};
