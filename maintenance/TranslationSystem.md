# Unified Localization Guide

The "Bazaar" project relies on a central dynamic translation system designed to gradually support all parts of the project. This system allows for switching languages (e.g., Arabic and English) with an immediate change in interface direction (RTL/LTR) without needing to reload the site.

---

## 1. Translation File Structure

Texts are organized in the `lang/` folder according to a modular structure that relies on automatic merging:

### A. General File (`general.json`)
The primary file and central repository for all texts that recur across the system. This file aims to prevent duplication of the same keys in translation files for other pages, and includes:
*   Header and Footer elements.
*   Unified alert and confirmation messages.
*   General terms (e.g., "OK", "Cancel", "Save").
*   Network status and time messages.
*   Any text that appears in more than one place within the application.

### B. Page Files (`pageName.json`)
For each new page or module (e.g., `login`, `profile`, `products`), an independent JSON file is created containing only the texts specific to that interface. This facilitates maintenance and prevents file bloat.

---

## 2. Central Programming Engine

The system operates through three main pillars in `js/index.js`:

1.  **Global Store (`window.appTranslations`)**: A single object into which all loaded JSON files are merged to become the active application "dictionary".
2.  **Fetch Function (`window.langu(key)`)**: The function responsible for extracting text based on the translation key and the user's current language in `localStorage`.
3.  **Comprehensive Application Function (`window.applyAppTranslations()`)**:
    *   Updates the page direction (`dir`) and language tag (`lang`) in the HTML root (`#index-html-root`).
    *   Scans the DOM and translates any element carrying the following keys:
        *   `data-lkey`: To translate the element's text content (`textContent`).
        *   `data-lkey-placeholder`: To translate placeholder text within input fields.
        *   `data-lkey-title`: To translate tooltips that appear when hovering over the element (`title`).
    *   Resynchronizes sensitive elements (e.g., username in the header).

---

## 3. Attribute and Text Translation (Advanced Attributes)

*   **Icon and Symbol Preservation**:
    *   **Very Important**: When translating buttons or titles containing icons or symbols (`<i>` or `<svg>`), the text to be translated **must** be placed inside a `<span>` tag carrying `data-lkey`, instead of placing the attribute on the parent element.
    *   **Correct Example**:
        ```html
        <button><i class="fas fa-save"></i> <span data-lkey="save_btn">Save</span></button>
        ```
    *   **Incorrect Example** (will cause the icon to disappear):
        ```html
        <button data-lkey="save_btn"><i class="fas fa-save"></i> Save</button>
        ```

*   **Tooltips**: We use the `data-lkey-title` attribute to translate texts that appear when hovering over an element (Attribute `title`).

*   **Input Placeholders**: We use the `data-lkey-placeholder` attribute to translate placeholder texts within `input` and `textarea`.
    *   **Warning**: Using `data-lkey-attr="placeholder"` is not supported and may not work correctly. Always use `data-lkey-placeholder` for this purpose.

---

## 4. Data Internationalization

When dealing with large JSON files containing data (e.g., `shared/list.json` for categories), the following structure is followed:
1.  **Value Conversion**: Converting text fields (e.g., `title`) from simple text to a language object: `"title": { "ar": "...", "en": "..." }`.
2.  **Programmatic Consumption**: Components that read this data (e.g., `CategoryModal`) must programmatically select the appropriate language:
    ```javascript
    const displayTitle = typeof titleObj === 'object' ? titleObj[window.app_language] : titleObj;
    ```

---

## 5. Logic and Animation Texts

For components that rely on JavaScript to generate texts or animations (e.g., the header):
*   `window.langu("key")` is called directly within the code to receive the translated text.
*   For recurring lists (e.g., header taglines), keys are stored in `general.json` with sequential names (`tagline_1`, `tagline_2`) and called via a loop.

---

## 6. Integration with Dynamic Loading System (`mainLoader`)

The `mainLoader` system in `js/forms.js` ensures that translations are automatically applied when any new page or module is loaded:
*   As soon as HTML loading and script execution are finished, `mainLoader` calls `window.applyAppTranslations()`.
*   This ensures that elements carrying `data-lkey` attributes in dynamically loaded pages will be translated as soon as they appear.

---

## 7. Alerts and Modals

To ensure localization of pop-up windows (SweetAlert2), one of two methods is followed:

### A. Using Unified Helpers (`AuthUI`)
It is always preferred to use the `AuthUI` object in `js/auth/uiHelpers.js` for recurring tasks, as it is internally translated automatically:
*   `AuthUI.showLoading(title, text)`: Displays a loading indicator.
*   `AuthUI.showSuccess(title, text)`: Displays a success message.
*   `AuthUI.showError(title, text)`: Displays an error message.
*   `AuthUI.confirmPassword(title, text)`: Requests password confirmation.

### B. Direct Call (`Swal.fire`)
When full customization is needed, `window.langu()` must be called for every text displayed to the user:
```javascript
Swal.fire({
    title: window.langu("key_title"),
    text: window.langu("key_text"),
    confirmButtonText: window.langu("alert_confirm_btn"),
    cancelButtonText: window.langu("alert_cancel_btn")
});
```

---

## 8. How to Start Translating a New Module (Page)

1.  **Create the File**: Add a new file in the `lang/` folder named after the page (e.g., `myPage.json`).
2.  **Write the Keys**: Add texts in the format `{ "ar": "...", "en": "..." }`.
3.  **Update Registration**: Add a command to load the new file in the `loadIndexTranslations()` function within `js/index.js` to merge it into the global object.
4.  **Name the Elements**: Add `data-lkey` to elements in the page's HTML file.
5.  **Logical Formatting**: Ensure the page's CSS file uses **Logical Properties** to ensure both directions work:
    *   Use `inset-inline-start/end` instead of `left/right`.
    *   Use `padding-inline-start` instead of `padding-left`.
    *   Use `text-align: start` instead of `text-align: right`.

---

---

## 10. Iframe Translation Bridge (Isolated Components)

For components running inside an `iframe` (such as the `Location` module), which cannot directly access the global `window.appTranslations` of the parent window, a bridge mechanism is implemented:

1.  **Bridge Function**: A specific logic is added to the iframe's HTML header to link its local `window.langu` to the parent window's function:
    ```javascript
    window.langu = (key) => {
        if (window.parent && typeof window.parent.langu === 'function') {
            return window.parent.langu(key);
        }
        return key; // Fallback to key if parent is not accessible
    };
    ```
2.  **Manual Application**: Since the iframe has its own DOM life cycle, it must manually call its own translation application function (e.g., `applyLocationTranslations()`) upon `DOMContentLoaded`.

---

## 11. Offline Page Localization (`offline.html`)

The offline page is a special case as it may need to work when the main application scripts or translation files cannot be fetched.

1.  **Self-Contained Logic**: The page includes a mini-translation script that detects the language from `localStorage`.
2.  **Dual-Stage Loading**:
    *   **Attempt Fetch**: It first tries to fetch `lang/general.json` and apply translations dynamically.
    *   **Hardcoded Fallback**: If the fetch fails (due to no internet), it uses hardcoded default translations embedded within the script to ensure the user always sees a readable message in their preferred language.

---

## 12. Preserving Preferences

The system ensures the user's selected language remains even in the following cases:
*   **Logout**: `SessionManager` saves the language before clearing data and resets it immediately to ensure the interface remains in the user's preferred language even after logout.
*   **Page Refresh**: The language is retrieved from `localStorage` as soon as the application starts and before any element is rendered.

---

## 13. Native Android Localization (`androidLang.json`)

To ensure a seamless user experience, the native Android app container also synchronizes its language with the web's state.

1.  **File Source**: The native app uses `androidLang.json` (located in the root/site folder) to translate native-only strings (e.g., "Preparing...", "Checking for updates", system dialogs).
2.  **Synchronization Flow**:
    *   **Bridge Call**: When the web app calls `window.Android.onLanguageChanged(lang)`, the native `LocalizationManager` is immediately updated.
    *   **Silent Updates**: Since `androidLang.json` is part of the `version.json` file list, it is automatically updated on the device when translation changes are pushed to the GitHub repository.
3.  **Fallback**: If the updated file is not on the filesystem, the app falls back to a bundled version in the APK's assets.
