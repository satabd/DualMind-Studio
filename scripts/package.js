const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
// Using PowerShell to zip to avoid dependencies.

const pkgPath = path.resolve(__dirname, '../package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version;
const name = "LLM_Orchestrator"; // Clean name

console.log(`Packaging ${name} v${version}...`);

// 1. Run Build (ensure fresh)
try {
    console.log("Running build...");
    execSync('npm run build', { stdio: 'inherit' });
} catch (e) {
    console.error("Build failed.");
    process.exit(1);
}

// 2. Zip dist folder
const zipName = `${name}_v${version}.zip`;
const distPath = path.resolve(__dirname, '../dist');

// Using tar (available on Windows 10+) to zip. 
// "tar -a -c -f output.zip source"
const tarCommand = `tar -a -c -f "${zipName}" -C "${path.dirname(distPath)}" "${path.basename(distPath)}"`;

try {
    console.log(`Creating archive: ${zipName}`);
    // Change CWD to project root for cleaner command execution
    execSync(tarCommand, { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
    console.log("Package created successfully.");
} catch (e) {
    console.error("Zipping failed:", e.message);
    process.exit(1);
}
