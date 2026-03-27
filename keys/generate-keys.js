const crypto = require('crypto');
const fs = require('fs');

// Generate Access Token Key Pair
const { publicKey: accessPublicKey, privateKey: accessPrivateKey } =
    crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });

// Generate Refresh Token Key Pair
const { publicKey: refreshPublicKey, privateKey: refreshPrivateKey } =
    crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });

// Base64 encode for environment variables
const accessPrivateBase64 = Buffer.from(accessPrivateKey).toString('base64');
const accessPublicBase64 = Buffer.from(accessPublicKey).toString('base64');
const refreshPrivateBase64 = Buffer.from(refreshPrivateKey).toString('base64');
const refreshPublicBase64 = Buffer.from(refreshPublicKey).toString('base64');

// Create .env snippet
const envContent = `
# JWT Keys (Generated ${new Date().toISOString()})
JWT_ACCESS_PRIVATE_KEY=${accessPrivateBase64}
JWT_ACCESS_PUBLIC_KEY=${accessPublicBase64}
JWT_REFRESH_PRIVATE_KEY=${refreshPrivateBase64}
JWT_REFRESH_PUBLIC_KEY=${refreshPublicBase64}
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
`;

// Save to file
fs.writeFileSync('jwt-keys.env', envContent);

console.log('✅ JWT keys generated successfully!');
console.log('📁 Keys saved to: jwt-keys.env');
console.log('\n📋 Copy these to your .env file:\n');
console.log(envContent);

// Optionally save individual key files for backup
fs.writeFileSync('keys/access-private.pem', accessPrivateKey);
fs.writeFileSync('keys/access-public.pem', accessPublicKey);
fs.writeFileSync('keys/refresh-private.pem', refreshPrivateKey);
fs.writeFileSync('keys/refresh-public.pem', refreshPublicKey);
console.log('\n💾 Key files also saved to keys/ directory');
