/**
 * @file generate_pwa_icons.js
 * @description Utility script to generate PWA icons (192x192 and 512x512) from a single source image.
 * 
 * Usage: node generate_pwa_icons.js <input_path>
 */

var sharp = require('sharp');
var path = require('path');
var fs = require('fs');

/**
 * Main function to generate project icons.
 * @async
 */
async function generateIcons() {
    var args = process.argv.slice(2);
    if (args.length < 1) {
        console.error('❌ Usage: node generate_pwa_icons.js <input_path>');
        process.exit(1);
    }

    var inputPath = args[0];
    var iconDir = path.join('images', 'icons');

    // Ensure icons directory exists
    if (!fs.existsSync(iconDir)) {
        fs.mkdirSync(iconDir, { recursive: true });
    }

    var sizes = [192, 512];

    try {
        console.log(`[IconGenerator] Processing: ${inputPath}...`);

        // Generate PWA Icons
        for (var i = 0; i < sizes.length; i++) {
            var size = sizes[i];
            var outputName = 'icon-' + size + 'x' + size + '.png';
            var outputPath = path.join(iconDir, outputName);

            await sharp(inputPath)
                .resize(size, size, {
                    fit: 'contain',
                    background: { r: 255, g: 255, b: 255, alpha: 0 }
                })
                .png()
                .toFile(outputPath);

            console.log(`✅ Generated: ${outputName}`);
        }

        // Generate Favicon
        var faviconPath = path.join(process.cwd(), 'favicon.png');
        await sharp(inputPath)
            .resize(64, 64, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 0 }
            })
            .png()
            .toFile(faviconPath);
        console.log(`✅ Generated: favicon.png (64x64)`);

        console.log('\n🚀 All icons generated successfully!');

    } catch (error) {
        console.error(`❌ Error generating icons: ${error.message}`);
        process.exit(1);
    }
}

// Global execution flag
var iconsGenerationStarted = true;
generateIcons();
