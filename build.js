/**
 * @file build.js
 * @description نظام بناء لإنشاء نسخة مستقلة (Standalone) ومحميّة بالكامل.
 * يقوم بتشفير كل ملف JavaScript على حدة والحفاظ على هيكل المجلدات في مجلد dist.
 */

const fs = require('fs');
const path = require('path');
const { obfuscate } = require('javascript-obfuscator');

const PROJECT_ROOT = __dirname;
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'dist');

// 1. الإعدادات
const EXCLUDED_DIRS = ['api', 'note', 'node_modules', 'dist', '.git', '.gemini', 'docs'];
const EXCLUDED_FILES = ['build.js', 'package.json', 'package-lock.json', 'version-watcher.js'];
const ASSETS_TO_COPY = ['assets', 'notification', 'shared', 'style', 'location', 'images', 'favicon.ico', 'manifest.json', 'js', 'pages', 'steper'];

/**
 * دالة لنسخ الملفات والمجلدات
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
 * دالة للبحث عن كافة ملفات JS
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
            // تشفير الملفات التي ليست مكتبات خارجية وليست مصغرة بالفعل
            if (file.endsWith('.js') && !EXCLUDED_FILES.includes(file) && !file.endsWith('.min.js')) {
                arrayOfFiles.push(relativePath.replace(/\\/g, '/'));
            }
        }
    });
    return arrayOfFiles;
}

/**
 * دالة لمعالجة ملفات HTML (نسخها فقط في هذا النظام)
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
            console.log(`📄 نسخ ملف HTML: ${relativePath}...`);
            const targetPath = path.join(OUTPUT_DIR, relativePath);
            const targetDir = path.dirname(targetPath);
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
            fs.copyFileSync(fullPath, targetPath);
        }
    });
}

/**
 * إعدادات التشفير لكل ملف
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
    renameGlobals: false, // تعطيل لضمان الوصول للمتغيرات العالمية بين الملفات
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
 * العملية الرئيسية
 */
async function build() {
    console.log('🏗️ بدء بناء المشروع بالتشفير الفردي (Individual Obfuscation)...');

    try {
        if (fs.existsSync(OUTPUT_DIR)) {
            console.log('🧹 تنظيف مجلد dist القديم...');
            fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
        }
        fs.mkdirSync(OUTPUT_DIR);

        // 1. نسخ الأصول (Folders) عدا الـ JS التي سيتم تشفيرها
        console.log('🚚 نسخ المجلدات والأصول...');
        ASSETS_TO_COPY.forEach(asset => {
            copyRecursiveSync(path.join(PROJECT_ROOT, asset), path.join(OUTPUT_DIR, asset));
        });

        // 2. معالجة وتشفير كافة ملفات JavaScript
        console.log('🔐 تشفير ملفات الـ JS بشكل منفصل...');
        const allJSFiles = getAllJSFiles(PROJECT_ROOT);

        allJSFiles.forEach(file => {
            console.log(`   - تشفير: ${file}`);
            const fullPath = path.join(PROJECT_ROOT, file);
            const content = fs.readFileSync(fullPath, 'utf8');

            try {
                const obfuscatedResult = obfuscate(content, obfuscationOptions);
                const targetPath = path.join(OUTPUT_DIR, file);
                const targetDir = path.dirname(targetPath);

                if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
                fs.writeFileSync(targetPath, obfuscatedResult.getObfuscatedCode());
            } catch (obErr) {
                console.error(`❌ فشل تشفير الملف ${file}:`, obErr);
            }
        });

        // 3. نسخ ملفات HTML
        console.log('📂 معالجة ونقل ملفات HTML...');
        processAllHTMLFiles(PROJECT_ROOT);

        // 4. نسخ الملفات الفردية في الجذر
        const rootFiles = ['favicon.ico', 'manifest.json', 'sw.js', 'firebase-messaging-sw.js', 'version.json'];
        rootFiles.forEach(file => {
            const fullPath = path.join(PROJECT_ROOT, file);
            if (fs.existsSync(fullPath)) {
                if (file.endsWith('.js')) {
                    console.log(`🔐 تشفير ملف جذري: ${file}`);
                    const content = fs.readFileSync(fullPath, 'utf8');
                    const obfuscatedResult = obfuscate(content, obfuscationOptions);
                    fs.writeFileSync(path.join(OUTPUT_DIR, file), obfuscatedResult.getObfuscatedCode());
                } else {
                    fs.copyFileSync(fullPath, path.join(OUTPUT_DIR, file));
                }
            }
        });

        console.log(`\n✅ تم الانتهاء بنجاح!`);
        console.log(`🚀 مجلد 'dist' الآن يحتوي على نسخة مشفرة لكل ملف على حدة.`);

    } catch (error) {
        console.error('❌ فشلت عملية البناء:', error);
        process.exit(1);
    }
}

build();
