/**
 * @file assembly/index.ts
 * @description Sample AssemblyScript file for WebAssembly.
 */

/**
 * Adds two integers and returns the result.
 * @param a - First integer
 * @param b - Second integer
 * @returns The sum of a and b
 */
export function add(a: i32, b: i32): i32 {
  return a + b;
}

/**
 * Multiplies two integers (High performance example).
 */
export function multiply(a: i32, b: i32): i32 {
  return a * b;
}
