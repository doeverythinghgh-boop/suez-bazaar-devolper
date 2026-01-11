# Coding Standards and Conventions

## 1. Variable Scoping Rules
> [!IMPORTANT]
> **NO `let` or `const` in Global Scope**
> All variables declared in the global scope (outside of functions or modules) must use the `var` keyword. This ensures backward compatibility with certain legacy scripting environments used in the project. `let` and `const` should only be used inside block-level scopes or local functions where appropriate.

## 2. Documentation First Policy
Every file, function, and component must be fully documented using **JSDoc** standards.
- File headers must describe the file's responsibility.
- Function documentation must include `@param`, `@returns`, and a description of the logic.

## 3. Language Standards
- **Development Language**: English. All code comments, variable names, and documentation files must be written in English.
- **User Interface Language**: Arabic. Any text displayed to the final user (alerts, buttons, labels) must be strictly in Arabic.

## 4. UI/UX Restrictions
- **No Hover Effects**: Do not use `:hover` selectors or hover-dependent logic. Use `:active` or explicit click events instead.
- **No Gradients**: Use solid, flat colors only for all backgrounds and UI elements.
- **Responsive by Design**: All components must work correctly on mobile touchscreens and desktop environments without modification.

## 5. Maintenance and Safety
- **Error Handling**: Every API call or sensitive logic must be wrapped in `try...catch` blocks.
- **No Feature Loss**: Changes must be implemented without breaking existing features, states, or behaviors.
- **Atomic Commits**: Ensure code changes are logically grouped and modular.
