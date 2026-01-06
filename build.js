/**
 * @file build.js
 * @description Build system for creating a standalone and fully protected version.
 * Obfuscates each JavaScript file individually while preserving the folder structure in the dist directory.
 */

const fs = require('fs');
const path = require('path');
const { obfuscate } = require('javascript-obfuscator');
const { exec } = require('child_process');
const crypto = require('crypto');
const CleanCSS = require('clean-css');
const HTMLMinifier = require('html-minifier-terser');

const cleanCSS = new CleanCSS({ level: 1 });

const PROJECT_ROOT = __dirname;
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'dist');

// 1. Configuration
const EXCLUDED_DIRS = ['api', 'note', 'node_modules', 'dist', '.git', '.gemini', 'docs', 'function'];
const EXCLUDED_FILES = ['build.js', 'package.json', 'package-lock.json', 'version-watcher.js'];
const ASSETS_TO_COPY = ['assets', 'notification', 'shared', 'style', 'location', 'images', 'favicon.ico', 'manifest.json', 'js', 'pages', 'steper', 'lang'];

/**
 * Function to copy files and folders recursively
 */
function copyRecursiveSync(src, dest) {
    if (!fs.existsSync(src)) return;
    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach(childItemName => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        const ext = path.extname(src).toLowerCase();
        // Minify CSS if it's a CSS file and not already minified
        if (ext === '.css' && !src.endsWith('.min.css')) {
            try {
                const content = fs.readFileSync(src, 'utf8');
                const minified = cleanCSS.minify(content);
                if (minified.styles) {
                    fs.writeFileSync(dest, minified.styles);
                    return;
                }
            } catch (err) {
                console.error(`❌ Failed to minify CSS ${src}:`, err);
            }
        }
        // Default: just copy the file
        fs.copyFileSync(src, dest);
    }
}

/**
 * Function to find all JS files
 */
function getAllJSFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        const relativePath = path.relative(PROJECT_ROOT, fullPath);
        if (fs.statSync(fullPath).isDirectory()) {
            if (!EXCLUDED_DIRS.includes(path.basename(fullPath))) {
                getAllJSFiles(fullPath, arrayOfFiles);
            }
        } else {
            // Obfuscate files that are not external libraries and not already minified
            if (file.endsWith('.js') && !EXCLUDED_FILES.includes(file) && !file.endsWith('.min.js')) {
                arrayOfFiles.push(relativePath.replace(/\\/g, '/'));
            }
        }
    });
    return arrayOfFiles;
}

/**
 * Function to process HTML files with minification
 */
async function processAllHTMLFiles(dirPath) {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const relativePath = path.relative(PROJECT_ROOT, fullPath);

        if (fs.statSync(fullPath).isDirectory()) {
            if (!EXCLUDED_DIRS.includes(path.basename(fullPath))) {
                await processAllHTMLFiles(fullPath);
            }
        } else if (file.endsWith('.html')) {
            console.log(`📄 Minifying HTML file: ${relativePath}...`);
            const targetPath = path.join(OUTPUT_DIR, relativePath);
            const targetDir = path.dirname(targetPath);
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                const minified = await HTMLMinifier.minify(content, {
                    removeAttributeQuotes: false,
                    collapseWhitespace: true,
                    removeComments: true,
                    minifyCSS: true,
                    minifyJS: false // JS is handled separately by obfuscator
                });
                fs.writeFileSync(targetPath, minified);
            } catch (err) {
                console.warn(`⚠️ Failed to minify HTML ${relativePath}, copying instead.`, err);
                fs.copyFileSync(fullPath, targetPath);
            }
        }
    }
}

/**
 * Obfuscation settings for each file
 */
const obfuscationOptions = {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.75,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.4,
    debugProtection: true,
    debugProtectionInterval: 4000,
    disableConsoleOutput: false,
    identifierNamesGenerator: 'hexadecimal',
    renameGlobals: false, // Disabled to ensure access to global variables between files
    rotateStringArray: true,
    selfDefending: true,
    shuffleStringArray: true,
    splitStrings: true,
    stringArray: true,
    stringArrayEncoding: ['rc4'],
    stringArrayThreshold: 0.75,
    unicodeEscapeSequence: true,
    target: 'browser'
};

/**
 * Main build process
 */
async function build() {
    console.log('🏗️ Starting project build with individual obfuscation...');

    try {
        if (fs.existsSync(OUTPUT_DIR)) {
            console.log('🧹 Cleaning old dist folder (preserving .git)...');
            // Read all files/dirs in dist
            const files = fs.readdirSync(OUTPUT_DIR);
            for (const file of files) {
                // Skip .git folder
                if (file === '.git') continue;

                const curPath = path.join(OUTPUT_DIR, file);
                fs.rmSync(curPath, { recursive: true, force: true });
            }
        } else {
            fs.mkdirSync(OUTPUT_DIR);
        }

        // 1. Copy assets (Folders) except JS files which will be obfuscated
        console.log('🚚 Copying folders and assets...');
        ASSETS_TO_COPY.forEach(asset => {
            copyRecursiveSync(path.join(PROJECT_ROOT, asset), path.join(OUTPUT_DIR, asset));
        });

        // 2. Process and obfuscate all JavaScript files
        console.log('🔐 Obfuscating JS files individually...');
        const allJSFiles = getAllJSFiles(PROJECT_ROOT);

        allJSFiles.forEach(file => {
            console.log(`   - Obfuscating: ${file}`);
            const fullPath = path.join(PROJECT_ROOT, file);
            let content = fs.readFileSync(fullPath, 'utf8');

            // Wrap in IIFE to avoid global scope pollution/conflicts in SPA environments
            // This prevents re-declaration errors (e.g. Const re-declaration) when re-injecting scripts via AJAX/SPA
            content = `(function(){\n${content}\n})();`;

            try {
                const obfuscatedResult = obfuscate(content, obfuscationOptions);
                const targetPath = path.join(OUTPUT_DIR, file);
                const targetDir = path.dirname(targetPath);

                if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
                fs.writeFileSync(targetPath, obfuscatedResult.getObfuscatedCode());
            } catch (obErr) {
                console.error(`❌ Failed to obfuscate file ${file}:`, obErr);
            }
        });

        // 3. Copy HTML files
        console.log('📂 Processing and minifying HTML files...');
        await processAllHTMLFiles(PROJECT_ROOT);

        // 4. Copy individual root files
        const rootFiles = ['favicon.ico', 'manifest.json', 'sw.js', 'firebase-messaging-sw.js', 'version.json', 'offline.html', 'privacy.html', 'delete-account.html'];
        rootFiles.forEach(file => {
            const fullPath = path.join(PROJECT_ROOT, file);
            if (fs.existsSync(fullPath)) {
                if (file.endsWith('.js')) {
                    console.log(`🔐 Obfuscating root file: ${file}`);
                    let content = fs.readFileSync(fullPath, 'utf8');
                    
                    // Wrap in IIFE (Optional for root files but good for consistency)
                    content = `(function(){\n${content}\n})();`;
                    
                    const obfuscatedResult = obfuscate(content, obfuscationOptions);
                    fs.writeFileSync(path.join(OUTPUT_DIR, file), obfuscatedResult.getObfuscatedCode());
                } else {
                    fs.copyFileSync(fullPath, path.join(OUTPUT_DIR, file));
                }
            }
        });

        console.log(`\n✅ Build completed successfully!`);
        console.log(`🚀 The 'dist' folder now contains an obfuscated version of each file individually.`);

        // 5. Generate File Hashes and Update version.json
        console.log('📝 Generating file hashes and updating version.json...');
        generateFileHashes();

        // 6. Auto deploy to GitHub
        await deployToGit();

    } catch (error) {
        console.error('❌ Build process failed:', error);
        process.exit(1);
    }
}

/**
 * Function to generate SHA-256 hashes for all files in dist and update version.json
 */
function generateFileHashes() {
    const versionFilePath = path.join(OUTPUT_DIR, 'version.json');
    let versionData = {};
    const baseUrl = 'https://raw.githubusercontent.com/doeverythinghgh-boop/_bazaar/main/';

    if (fs.existsSync(versionFilePath)) {
        try {
            versionData = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'));
        } catch (e) {
            console.warn('⚠️ Could not parse existing version.json, creating new one.');
        }
    }

    const fileList = [];

    function scanDir(dir) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            if (file === '.git' || file === 'version.json') return; // Skip .git and version.json itself
            const fullPath = path.join(dir, file);
            // Handle files in dist
            const fullPathInDist = fullPath;

            if (fs.statSync(fullPathInDist).isDirectory()) {
                scanDir(fullPathInDist);
            } else {
                // IMPORTANT: Process ALL file types (encrypted/obfuscated or not).
                // This ensures version.json is a comprehensive manifest of the release.
                const relativePath = path.relative(OUTPUT_DIR, fullPathInDist).replace(/\\/g, '/');

                // Calculate hash of the ORIGINAL file in PROJECT_ROOT
                const fullPathInSource = path.join(PROJECT_ROOT, relativePath);
                let hashSum = crypto.createHash('sha256');

                if (fs.existsSync(fullPathInSource) && fs.statSync(fullPathInSource).isFile()) {
                    const fileBuffer = fs.readFileSync(fullPathInSource);
                    hashSum.update(fileBuffer);
                } else {
                    // Fallback to dist file if original not found (should not happen usually)
                    console.warn(`⚠️ Original file not found for ${relativePath}, hashing dist file instead.`);
                    const fileBuffer = fs.readFileSync(fullPathInDist);
                    hashSum.update(fileBuffer);
                }

                const hex = hashSum.digest('hex');
                const stats = fs.statSync(fullPathInDist);

                fileList.push({
                    path: baseUrl + relativePath.split('/').map(encodeURIComponent).join('/'),
                    hash: hex,
                    size: stats.size
                });
            }
        });
    }

    scanDir(OUTPUT_DIR);

    versionData.files = fileList;

    // Ensure lastUpdated is set
    // Update timestamp to ensure freshness
    versionData.lastUpdated = new Date().toISOString();

    fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2));
    console.log(`✅ Updated version.json with ${fileList.length} file hashes (Original Content).`);
}

/**
 * Function to auto push changes to GitHub
 */
function deployToGit() {
    return new Promise((resolve, reject) => {
        console.log('\n📦 Checking for changes to push to GitHub...');

        const gitCommands = [
            'git add -f .',
            `git commit -m "Auto-build update: ${new Date().toISOString()}"`,
            'git push -f origin main'
        ];

        // Execute commands sequentially in dist directory
        const executeCommands = async () => {
            for (const cmd of gitCommands) {
                try {
                    await new Promise((res, rej) => {
                        exec(cmd, { cwd: OUTPUT_DIR }, (error, stdout, stderr) => {
                            if (error) {
                                // Ignore empty commit error
                                if (cmd.includes('commit') && (stdout.includes('nothing to commit') || stderr.includes('nothing to commit'))) {
                                    console.log('   ⚠️ No changes detected to commit.');
                                    return res();
                                }
                                return rej(error);
                            }
                            res();
                        });
                    });
                } catch (err) {
                    if (cmd.includes('commit')) {
                        console.log('   ⚠️ Probably no changes to commit.');
                    } else {
                        console.error(`   ❌ Error executing: ${cmd}`, err);
                        throw err;
                    }
                }
            }
        };

        executeCommands()
            .then(() => {
                console.log('✅ Successfully pushed updates to GitHub!');
                resolve();
            })
            .catch((err) => {
                console.error('❌ Failed to push to GitHub:', err);
                // Don't fail the build if git push fails, just log it
                resolve();
            });
    });
}

build();
