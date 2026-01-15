/**
 * @file asc-build.js
 * @description Automation script for AssemblyScript compilation to WebAssembly.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = __dirname;
const SOURCE_DIR = path.join(PROJECT_ROOT, 'assembly');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'js', 'wasm');
const ASC_PATH = path.join(PROJECT_ROOT, 'node_modules', '.bin', 'asc');

/**
 * Main build process for AssemblyScript
 */
function buildWasm() {
    console.log('🏗️ Starting AssemblyScript build process...');

    // 1. Ensure Output Directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        console.log(`📂 Created output directory: ${OUTPUT_DIR}`);
    }

    // 2. Check for Source directory
    if (!fs.existsSync(SOURCE_DIR)) {
        console.error(`❌ Source directory not found: ${SOURCE_DIR}`);
        return;
    }

    // 3. Compile each .ts file in assembly folder
    const files = fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith('.ts'));

    files.forEach(file => {
        const inputPath = path.join(SOURCE_DIR, file);
        const outputBase = path.basename(file, '.ts');
        const wasmOutput = path.join(OUTPUT_DIR, `${outputBase}.wasm`);
        const jsOutput = path.join(OUTPUT_DIR, `${outputBase}.js`);

        console.log(`🚀 Compiling: ${file} -> WASM`);

        try {
            // Build command
            // --optimize: enables optimizations
            // --outFile: WASM destination
            // --bindings: generates glue code (esm, cjs, or raw)
            const cmd = `"${ASC_PATH}" "${inputPath}" --optimize --outFile "${wasmOutput}" --bindings esm`;
            
            execSync(cmd, { stdio: 'inherit' });
            console.log(`✅ Compilation successful for ${file}`);
        } catch (error) {
            console.error(`❌ Failed to compile ${file}:`, error.message);
        }
    });

    console.log('\n✨ AssemblyScript build complete.');
}

// Check if node_modules is installed
if (!fs.existsSync(path.join(PROJECT_ROOT, 'node_modules'))) {
    console.error('❌ node_modules not found. Please run "npm install" first.');
} else {
    buildWasm();
}
