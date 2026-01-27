/**
 * Farcaster Account Association Generator (CommonJS Version)
 * 
 * This script helps generate the account association for your farcaster.json manifest.
 */

const { privateKeyToAccount } = require('viem/accounts');
const dotenv = require('dotenv');
const { resolve } = require('path');

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env') });

// ============ CONFIGURE THESE VALUES ============
const YOUR_FID = 748031;
const YOUR_CUSTODY_PRIVATE_KEY = process.env.PRIVATE_KEY; // Pulls from .env
const DOMAIN = 'lucky-militial.vercel.app';
// ================================================

async function generateAccountAssociation() {
    if (!YOUR_CUSTODY_PRIVATE_KEY) {
        console.error('Error: PRIVATE_KEY not found in .env');
        process.exit(1);
    }

    // Create the header
    const account = privateKeyToAccount(YOUR_CUSTODY_PRIVATE_KEY.startsWith('0x') ? YOUR_CUSTODY_PRIVATE_KEY : `0x${YOUR_CUSTODY_PRIVATE_KEY}`);
    const header = {
        fid: YOUR_FID,
        type: 'custody',
        key: account.address
    };

    // Create the payload
    const payload = {
        domain: DOMAIN
    };

    // Encode to base64url
    const toBase64Url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const headerBase64 = toBase64Url(header);
    const payloadBase64 = toBase64Url(payload);

    // Create message to sign
    const message = `${headerBase64}.${payloadBase64}`;

    // Sign the message
    const signature = await account.signMessage({ message });
    const signatureBase64 = Buffer.from(signature.startsWith('0x') ? signature.slice(2) : signature, 'hex').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    console.log('\n=== Account Association for farcaster.json ===\n');
    console.log(JSON.stringify({
        accountAssociation: {
            header: headerBase64,
            payload: payloadBase64,
            signature: signatureBase64
        }
    }, null, 4));
    console.log('\n=== Copy the above into your public/.well-known/farcaster.json ===\n');
}

generateAccountAssociation().catch(console.error);
