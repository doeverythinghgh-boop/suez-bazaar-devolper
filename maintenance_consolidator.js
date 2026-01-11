/**
 * @file maintenance_consolidator.js
 * @description Utility script to consolidate all project documentation into a single output for AI study.
 */

const fs = require('fs');
const path = require('path');

const MAINTENANCE_DIR = path.join(__dirname, 'maintenance');
const OUTPUT_FILE = path.join(MAINTENANCE_DIR, 'FULL_MAINTENANCE_DOCS.md');

/**
 * Recursively gets all markdown files in a directory.
 * @param {string} dir - The directory to scan.
 * @param {string[]} fileList - Accumulator for file paths.
 * @returns {string[]} List of absolute file paths.
 */
function getMarkdownFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getMarkdownFiles(filePath, fileList);
        } else if (file.endsWith('.md') && file !== 'FULL_MAINTENANCE_DOCS.md') {
            fileList.push(filePath);
        }
    });
    return fileList;
}

/**
 * Main application logic to consolidate documentation.
 * @param {boolean} shouldPrint - Whether to print the content to stdout.
 * @param {boolean} shouldSave - Whether to save the content to a file.
 */
function consolidateDocs(shouldPrint = false, shouldSave = true) {
    try {
        console.log(`[INFO] Starting documentation consolidation from: ${MAINTENANCE_DIR}`);
        
        const files = getMarkdownFiles(MAINTENANCE_DIR);
        let consolidatedContent = `# 📚 Consolidated Maintenance Documentation\n\n`;
        consolidatedContent += `> Generated on: ${new Date().toISOString()}\n`;
        consolidatedContent += `> This file contains the full technical context of the Bazaar project.\n\n---\n\n`;

        files.sort().forEach(filePath => {
            const relativePath = path.relative(__dirname, filePath);
            const content = fs.readFileSync(filePath, 'utf8');
            
            consolidatedContent += `## 📄 FILE: ${relativePath}\n\n`;
            consolidatedContent += `\`\`\`markdown\n${content}\n\`\`\`\n\n`;
            consolidatedContent += `---\n\n`;
        });

        if (shouldSave) {
            fs.writeFileSync(OUTPUT_FILE, consolidatedContent, 'utf8');
            console.log(`[SUCCESS] Consolidated documentation saved to: ${OUTPUT_FILE}`);
        }

        if (shouldPrint) {
            console.log(consolidatedContent);
        }
    } catch (error) {
        console.error(`[ERROR] Failed to consolidate documentation: ${error.message}`);
        process.exit(1);
    }
}

// Simple CLI handling
const args = process.argv.slice(2);
const printMode = args.includes('--print');
const saveMode = args.includes('--save') || args.length === 0;

consolidateDocs(printMode, saveMode);
