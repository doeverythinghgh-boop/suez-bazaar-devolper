
/**
 <user_rules>
\.gemini\GEMINI.md هل تحترمة
 MEMORY[user_global] 
 npm run auto-version
 * 
يضمن حساب الهوامش الداخلية ضمن العرض الكلي للعنصر
 * 
 * @file note/code.js
 * @description A collection of code notes, snippets, and temporary test calls.
 * This file is not structured as a module but contains various JavaScript examples or debug code.
 */

          mainLoader("./pages/home.html","index-home-container",0,undefined,"hiddenHomeIcon");
mainLoader(
    "./pages/login.html",
    "index-user-container",
    0,
    undefined,
    "showHomeIcon",true
  );

/////////////////////////////////////////////////////
/**
 * @constant
 * @type {object|null}
 * @description Stores the logged-in user's data parsed from localStorage.
 */
  const user = JSON.parse(localStorage.getItem("loggedInUser"));

//userSession.user_key != "guest_user" 
//userSession.user_key
//  /////////////////////////////////////////////////////////
/*

## General Rules
-Do not create global variables using let or const. All global variables must be declared using var
- Ignore all files inside the `note` folder completely.
- Ignore file `api/database-analysis.js`.
- Write all comments and documentation using the **English language only**.
- Any text that appears to the **end user must be written in Arabic**.
- Every page, every function, and every component must be **fully documented using JSDoc**.

## Code Safety & Integrity

- You must implement all changes **without losing any existing features, states, or behaviors** in the project.
- Do not introduce any breaking changes, runtime errors, or unexpected behavior.
- Existing logic, data flow, and application behavior must remain intact.

## Code Quality Standards

- Follow clean code principles and best practices, including:
  - Maintainability
  - Readability
  - Modularity
  - Separation of Concerns (SoC)
  - Single Responsibility Principle (SRP)
  - Open/Closed Principle (OCP)
  - Keep It Simple, Stupid (KISS)
- Ensure code is well-structured, easy to understand, and easy to extend.
- Use `try...catch` blocks appropriately to handle errors safely and prevent application crashes.
- Never silence errors without proper logging or handling.

## UI / UX Restrictions

- **Do not use any hover effects** (`:hover`, hover-based animations, hover-based transitions, or hover-dependent interactions).
- **Do not use gradient backgrounds** of any kind (`linear-gradient`, `radial-gradient`, `conic-gradient`, or image-based gradients).
- Use **solid, flat colors only** for all backgrounds.
- All UI interactions must work correctly on touch devices and must not rely on hover states.
- Visual feedback must be implemented using safe alternatives such as `active`, `focus`, or explicit user actions.

## Documentation & Implementation Rules

- This is a **documentation-first task**.
- No functional or behavioral changes are allowed unless explicitly required.
- Documentation must be accurate, complete, and reflect the actual behavior of the code.
- File headers must clearly describe the purpose and responsibility of each file.

## Clarification Requirement

- If any requirement is unclear, ambiguous, inaccurate, or has more than one possible implementation approach, **you must ask for clarification before proceeding**.
- Do not make assumptions.
- This ensures the task is completed fully, accurately, and without errors.

## Conversation and Chat
- Always keep the conversation between us in Arabic only.
- All created plans, reports, and Markdown (.md) files must be written in Arabic.
## maintenance
The maintenance/ folder contains documentation that explains the project’s logic and how it works.
It must be read and fully understood before making any changes.
After understanding it, you must build an internal (mental/logical) model of how the project operates and interact with the code accordingly to ensure accuracy and avoid breaking the logic or losing any features.
You may update the files inside the maintenance/ folder if you make changes to the original code.
## Final
- If you understand all of the above, write: "Thank you for your attention."


*/


