# AI Project Profile

This file serves as the primary reference for Artificial Intelligence (AI) to understand the project environment, strict rules, and file structure. This file must be read at the beginning of every session to ensure full compliance with project standards.

## 1. General and Strict Rules (from `frist.txt`)

### Code Rules
- **Global Variables**: It is strictly forbidden to use `let` or `const` for global variables. `var` must be used exclusively for global variables.
- **Documentation**:
    - All comments and documentation (JSDoc) must be in **English only**.
    - Every function, page, and component must be fully documented using **JSDoc**.
- **Language**: Any text displayed to the end user must be in **Arabic**.
- **Excluded Files**:
    - Completely ignore the contents of the `note` folder.
    - Ignore the `api/database-analysis.js` file.

### UI/UX Restrictions
- **No Hover Effects**: Using `:hover` or any interactions that depend on mouse-over is prohibited (as the application is targeted at tablets/mobiles).
- **No Gradients**: Using `linear-gradient` or any type of gradients is prohibited.
- **Flat Colors**: Use solid colors only for backgrounds.
- **Interaction**: All interactions must work by touch, and `active` or `focus` should be used for visual feedback instead of Hover.

### Quality Standards
- **Do Not Break Existing Code**: Any modification must not stop current features.
- **Clean Code Principles**: Adherence to SoC, SRP, OCP, KISS.
- **Error Handling**: Use `try...catch` to prevent application crashes, and do not ignore errors silently.

### Communication
- Conversation with the developer is in **Arabic only**.
- Plans, reports, and Markdown files are in **Arabic**.

## 2. Project Structure

Overview of the main directories in the root:

- **`api/`**: Contains backend communication files and data handling.
- **`assets/`**: Static files (images, icons, fonts).
- **`js/`**: Core JavaScript files of the project (e.g., `index.js`, `utils.js`).
- **`pages/`**: Contains various application pages (each page is usually in its own folder).
- **`style/`**: Styling files (CSS).
- **`maintenance/`**: Documentation and project rules folder (the current folder).
- **`steper/`**: Appears to contain "step" logic (Wizard/Stepper logic).
- **`location/`**: Logic for handling geographic locations.
- **`notification/`**: Notification system.
- **`lang/`**: Translation and language files.

## 3. Documentation Map

Brief explanation of the files in the `maintenance` folder:

- **`AI_PROFILE.md`**: This file (the starting point for the AI).
- **`frist.txt`**: The original file for strict rules (Source of Truth).
- **`API.md`**: Documentation of endpoints and data structure.
- **`AuthAndRouting.md`**: Documentation of the authentication and routing system between pages.
- **`BUILD_SYSTEM.md`**: Explanation of the Build System, if any.
- **`CARDPACKAGE.md`**: Documentation of shopping cart or card logic.
- **`CATEGORIES_STYLES.md`**: Guide for category formatting.
- **`DARK_MODE.md`**: Documentation of the dark mode.
- **`LOCAL_Library.md`**: Documentation of the local libraries used.
- **`LOCATION.md`**: Details about location services.
- **`NOTIFICATION.md`**: Details of the notification system.
- **`PRODUCT_SERVICE.md`**: Documentation of product services.
- **`PWA.md`**: Progressive Web App (PWA) settings.
- **`STEPER.md`**: Documentation of the stepper component.
- **`TranslationSystem.md`**: Explanation of the translation system.
- **`AndroidBridgeProtocol.md`**: Documentation of functions specific to the Android environment (Bridge).
- **`product_add_view_edit.md` / `product2_add_view_edit.md`**: Documentation of product addition, viewing, and editing processes.

## 4. Documentation Handling Instructions
- **Read First**: Before any modification, read the relevant documentation file in `maintenance`.
- **Continuous Update**: When modifying code, the corresponding documentation file must be updated to reflect the changes accurately.
- **No Deletion**: Do not delete any information from the documentation unless the associated code has been physically deleted.

---
This file was created to ensure the AI's full understanding of the project context and rules.

## 5. Mandatory Knowledge Model Construction

**Critical Warning for AI:**

You must **mandatorily**, before starting any programming task or modification, read and analyze **all files** within the `maintenance` folder without exception.

**Goal:**
Construct an accurate and comprehensive Internal Mental Model containing:
1.  All strict rules.
2.  Data Structures.
3.  Workflows.
4.  Technical Constraints.

**Why?**
Because this project contains very specific rules (such as prohibiting Hover, using `var`, file structure), and any disregard for these documents will lead to invalid code or breaking the current system.

**Commitment:**
Do not make any modifications until you confirm to yourself that you have fully absorbed the content of the `maintenance` folder. Ignoring this step is considered a total failure in performing the task.

