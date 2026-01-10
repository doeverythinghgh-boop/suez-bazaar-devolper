/**
 * @file optimize_image.js
 * @description Utility script to optimize and resize images for the Suez Bazaar project.
 * Converts input images to 150x150 WebP format with high compression.
 * 
 * Usage: node optimize_image.js <input_path> <output_path>
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function optimizeImage() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('❌ Usage: node maintenance/optimize_image.js <input_path> <output_path>');
        process.exit(1);
    }

    const inputPath = args[0];
    const outputPath = args[1];

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
        console.log(`[ImageOptimizer] Processing: ${inputPath}...`);

        await sharp(inputPath)
            .resize(150, 150, {
                fit: 'cover',
                position: 'center'
            })
            .webp({
                quality: 80,
                lossless: false,
                effort: 6 // Higher CPU effort for better compression
            })
            .toFile(outputPath);

        const stats = fs.statSync(outputPath);
        const sizeKB = (stats.size / 1024).toFixed(2);

        console.log(`✅ Success! Optimized image saved to: ${outputPath}`);
        console.log(`📊 Final Size: ${sizeKB} KB (150x150 WebP)`);

    } catch (error) {
        console.error(`❌ Error optimizing image: ${error.message}`);
        process.exit(1);
    }
}

optimizeImage();
