/**
 * @file replace_banner.js
 * @description Utility script to generate a welcome banner (800x800) and replace the existing one.
 * 
 * Usage: node replace_banner.js <input_path>
 */

var sharp = require('sharp');
var path = require('path');
var fs = require('fs');

async function replaceBanner() {
    var args = process.argv.slice(2);
    if (args.length < 1) {
        console.error('❌ Usage: node replace_banner.js <input_path>');
        process.exit(1);
    }

    var inputPath = args[0];
    var outputPath = path.join('images', 'welcome_banner.png');

    try {
        console.log(`[BannerGenerator] Processing: ${inputPath}...`);

        await sharp(inputPath)
            .resize(800, 800, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 0 }
            })
            .png()
            .toFile(outputPath);

        console.log(`✅ Success! Welcome banner replaced at: ${outputPath}`);

    } catch (error) {
        console.error(`❌ Error replacing banner: ${error.message}`);
        process.exit(1);
    }
}

replaceBanner();
