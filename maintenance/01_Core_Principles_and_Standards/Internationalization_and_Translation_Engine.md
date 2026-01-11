# Internationalization and Translation Engine

Bazaar uses a dynamic, modular translation system that supports instant language switching and interface direction changes (RTL/LTR) without page reloads.

## 1. Translation Storage (`lang/`)
- **`general.json`**: Central repository for shared strings (Header, Footer, common alerts, Buttons like "OK/Cancel").
- **Module Files**: (e.g., `login.json`, `productAdd.json`) contain strings specific to those pages.
- **Structure**: `{ "key": { "ar": "...", "en": "..." } }`.

## 2. The Programming Engine (`window.langu`)
Located in `js/index.js`, the engine works through:
1. **`window.appTranslations`**: A global object holding all merged JSON translations.
2. **`window.langu(key)`**: Retrieves the string for the current language.
3. **`window.applyAppTranslations()`**: 
   - Scans the DOM for `data-lkey`, `data-lkey-placeholder`, and `data-lkey-title`.
   - Injects translated text and updates `dir` (rtl/ltr) on the HTML root.

## 3. Advanced Translation Attributes
- **`data-lkey`**: Translates `textContent`. (Note: Place inside `<span>` if icons `<i>` are present to prevent overwriting them).
- **`data-lkey-placeholder`**: Translates input placeholders.
- **`data-lkey-title`**: Translates tooltips.

## 4. Integration Bridges
- **Iframe Bridge**: Iframes (Location, Stepper) link their local `window.langu` to the parent window's function to share the translation dictionary.
- **Android Sync**: Calls `window.Android.onLanguageChanged(lang)` to update the native app's strings (`androidLang.json`).
- **Logic Constants**: Use `window.langu()` inside JS code for dynamically generated alerts.

## 5. Best Practices
- **Logical CSS**: Use `inset-inline-start` instead of `left` to handle RTL/LTR automatically.
- **Preservation**: Language preference is saved in `localStorage` and persists through logouts and refreshes.
- **Categories**: Data files like `shared/list.json` use objects for titles: `"title": { "ar": "...", "en": "..." }`.
