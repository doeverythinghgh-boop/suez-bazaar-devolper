# Dark Mode Architecture Guide

> [!IMPORTANT]
> **Very Important Warning:** When creating any new element or modifying any existing element in the project, you **must** immediately consider Dark Mode.
> Any code written with hardcoded colors or without using approved variables is considered **incomplete and unacceptable**.
> Please review the "Developer Checklist" section at the end of this file before committing any changes.

## Overview
 The dark mode system in this project relies on a **CSS Variables** strategy linked to the `dark-theme` class, which is added to the `<body>` element.

This system ensures high performance, ease of maintenance, and immediate application of changes without needing to reload the page.

---

## 1. Core Architecture

### 1.1 Variables File (`style/variables.css`)
This is the "mastermind" of colors. All colors are defined as variables in `:root` (for light mode) and redefined within `body.dark-theme` (for dark mode).

```css
:root {
    /* Light Mode */
    --bg-color-white: #ffffff;
    --text-color-dark: #333333;
    --primary-color: #667eea;
}

body.dark-theme {
    /* Dark Mode */
    --bg-color-white: #1e1e1e;
    --text-color-dark: #ffffff;
    --primary-color: #7688eb; /* Slight lightening for eye comfort */
}
```

### 1.2 Usage in Files
It is strictly prohibited to use Hex color codes (e.g., `#ffffff`) or names (e.g., `white`) directly in CSS files. Instead, we use:
```css
.card {
    background-color: var(--bg-color-white); /* Changes automatically */
    color: var(--text-color-dark);
}
```

---

## 2. JavaScript Implementation

### 2.1 Saving Preferences (`localStorage`)
The user's preference is stored in `localStorage` under the key `theme`. Possible values: `dark` or `light`.

### 2.2 Initialization at Startup (`js/user-dashboard.js` & `index.html`)
When the application loads, `localStorage` is checked, and the class is applied immediately to prevent Flash of Unstyled Content (FOUC).

```javascript
/* Simplified example */
const isDark = localStorage.getItem('theme') === 'dark';
if (isDark) {
    document.body.classList.add('dark-theme');
}
```

### 2.3 Toggle Mode
The button responsible for toggling performs the following:
1. Inverts the current state.
2. Updates `document.body.classList`.
3. Saves the new value in `localStorage`.

---

## 3. Handling Special Components

### 3.1 Pop-up Windows (SweetAlert2)
The SweetAlert2 library creates DOM elements outside the normal application scope. To solve the problem of hardcoded colors in them, we did the following:

1. **Overriding Default Styles:** The `style/index.css` and `style/modals-and-dialogs.css` files were modified to force windows to use our variables.
2. **Custom Classes:** A `.modern-swal-popup` class was created to enforce the background `var(--bg-color-white)` and texts `var(--text-color-medium)`.

### 3.2 Stepper System
The Stepper sometimes works inside an `iframe` (`stepper-only.html` file).
* **Challenge:** The `iframe` is a separate page that does not inherit classes from the parent page.
* **Solution:**
    1. A dedicated `steper/css/variables.css` was created containing `body.dark-theme` definitions.
    2. `steper/css/components.css` was updated to use these variables.
    3. The `stepper-only.html` file contains a script that listens for `localStorage` changes and applies the theme automatically upon loading or when it changes on the main page.

### 3.3 Dynamically Generated Elements (Inline Styles)
We encountered an issue with JavaScript generating HTML containing `style="background: white;"`.
* **Solution:** `style="..."` was replaced with Semantic CSS Classes.
    * _Example:_ Instead of `style="background: #d4edda; color: #155724;"`
    * _It became:_ `class="stepper-list-item-success"`
    * This class was defined in CSS to support both modes.

---

## 4. Developer Checklist

When adding a new feature or a new page, adhere to the following:

1. **Do not use hardcoded colors:** Always use `var(--variable-name)`.
2. **Do not use Inline Styles for colors:** Avoid `div.style.background = 'red'`. Use `classList.add`.
3. **Check contrast:** Ensure text is readable in both modes.
4. **SweetAlert2:** Do not put colors in the `html` property inside `Swal.fire`. Use `customClass`.

---

## 5. Important Files for Review
* `style/variables.css`: The main color dictionary.
* `style/modals-and-dialogs.css`: Pop-up window styles.
* `steper/css/variables.css`: Variables specific to the stepper system.
* `js/user-dashboard.js`: Toggle button logic.
