
const fs = require('fs');
const path = require('path');

let visited = new Set();
let flattenedLines = [];

function resolvePath(currentFile, importPath) {
    if (importPath.startsWith('@openzeppelin/')) {
        return path.resolve(process.cwd(), 'node_modules', importPath);
    }
    return path.resolve(path.dirname(currentFile), importPath);
}

function processFile(filePath) {
    const absolutePath = path.resolve(filePath);
    if (visited.has(absolutePath)) return;
    visited.add(absolutePath);

    if (!fs.existsSync(absolutePath)) {
        console.error(`File not found: ${absolutePath}`);
        return;
    }

    const content = fs.readFileSync(absolutePath, 'utf8');
    const lines = content.split('\n');

    flattenedLines.push(`// --- Start of file: ${path.relative(process.cwd(), absolutePath)} ---`);

    for (let line of lines) {
        const trimmed = line.trim();

        // Handle imports
        const importMatch = line.match(/^import\s+["'](.+)["'];/);
        const importBracesMatch = line.match(/^import\s+\{.*\}\s+from\s+["'](.+)["'];/);
        const targetImport = (importMatch && importMatch[1]) || (importBracesMatch && importBracesMatch[1]);

        if (targetImport) {
            const resolved = resolvePath(absolutePath, targetImport);
            processFile(resolved);
            continue;
        }

        // Skip other metadata in imported files
        if (trimmed.startsWith('pragma solidity') || trimmed.startsWith('// SPDX-License-Identifier')) {
            continue;
        }

        flattenedLines.push(line);
    }
    flattenedLines.push(`// --- End of file: ${path.relative(process.cwd(), absolutePath)} ---`);
    flattenedLines.push('');
}

function flatten(entryFile, outputFile) {
    visited = new Set();
    flattenedLines = [];

    console.log(`Flattening ${entryFile}...`);

    // Add header from entry file
    const entryContent = fs.readFileSync(entryFile, 'utf8');
    const licenseMatch = entryContent.match(/\/\/ SPDX-License-Identifier: .+/);
    const pragmaMatch = entryContent.match(/pragma solidity .+/);

    if (licenseMatch) flattenedLines.push(licenseMatch[0]);
    if (pragmaMatch) flattenedLines.push(pragmaMatch[0]);
    flattenedLines.push('// This file was automatically flattened for verification purposes.');
    flattenedLines.push('');

    processFile(entryFile);

    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.writeFileSync(outputFile, flattenedLines.join('\n'));
    console.log(`Success! Saved to ${outputFile}`);
}

const contracts = [
    'contracts/LuckyMilitiaRewards.sol',
    'contracts/LuckyMilitiaLeaderboard.sol',
    'contracts/LuckyMilitiaSkins.sol'
];

contracts.forEach(contract => {
    const filename = path.basename(contract);
    const output = path.join(process.cwd(), 'flattened', filename);
    flatten(contract, output);
});
