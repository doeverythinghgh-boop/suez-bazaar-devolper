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

var cleanCSS = new CleanCSS({ level: 1 });
var PROJECT_ROOT = __dirname;
var OUTPUT_DIR = path.join(PROJECT_ROOT, '..', 'suez-bazaar-publish');

// 1.1 Workspace Configuration
var WORKSPACE_CONFIG = [
    {
        name: 'suez-bazaar-devolper',
        url: 'https://github.com/doeverythinghgh-boop/suez-bazaar-devolper.git',
        path: PROJECT_ROOT
    },
    {
        name: 'suez-bazaar-android',
        url: 'https://github.com/doeverythinghgh-boop/suez-bazaar.git', // Keeping original URL unless you want to rename it on GitHub too
        path: path.join(PROJECT_ROOT, '..', 'suez-bazaar-android')
    },
    {
        name: '_bazaar',
        url: 'https://github.com/doeverythinghgh-boop/_bazaar.git',
        path: path.join(PROJECT_ROOT, '..', 'suez-bazaar-publish')
    }
];

/**
 * Ensures all workspace folders exist, are git repositories, and are synchronized.
 * @returns {Promise<void>}
 */
async function ensureWorkspace() {
    console.log('🔍 Checking Workspace integrity...');
    for (const repo of WORKSPACE_CONFIG) {
        console.log(`📂 Checking: ${repo.name}...`);

        // 1. Check if directory exists
        if (!fs.existsSync(repo.path)) {
            console.log(`   🚀 Directory missing. Cloning ${repo.name}...`);
            await new Promise((resolve, reject) => {
                exec(`git clone ${repo.url} "${repo.path}"`, (error) => {
                    if (error) return reject(new Error(`Failed to clone ${repo.name}: ${error.message}`));
                    resolve();
                });
            });
        }

        // 2. Check if it's a git repository
        const gitPath = path.join(repo.path, '.git');
        if (!fs.existsSync(gitPath)) {
            console.log(`   🔧 Not a git repository. Initializing ${repo.name}...`);
            await new Promise((resolve, reject) => {
                const setupCmd = `git init && git remote add origin ${repo.url}`;
                exec(setupCmd, { cwd: repo.path }, (error) => {
                    if (error) return reject(new Error(`Failed to init git in ${repo.name}: ${error.message}`));
                    resolve();
                });
            });
        }
    }

    // 4. Create Workspace File if missing
    createWorkspaceFile();

    console.log('✨ Workspace check complete.\n');
}

/**
 * Creates the VS Code workspace file in the parent directory if it doesn't exist.
 * @returns {void}
 */
function createWorkspaceFile() {
    var workspaceFilePath = path.join(PROJECT_ROOT, '..', 'suez-bazaar-devolper.code-workspace');

    if (fs.existsSync(workspaceFilePath)) {
        return;
    }

    console.log('📝 Creating Workspace file...');
    var workspaceContent = {
        folders: WORKSPACE_CONFIG.map(repo => ({
            name: repo.name,
            path: repo.name // Using relative paths since the file is in the parent dir
        })),
        settings: {
            "liveServer.settings.port": 5504,
            "liveServer.settings.multiRootWorkspaceName": "suez-bazaar-devolper"
        }
    };

    try {
        fs.writeFileSync(workspaceFilePath, JSON.stringify(workspaceContent, null, 4));
        console.log(`   ✅ Workspace file created at: ${workspaceFilePath}`);
    } catch (err) {
        console.warn('   ⚠️ Failed to create workspace file:', err.message);
    }
}

// 1. Configuration
var EXCLUDED_DIRS = ['api', 'note', 'node_modules', 'dist', '.git', '.gemini', 'docs', 'function'];
var EXCLUDED_FILES = ['build.js', 'package.json', 'package-lock.json', 'version-watcher.js'];
var ASSETS_TO_COPY = ['assets', 'notification', 'shared', 'style', 'location', 'images', 'favicon.ico', 'manifest.json', 'js', 'pages', 'steper', 'lang', 'androidLang.json'];

/**
 * Function to copy files and folders recursively
 * @param {string} src - Source path
 * @param {string} dest - Destination path
 * @returns {void}
 */
function copyRecursiveSync(src, dest) {
    if (!fs.existsSync(src)) return;
    var stats = fs.statSync(src);
    if (stats.isDirectory()) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach(function (childItemName) {
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
 * @param {string} dirPath - Directory path to scan
 * @param {string[]} arrayOfFiles - Array to accumulate file paths
 * @returns {string[]} - Array of JavaScript file paths
 */
function getAllJSFiles(dirPath, arrayOfFiles = []) {
    var files = fs.readdirSync(dirPath);
    files.forEach(function (file) {
        var fullPath = path.join(dirPath, file);
        var relativePath = path.relative(PROJECT_ROOT, fullPath);
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
 * @param {string} dirPath - Directory path to scan
 * @returns {Promise<void>}
 */
async function processAllHTMLFiles(dirPath) {
    var files = fs.readdirSync(dirPath);
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var fullPath = path.join(dirPath, file);
        var relativePath = path.relative(PROJECT_ROOT, fullPath);

        if (fs.statSync(fullPath).isDirectory()) {
            if (!EXCLUDED_DIRS.includes(path.basename(fullPath))) {
                await processAllHTMLFiles(fullPath);
            }
        } else if (file.endsWith('.html')) {
            console.log(`📄 Minifying HTML file: ${relativePath}...`);
            var targetPath = path.join(OUTPUT_DIR, relativePath);
            var targetDir = path.dirname(targetPath);
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

            try {
                var content = fs.readFileSync(fullPath, 'utf8');
                var minified = await HTMLMinifier.minify(content, {
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
var obfuscationOptions = {
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
 * Automatically increments the patch version in the root version.json file.
 * @returns {void}
 */
function bumpVersion() {
    var rootVersionFile = path.join(PROJECT_ROOT, 'version.json');
    if (!fs.existsSync(rootVersionFile)) return;

    try {
        var content = fs.readFileSync(rootVersionFile, 'utf8');
        var data = JSON.parse(content);

        if (data.version) {
            var parts = data.version.split('.').map(Number);
            if (parts.length === 3) {
                var oldVersion = data.version;
                parts[2]++; // Increment patch
                data.version = parts.join('.');
                // Update root version.json so the change is permanent in source
                fs.writeFileSync(rootVersionFile, JSON.stringify(data, null, 2));
                console.log(`\n🚀 [Auto-Version] Build detected. Version bumped: ${oldVersion} -> ${data.version}`);
            }
        }
    } catch (e) {
        console.error("⚠️ Failed to bump version in root:", e);
    }
}

/**
 * Main build process
 * @returns {Promise<void>}
 */
async function build() {
    console.log('🏗️ Starting project build with individual obfuscation...');

    // 0. Ensure Workspace is set up and synced
    await ensureWorkspace();

    // 0.1 Bump version in root before copying
    bumpVersion();

    try {
        if (fs.existsSync(OUTPUT_DIR)) {
            console.log('🧹 Cleaning old dist folder (preserving .git)...');
            // Read all files/dirs in dist
            var files = fs.readdirSync(OUTPUT_DIR);
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                // Skip .git folder
                if (file === '.git') continue;

                var curPath = path.join(OUTPUT_DIR, file);
                fs.rmSync(curPath, { recursive: true, force: true });
            }
        } else {
            fs.mkdirSync(OUTPUT_DIR);
        }

        // 1. Copy assets (Folders) except JS files which will be obfuscated
        console.log('🚚 Copying folders and assets...');
        ASSETS_TO_COPY.forEach(function (asset) {
            copyRecursiveSync(path.join(PROJECT_ROOT, asset), path.join(OUTPUT_DIR, asset));
        });

        // 2. Process and obfuscate all JavaScript files
        console.log('🔐 Obfuscating JS files individually...');
        var allJSFiles = getAllJSFiles(PROJECT_ROOT);

        allJSFiles.forEach(function (file) {
            console.log(`   - Obfuscating: ${file}`);
            var fullPath = path.join(PROJECT_ROOT, file);
            var content = fs.readFileSync(fullPath, 'utf8');

            try {
                // Generate unique prefix to avoid collision of helper functions between files
                // Prefix with 'v' to ensure it starts with a letter (valid JS identifier)
                var safePrefix = 'v' + crypto.createHash('md5').update(file).digest('hex').substring(0, 4) + '_';

                var fileOptions = {
                    ...obfuscationOptions,
                    identifiersPrefix: safePrefix
                };

                var obfuscatedResult = obfuscate(content, fileOptions);
                var obfuscatedCode = obfuscatedResult.getObfuscatedCode();

                // Post-process to replace const/let with var to allow safe re-declaration in SPA environments
                // This prevents "Identifier already declared" errors when navigating between pages.
                obfuscatedCode = obfuscatedCode.replace(/\bconst\b/g, 'var').replace(/\blet\b/g, 'var');

                var targetPath = path.join(OUTPUT_DIR, file);
                var targetDir = path.dirname(targetPath);

                if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
                fs.writeFileSync(targetPath, obfuscatedCode);
            } catch (obErr) {
                console.error(`❌ Failed to obfuscate file ${file}:`, obErr);
            }
        });

        // 3. Copy HTML files
        console.log('📂 Processing and minifying HTML files...');
        await processAllHTMLFiles(PROJECT_ROOT);

        // 4. Copy individual root files
        var rootFiles = ['favicon.ico', 'manifest.json', 'sw.js', 'firebase-messaging-sw.js', 'version.json', 'offline.html', 'privacy.html', 'delete-account.html'];
        rootFiles.forEach(function (file) {
            var fullPath = path.join(PROJECT_ROOT, file);
            if (fs.existsSync(fullPath)) {
                if (file.endsWith('.js')) {
                    console.log(`🔐 Obfuscating root file: ${file}`);
                    var content = fs.readFileSync(fullPath, 'utf8');

                    // Generate unique prefix
                    // Prefix with 'v' to ensure it starts with a letter
                    var safePrefix = 'v' + crypto.createHash('md5').update(file).digest('hex').substring(0, 4) + '_';
                    var fileOptions = {
                        ...obfuscationOptions,
                        identifiersPrefix: safePrefix
                    };

                    var obfuscatedResult = obfuscate(content, fileOptions);
                    var obfuscatedCode = obfuscatedResult.getObfuscatedCode();

                    // Post-process to replace const/let with var
                    obfuscatedCode = obfuscatedCode.replace(/\bconst\b/g, 'var').replace(/\blet\b/g, 'var');

                    fs.writeFileSync(path.join(OUTPUT_DIR, file), obfuscatedCode);
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

        // 7. Copy to Android assets folder
        copyToAndroidAssets();

    } catch (error) {
        console.error('❌ Build process failed:', error);
        process.exit(1);
    }
}

/**
 * Function to generate SHA-256 hashes for all files in dist and update version.json
 * @returns {void}
 */
function generateFileHashes() {
    var versionFilePath = path.join(OUTPUT_DIR, 'version.json');
    var versionData = {};
    var baseUrl = 'https://raw.githubusercontent.com/doeverythinghgh-boop/_bazaar/main/';

    if (fs.existsSync(versionFilePath)) {
        try {
            versionData = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'));
        } catch (e) {
            console.warn('⚠️ Could not parse existing version.json, creating new one.');
        }
    }

    var fileList = [];

    /**
     * Helper to scan directory recursively
     * @param {string} dir - Directory to scan
     */
    function scanDir(dir) {
        var files = fs.readdirSync(dir);
        files.forEach(function (file) {
            if (file === '.git' || file === 'version.json') return; // Skip .git and version.json itself
            var fullPath = path.join(dir, file);
            // Handle files in dist
            var fullPathInDist = fullPath;

            if (fs.statSync(fullPathInDist).isDirectory()) {
                scanDir(fullPathInDist);
            } else {
                // IMPORTANT: Process ALL file types (encrypted/obfuscated or not).
                // This ensures version.json is a comprehensive manifest of the release.
                var relativePath = path.relative(OUTPUT_DIR, fullPathInDist).replace(/\\/g, '/');

                // Calculate hash of the ORIGINAL file in PROJECT_ROOT
                var fullPathInSource = path.join(PROJECT_ROOT, relativePath);
                var hashSum = crypto.createHash('sha256');

                if (fs.existsSync(fullPathInSource) && fs.statSync(fullPathInSource).isFile()) {
                    var fileBuffer = fs.readFileSync(fullPathInSource);
                    hashSum.update(fileBuffer);
                } else {
                    // Fallback to dist file if original not found (should not happen usually)
                    console.warn(`⚠️ Original file not found for ${relativePath}, hashing dist file instead.`);
                    var fileBuffer = fs.readFileSync(fullPathInDist);
                    hashSum.update(fileBuffer);
                }

                var hex = hashSum.digest('hex');
                var stats = fs.statSync(fullPathInDist);

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
 * @returns {Promise<void>}
 */
function deployToGit() {
    return new Promise(function (resolve, reject) {
        console.log('\n📦 Checking for changes to push to GitHub...');

        var gitCommands = [
            'git fetch origin main',
            'git reset --soft origin/main',
            'git add -f .',
            `git commit -m "Auto-build update: ${new Date().toISOString()}"`,
            'git push -f origin main'
        ];

        // Execute commands sequentially in dist directory
        var executeCommands = async function () {
            for (var i = 0; i < gitCommands.length; i++) {
                var cmd = gitCommands[i];
                try {
                    await new Promise(function (res, rej) {
                        exec(cmd, { cwd: OUTPUT_DIR }, function (error, stdout, stderr) {
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
            .then(function () {
                console.log('✅ Successfully pushed updates to GitHub!');
                resolve();
            })
            .catch(function (err) {
                console.error('❌ Failed to push to GitHub:', err);
                // Don't fail the build if git push fails, just log it
                resolve();
            });
    });
}

/**
 * Function to copy dist files to Android assets folder
 * @returns {void}
 */
function copyToAndroidAssets() {
    console.log('\n📱 Copying files to Android assets folder...');

    var androidAssetsPath = path.join(PROJECT_ROOT, '..', 'suez-bazaar-android', 'app', 'src', 'main', 'assets');

    // Check if Android project exists
    if (!fs.existsSync(androidAssetsPath)) {
        console.warn('⚠️ Android assets folder not found. Skipping copy.');
        console.warn(`   Expected path: ${androidAssetsPath}`);
        return;
    }

    try {
        // Clean existing assets (except .gitkeep if exists)
        if (fs.existsSync(androidAssetsPath)) {
            var files = fs.readdirSync(androidAssetsPath);
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                if (file === '.gitkeep') continue;
                var curPath = path.join(androidAssetsPath, file);
                fs.rmSync(curPath, { recursive: true, force: true });
            }
        }

        // Copy all files from dist to Android assets
        var filesToCopy = fs.readdirSync(OUTPUT_DIR);
        for (var j = 0; j < filesToCopy.length; j++) {
            var fileToCopy = filesToCopy[j];
            // Skip .git folder
            if (fileToCopy === '.git') continue;

            var srcPath = path.join(OUTPUT_DIR, fileToCopy);
            var destPath = path.join(androidAssetsPath, fileToCopy);

            if (fs.statSync(srcPath).isDirectory()) {
                copyRecursiveSync(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }

        console.log('✅ Successfully copied files to Android assets folder!');
        console.log(`   Destination: ${androidAssetsPath}`);
    } catch (error) {
        console.error('❌ Failed to copy to Android assets:', error);
    }
}

build();
