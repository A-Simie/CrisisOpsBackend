/**
 * Script to generate RS256 key pairs for JWT authentication
 * Run with: node scripts/generate-keys.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log(' Generating RS256 key pairs for CrisisOps JWT...\n');

// Generate Access Token keys
const accessKeyPair = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// Generate Refresh Token keys
const refreshKeyPair = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// Create keys directory
const keysDir = path.join(__dirname, '..', 'keys');
if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir, { recursive: true });
}

// Save PEM files
fs.writeFileSync(path.join(keysDir, 'access-private.pem'), accessKeyPair.privateKey);
fs.writeFileSync(path.join(keysDir, 'access-public.pem'), accessKeyPair.publicKey);
fs.writeFileSync(path.join(keysDir, 'refresh-private.pem'), refreshKeyPair.privateKey);
fs.writeFileSync(path.join(keysDir, 'refresh-public.pem'), refreshKeyPair.publicKey);

// Generate base64 encoded versions for .env
const accessPrivateBase64 = Buffer.from(accessKeyPair.privateKey).toString('base64');
const accessPublicBase64 = Buffer.from(accessKeyPair.publicKey).toString('base64');
const refreshPrivateBase64 = Buffer.from(refreshKeyPair.privateKey).toString('base64');
const refreshPublicBase64 = Buffer.from(refreshKeyPair.publicKey).toString('base64');

console.log('✅ Keys generated and saved to ./keys/ directory\n');
console.log('📋 Add these to your .env file:\n');
console.log('─'.repeat(60));
console.log(`JWT_ACCESS_PRIVATE_KEY=${accessPrivateBase64}`);
console.log('');
console.log(`JWT_ACCESS_PUBLIC_KEY=${accessPublicBase64}`);
console.log('');
console.log(`JWT_REFRESH_PRIVATE_KEY=${refreshPrivateBase64}`);
console.log('');
console.log(`JWT_REFRESH_PUBLIC_KEY=${refreshPublicBase64}`);
console.log('─'.repeat(60));
console.log('\n⚠️  Keep these keys secret! Do not commit them to git.');
