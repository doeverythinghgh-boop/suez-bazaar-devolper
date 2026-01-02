/**
 * @file build.js
 * @description Build system for creating a standalone and fully protected version.
 * Obfuscates each JavaScript file individually while preserving the folder structure in the dist directory.
 */

const fs = require('fs');
const path = require('path');
const { obfuscate } = require('javascript-obfuscator');
const { exec } = require('child_process');

const PROJECT_ROOT = __dirname;
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'dist');

// 1. Configuration
const EXCLUDED_DIRS = ['api', 'note', 'node_modules', 'dist', '.git', '.gemini', 'docs'];
const EXCLUDED_FILES = ['build.js', 'package.json', 'package-lock.json', 'version-watcher.js'];
const ASSETS_TO_COPY = ['assets', 'notification', 'shared', 'style', 'location', 'images', 'favicon.ico', 'manifest.json', 'js', 'pages', 'steper'];

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
 * Function to process HTML files (copy only in this system)
 */
function processAllHTMLFiles(dirPath) {
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        const relativePath = path.relative(PROJECT_ROOT, fullPath);

        if (fs.statSync(fullPath).isDirectory()) {
            if (!EXCLUDED_DIRS.includes(path.basename(fullPath))) {
                processAllHTMLFiles(fullPath);
            }
        } else if (file.endsWith('.html')) {
            console.log(`📄 Copying HTML file: ${relativePath}...`);
            const targetPath = path.join(OUTPUT_DIR, relativePath);
            const targetDir = path.dirname(targetPath);
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
            fs.copyFileSync(fullPath, targetPath);
        }
    });
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
            const content = fs.readFileSync(fullPath, 'utf8');

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
        console.log('📂 Processing and copying HTML files...');
        processAllHTMLFiles(PROJECT_ROOT);

        // 4. Copy individual root files
        const rootFiles = ['favicon.ico', 'manifest.json', 'sw.js', 'firebase-messaging-sw.js', 'version.json'];
        rootFiles.forEach(file => {
            const fullPath = path.join(PROJECT_ROOT, file);
            if (fs.existsSync(fullPath)) {
                if (file.endsWith('.js')) {
                    console.log(`🔐 Obfuscating root file: ${file}`);
                    const content = fs.readFileSync(fullPath, 'utf8');
                    const obfuscatedResult = obfuscate(content, obfuscationOptions);
                    fs.writeFileSync(path.join(OUTPUT_DIR, file), obfuscatedResult.getObfuscatedCode());
                } else {
                    fs.copyFileSync(fullPath, path.join(OUTPUT_DIR, file));
                }
            }
        });

        console.log(`\n✅ Build completed successfully!`);
        console.log(`🚀 The 'dist' folder now contains an obfuscated version of each file individually.`);

        // 5. Auto deploy to GitHub
        await deployToGit();

    } catch (error) {
        console.error('❌ Build process failed:', error);
        process.exit(1);
    }
}

/**
 * Function to auto push changes to GitHub
 */
function deployToGit() {
    return new Promise((resolve, reject) => {
        console.log('\n📦 Checking for changes to push to GitHub...');

        const gitCommands = [
            'git add .',
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
