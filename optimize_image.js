/**
 * @file optimize_image.js
 * @description Utility script to optimize and resize images for the Suez Bazaar project.
 * Converts input images to 150x150 WebP format with high compression and allows moving them to target directories.
 * 
 * Usage: node optimize_image.js <input_path> <output_filename>
 */

var sharp = require('sharp');
var path = require('path');
var fs = require('fs');
var readline = require('readline');

/**
 * Creates a readline interface for user interaction.
 * @returns {readline.Interface} The readline interface.
 */
function createInterface() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

/**
 * Prompts the user with a question and returns the answer.
 * @param {string} query - The question to ask.
 * @returns {Promise<string>} The user's answer.
 */
function askQuestion(query) {
    var rl = createInterface();
    return new Promise(function (resolve) {
        rl.question(query, function (answer) {
            rl.close();
            resolve(answer);
        });
    });
}

/**
 * Main function to optimize image and handle user interaction for moving files.
 * @async
 */
async function optimizeImage() {
    var args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('❌ Usage: node optimize_image.js <input_path> <output_filename>');
        process.exit(1);
    }

    var inputPath = args[0];
    var outputFileName = args[1];

    // Force .webp extension if not provided
    if (!outputFileName.toLowerCase().endsWith('.webp')) {
        outputFileName += '.webp';
    }

    var tempOutputPath = path.join(process.cwd(), outputFileName);

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
                effort: 6
            })
            .toFile(tempOutputPath);

        var stats = fs.statSync(tempOutputPath);
        var sizeKB = (stats.size / 1024).toFixed(2);

        console.log(`✅ Success! Optimized image saved to: ${tempOutputPath}`);
        console.log(`📊 Final Size: ${sizeKB} KB (150x150 WebP)`);

        console.log('\n--- Move to target directory ---');
        console.log('1. images\\mainCategories');
        console.log('2. images\\subCategories');
        console.log('3. Keep here');

        var choice = await askQuestion('Select an option (1-3): ');
        var targetDir = '';

        if (choice === '1') {
            targetDir = path.join('images', 'mainCategories');
        } else if (choice === '2') {
            targetDir = path.join('images', 'subCategories');
        }

        if (targetDir) {
            var finalPath = path.join(targetDir, outputFileName);

            // Ensure target directory exists
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            fs.renameSync(tempOutputPath, finalPath);
            console.log(`🚀 File moved successfully to: ${finalPath}`);
        } else {
            console.log('ℹ️ File kept in the current directory.');
        }

    } catch (error) {
        console.error(`❌ Error optimizing image: ${error.message}`);
        process.exit(1);
    }
}

// Global variable check for var enforcement
var executionStarted = true;
optimizeImage();
