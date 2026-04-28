const fs = require('fs');
const path = require('path');

const packagePath = path.resolve(__dirname, '../package.json');
const manifestPath = path.resolve(__dirname, '../public/manifest.json');

// Read Metadata
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Parse Version
const versionParts = pkg.version.split('.').map(Number);
if (versionParts.length !== 3) {
    console.error(`Invalid version format: ${pkg.version}`);
    process.exit(1);
}

// Increment Patch
versionParts[2]++;
const newVersion = versionParts.join('.');

console.log(`Bumping version: ${pkg.version} -> ${newVersion}`);

// Update Objects
pkg.version = newVersion;
manifest.version = newVersion;

// Write Files
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 4), 'utf8');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4), 'utf8');

console.log('Version updated successfully.');
