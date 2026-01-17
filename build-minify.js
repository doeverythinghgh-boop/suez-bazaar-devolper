/**
 * @file build-minify.js
 * @description Build system focused on minification (reducing size) rather than obfuscation.
 * Uses Terser to remove comments, white-space and mangle variables.
 */

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
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
        url: 'https://github.com/doeverythinghgh-boop/suez-bazaar.git',
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
 */
async function ensureWorkspace() {
    console.log('🔍 Checking Workspace integrity...');
    for (const repo of WORKSPACE_CONFIG) {
        if (!fs.existsSync(repo.path)) {
            console.log(`   🚀 Directory missing. Cloning ${repo.name}...`);
            await new Promise((resolve, reject) => {
                exec(`git clone ${repo.url} "${repo.path}"`, (error) => {
                    if (error) return reject(new Error(`Failed to clone ${repo.name}: ${error.message}`));
                    resolve();
                });
            });
        }
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
    createWorkspaceFile();
    console.log('✨ Workspace check complete.\n');
}

function createWorkspaceFile() {
    var workspaceFilePath = path.join(PROJECT_ROOT, '..', 'suez-bazaar-devolper.code-workspace');
    if (fs.existsSync(workspaceFilePath)) return;
    var workspaceContent = {
        folders: WORKSPACE_CONFIG.map(repo => ({ name: repo.name, path: repo.name })),
        settings: { "liveServer.settings.port": 5504, "liveServer.settings.multiRootWorkspaceName": "suez-bazaar-devolper" }
    };
    try {
        fs.writeFileSync(workspaceFilePath, JSON.stringify(workspaceContent, null, 4));
    } catch (err) { }
}

// 1. Configuration
var EXCLUDED_DIRS = ['api', 'note', 'node_modules', 'dist', '.git', '.gemini', 'docs', 'function'];
var EXCLUDED_FILES = ['build.js', 'build-minify.js', 'package.json', 'package-lock.json', 'version-watcher.js'];
var ASSETS_TO_COPY = ['assets', 'notification', 'shared', 'style', 'location', 'images', 'favicon.ico', 'manifest.json', 'js', 'pages', 'steper', 'lang', 'androidLang.json'];

/**
 * Terser Minification Options
 * إعدادات ضغط الكود باستخدام Terser
 * 
 * CRITICAL: mangle must be FALSE to preserve function names for Android bridge compatibility
 * مهم جداً: يجب أن يكون mangle = false للحفاظ على أسماء الدوال للتوافق مع جسر الأندرويد
 */
var terserOptions = {
    // mangle: تغيير أسماء المتغيرات والدوال لأسماء قصيرة (a, b, c...)
    // يجب أن يكون false لأن الأندرويد يستدعي دوال بأسمائها الأصلية مثل:
    // saveNotificationFromAndroid, onWebAppReady, etc.
    mangle: false,

    // compress: خيارات ضغط الكود وإزالة الأجزاء غير المستخدمة
    compress: {
        passes: 2,              // عدد مرات المرور على الكود للضغط (2 = ضغط أفضل)
        dead_code:false,        // إزالة الكود الذي لا يتم تنفيذه أبداً
        drop_debugger:false,    // إزالة جمل debugger من الكود
        ecma: 5                 // التوافق مع ECMAScript 5 (دعم المتصفحات القديمة)
    },

    // format: خيارات تنسيق الكود الناتج
    format: {
        comments: false,        // إزالة جميع التعليقات (JSDoc, //, /* */)
        ecma: 5                 // تنسيق الكود بما يتوافق مع ES5
    }
};

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
        if (ext === '.css' && !src.endsWith('.min.css')) {
            try {
                const content = fs.readFileSync(src, 'utf8');
                const minified = cleanCSS.minify(content);
                if (minified.styles) {
                    fs.writeFileSync(dest, minified.styles);
                    return;
                }
            } catch (err) { }
        }
        fs.copyFileSync(src, dest);
    }
}

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
            if (file.endsWith('.js') && !EXCLUDED_FILES.includes(file) && !file.endsWith('.min.js')) {
                arrayOfFiles.push(relativePath.replace(/\\/g, '/'));
            }
        }
    });
    return arrayOfFiles;
}

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
            console.log(`📄 Minifying HTML: ${relativePath}...`);
            var targetPath = path.join(OUTPUT_DIR, relativePath);
            var targetDir = path.dirname(targetPath);
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
            try {
                var content = fs.readFileSync(fullPath, 'utf8');
                var minified = await HTMLMinifier.minify(content, {
                    collapseWhitespace: true,
                    removeComments: true,
                    minifyCSS: true
                });
                fs.writeFileSync(targetPath, minified);
            } catch (err) {
                fs.copyFileSync(fullPath, targetPath);
            }
        }
    }
}

function bumpVersion() {
    var rootVersionFile = path.join(PROJECT_ROOT, 'version.json');
    if (!fs.existsSync(rootVersionFile)) return;
    try {
        var content = fs.readFileSync(rootVersionFile, 'utf8');
        var data = JSON.parse(content);
        if (data.version) {
            var parts = data.version.split('.').map(Number);
            if (parts.length === 3) {
                parts[2]++;
                data.version = parts.join('.');
                fs.writeFileSync(rootVersionFile, JSON.stringify(data, null, 2));
                console.log(`\n🚀 [Auto-Version] Minified build detected. Version: ${data.version}`);
            }
        }
    } catch (e) { }
}

async function build() {
    console.log('🏗️ Starting project MINIFIED build (Size optimization focus)...');
    await ensureWorkspace();
    bumpVersion();

    try {
        if (fs.existsSync(OUTPUT_DIR)) {
            var files = fs.readdirSync(OUTPUT_DIR);
            for (var i = 0; i < files.length; i++) {
                if (files[i] === '.git') continue;
                fs.rmSync(path.join(OUTPUT_DIR, files[i]), { recursive: true, force: true });
            }
        } else {
            fs.mkdirSync(OUTPUT_DIR);
        }

        console.log('🚚 Copying folders and assets...');
        ASSETS_TO_COPY.forEach(asset => copyRecursiveSync(path.join(PROJECT_ROOT, asset), path.join(OUTPUT_DIR, asset)));

        console.log('📦 Minifying JS files with Terser...');
        var allJSFiles = getAllJSFiles(PROJECT_ROOT);

        for (const file of allJSFiles) {
            console.log(`   - Minifying: ${file}`);
            var fullPath = path.join(PROJECT_ROOT, file);
            var content = fs.readFileSync(fullPath, 'utf8');
            try {
                var minifiedResult = await minify(content, terserOptions);
                var minifiedCode = minifiedResult.code;

                var targetPath = path.join(OUTPUT_DIR, file);
                var targetDir = path.dirname(targetPath);
                if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
                fs.writeFileSync(targetPath, minifiedCode);
            } catch (minErr) {
                console.error(`❌ Failed to minify ${file}:`, minErr);
                // Fallback: Copy if minification fails
                fs.copyFileSync(fullPath, path.join(OUTPUT_DIR, file));
            }
        }

        await processAllHTMLFiles(PROJECT_ROOT);

        var rootFiles = ['sw.js', 'firebase-messaging-sw.js', 'version.json', 'favicon.ico', 'manifest.json', 'offline.html', 'privacy.html', 'delete-account.html'];
        for (const file of rootFiles) {
            var fullPath = path.join(PROJECT_ROOT, file);
            if (!fs.existsSync(fullPath)) continue;
            if (file.endsWith('.js')) {
                console.log(`📦 Minifying root JS: ${file}`);
                var content = fs.readFileSync(fullPath, 'utf8');
                try {
                    var minifiedResult = await minify(content, terserOptions);
                    var minifiedCode = minifiedResult.code;
                    fs.writeFileSync(path.join(OUTPUT_DIR, file), minifiedCode);
                } catch (err) {
                    fs.copyFileSync(fullPath, path.join(OUTPUT_DIR, file));
                }
            } else {
                fs.copyFileSync(fullPath, path.join(OUTPUT_DIR, file));
            }
        }

        console.log(`\n✅ Minified Build completed!`);
        generateFileHashes();
        await deployToGit();
        copyToAndroidAssets();

    } catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
}

function generateFileHashes() {
    var versionFilePath = path.join(OUTPUT_DIR, 'version.json');
    var versionData = {};
    var baseUrl = 'https://raw.githubusercontent.com/doeverythinghgh-boop/_bazaar/main/';
    if (fs.existsSync(versionFilePath)) {
        try { versionData = JSON.parse(fs.readFileSync(versionFilePath, 'utf8')); } catch (e) { }
    }
    var fileList = [];
    function scanDir(dir) {
        fs.readdirSync(dir).forEach(file => {
            if (file === '.git' || file === 'version.json') return;
            var fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                scanDir(fullPath);
            } else {
                var relativePath = path.relative(OUTPUT_DIR, fullPath).replace(/\\/g, '/');
                var hashSum = crypto.createHash('sha256');
                hashSum.update(fs.readFileSync(path.join(PROJECT_ROOT, relativePath)));
                fileList.push({
                    path: baseUrl + relativePath,
                    hash: hashSum.digest('hex'),
                    size: fs.statSync(fullPath).size
                });
            }
        });
    }
    scanDir(OUTPUT_DIR);
    versionData.files = fileList;
    versionData.lastUpdated = new Date().toISOString();
    fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2));
    console.log(`✅ version.json updated (${fileList.length} files).`);
}

function deployToGit() {
    return new Promise((resolve) => {
        console.log('\n📦 Pushing minified build to GitHub...');
        var cmds = [
            'git fetch origin main',
            'git reset --soft origin/main',
            'git add -f .',
            `git commit -m "Auto-build (Minified): ${new Date().toISOString()}"`,
            'git push -f origin main'
        ];
        var execNext = async () => {
            for (const cmd of cmds) {
                try {
                    await new Promise((res, rej) => {
                        exec(cmd, { cwd: OUTPUT_DIR }, (error, stdout, stderr) => {
                            if (error && cmd.includes('commit') && (stdout + stderr).includes('nothing to commit')) return res();
                            if (error) return rej(error);
                            res();
                        });
                    });
                } catch (err) { }
            }
        };
        execNext().then(() => {
            console.log('✅ GitHub deployment complete.');
            resolve();
        });
    });
}

function copyToAndroidAssets() {
    console.log('\n📱 Syncing with Android assets...');
    var androidPath = path.join(PROJECT_ROOT, '..', 'suez-bazaar-android', 'app', 'src', 'main', 'assets');
    if (!fs.existsSync(androidPath)) fs.mkdirSync(androidPath, { recursive: true });
    fs.readdirSync(androidPath).forEach(file => {
        if (file !== '.gitkeep') fs.rmSync(path.join(androidPath, file), { recursive: true, force: true });
    });
    fs.readdirSync(OUTPUT_DIR).forEach(file => {
        if (file === '.git') return;
        var src = path.join(OUTPUT_DIR, file);
        var dest = path.join(androidPath, file);
        if (fs.statSync(src).isDirectory()) {
            copyRecursiveSync(src, dest);
        } else {
            fs.copyFileSync(src, dest);
        }
    });
    console.log('✅ Android assets synced.');
}

build();
