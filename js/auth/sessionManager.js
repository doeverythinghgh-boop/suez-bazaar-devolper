/**
 * @file js/auth/sessionManager.js
 * @description Centralized session management. Handles login, logout, user updates, and syncing with global state.
 */

const SessionManager = {
    /**
     * @function init
     * @description Initializes the session from localStorage on app start.
     * Use this in index.js DOMContentLoaded.
     */
    init: () => {
        try {
            const storedUser = localStorage.getItem("loggedInUser");
            if (storedUser) {
                window.userSession = JSON.parse(storedUser);
            } else {
                window.userSession = null;
            }

            // Sync UI
            if (typeof setUserNameInIndexBar === 'function') {
                setUserNameInIndexBar();
            }

            // Global side effects if user exists
            if (window.userSession && window.userSession.user_key) {
                console.log(`[SessionManager] تم العثور على جلسة نشطة للمستخدم: ${window.userSession.user_key}`);
                const notificationsEnabled = localStorage.getItem('notifications_enabled') !== 'false';
                if (typeof setupFCM === 'function' && notificationsEnabled) {
                    console.log("[SessionManager] جاري استدعاء setupFCM عند بدء التطبيق...");
                    setupFCM();
                } else if (!notificationsEnabled) {
                    console.log("[SessionManager] الإشعارات معطلة من قبل المستخدم – تخطي التهيئة.");
                }
                if (typeof checkImpersonationMode === 'function') checkImpersonationMode();
            }
        } catch (e) {
            console.error("[SessionManager] Error initializing session:", e);
            window.userSession = null;
        }
    },

    /**
     * @function login
     * @description Logs the user in, saves session, and triggers side effects.
     * @param {object} user - The user object from API/DB.
     * @param {boolean} [redirect=true] - Whether to redirect to dashboard.
     */
    login: async (user, redirect = true) => {
        if (!user) return;

        // 1. Update State
        window.userSession = user;
        localStorage.setItem("loggedInUser", JSON.stringify(user));

        // 2. UI Updates
        if (typeof setUserNameInIndexBar === 'function') {
            setUserNameInIndexBar();
        }

        // 3. Side Effects (Notifications)
        if (typeof askForNotificationPermission === 'function') {
            console.log("[SessionManager] جاري طلب إذن الإشعارات...");
            await askForNotificationPermission();
        }
        if (typeof setupFCM === 'function') {
            console.log("[SessionManager] جاري استدعاء setupFCM لتهيئة الإشعارات...");
            setupFCM();
        }
        if (typeof checkImpersonationMode === 'function') {
            checkImpersonationMode();
        }

        // 4. Redirect
        if (redirect && typeof mainLoader === 'function') {
            // Check if admin or user to decide landing page? 
            // Current logic in login.js redirects to user-dashboard.html generally, 
            // or if admin/seller logic differs? 
            // "login.js" line 265: mainLoader("pages/user-dashboard.html")
            await mainLoader(
                "pages/user-dashboard.html",
                "index-user-container",
                0,
                undefined,
                "showHomeIcon",
                true
            );
        }
    },

    /**
     * @function logout
     * @description Logs the user out, clears data, and redirects.
     */
    logout: async () => {
        // Reuse existing robust logic if available, or reimplement
        // In the plan we decided to move signOutAndClear logic here or wrap it.
        // To avoid duplication, if signOutAndClear is global (in tools/auth.js), we can call it.
        // However, the goal is refactoring. Ideally this SHOULD contain the logic.
        // But `signOutAndClear` uses `clearAllBrowserData` etc.

        // Let's implement the core logic here to be self-contained eventually, 
        // but for now, to ensure "Zero Downtime" and reuse of `signOutAndClear` complex logic (Android callbacks etc),
        // we will mimic `signOutAndClear` steps here or call it if we haven't deleted it yet.

        // Since I haven't deleted auth.js yet, I will reimplement the logic here cleanly 
        // effectively replacing the need for auth.js's signOutAndClear over time.

        const userKey = window.userSession?.user_key;

        // 1. Android Callback
        if (typeof window.Android !== 'undefined' && window.Android.onUserLoggedOut) {
            try {
                window.Android.onUserLoggedOut(userKey);
            } catch (e) { console.error("Android logout error", e); }
        }

        // 1.1 Delete Token from Server
        if (userKey && typeof deleteTokenFromServer === 'function') {
            await deleteTokenFromServer(userKey);
        }

        localStorage.removeItem("android_fcm_key");
        localStorage.removeItem("fcm_token");

        // 2. Clear Data (Keep language and theme)
        const currentLang = localStorage.getItem("app_language");
        const currentTheme = localStorage.getItem("theme");

        if (typeof clearAllBrowserData === 'function') {
            await clearAllBrowserData();
        } else {
            localStorage.clear();
            sessionStorage.clear();
        }

        // 2.1 Restore preferences
        if (currentLang) localStorage.setItem("app_language", currentLang);
        if (currentTheme) localStorage.setItem("theme", currentTheme);

        // 3. Clear Containers (Local helper or importing logic)
        const containerIds = [
            "index-home-container", "index-search-container", "index-user-container",
            "index-productView-container", "index-productAdd-container", "index-productEdit-container",
            "index-cardPackage-container", "index-myProducts-container"
        ];
        containerIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = "";
        });

        // 4. Update State
        window.userSession = null;
        if (typeof setUserNameInIndexBar === 'function') setUserNameInIndexBar();
        if (typeof checkImpersonationMode === 'function') checkImpersonationMode();

        // 5. Redirect
        if (typeof mainLoader === 'function') {
            await mainLoader(
                "pages/login/login.html",
                "index-user-container",
                0,
                undefined,
                "showHomeIcon", true
            );
        }
    },

    /**
     * @function updateUser
     * @description Updates the current user session with partial data.
     * @param {object} updates - Object containing fields to update.
     */
    updateUser: (updates) => {
        if (!window.userSession) return;

        // Merge updates
        const updatedUser = { ...window.userSession, ...updates };

        // Save
        window.userSession = updatedUser;
        localStorage.setItem("loggedInUser", JSON.stringify(updatedUser));

        // Refresh UI
        if (typeof setUserNameInIndexBar === 'function') {
            setUserNameInIndexBar();
        }
    },

    /**
     * @function isGuest
     * @returns {boolean}
     */
    isGuest: () => {
        return window.userSession?.user_key === "guest_user";
    },

    /**
     * @function getUser
     * @returns {object|null}
     */
    getUser: () => {
        return window.userSession;
    },

    /**
     * @function impersonate
     * @description Switches current session to a target user, saving the original admin session.
     * @param {object} targetUser - The user object to switch to.
     */
    impersonate: async (targetUser) => {
        try {
            // 1. Resolve Original Admin Session
            const currentSession = JSON.parse(localStorage.getItem('loggedInUser'));
            const existingOriginal = JSON.parse(localStorage.getItem('originalAdminSession'));
            const originalAdminSession = existingOriginal || currentSession;

            if (!originalAdminSession) throw new Error("No active session to save as admin.");

            // 2. Clear current browser data (mimic logout without redirect)
            if (typeof clearAllBrowserData === 'function') {
                await clearAllBrowserData();
            } else {
                localStorage.clear();
                sessionStorage.clear();
            }

            // 3. Restore Admin Session for reference
            localStorage.setItem('originalAdminSession', JSON.stringify(originalAdminSession));

            // 4. Create and Save New Session
            const newUserSession = {
                ...targetUser,
                is_guest: false, // Target is likely a real user
                // Ensure critical fields exist
                user_key: targetUser.user_key,
                username: targetUser.username,
                phone: targetUser.phone
            };

            // Log in as the new user (without full side effects yet, relying on reload)
            // Or we can just set item and reload. 
            // adminPanel.js does: localStorage.setItem... then reload.
            localStorage.setItem('loggedInUser', JSON.stringify(newUserSession));

            // 5. Reload to apply changes
            window.location.href = 'index.html';

        } catch (error) {
            console.error("[SessionManager] Impersonation failed:", error);
            throw error;
        }
    },

    /**
     * @function stopImpersonation
     * @description Reverts to the original admin session.
     */
    stopImpersonation: async () => {
        // Future implementation if we add a "Stop Impersonating" button.
        // Currently handled by logging out (which clears originalAdminSession).
    },

    /**
     * @function isImpersonating
     * @returns {boolean}
     */
    isImpersonating: () => {
        return !!localStorage.getItem("originalAdminSession");
    }
};

