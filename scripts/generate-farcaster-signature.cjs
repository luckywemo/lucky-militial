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

    const account = privateKeyToAccount(YOUR_CUSTODY_PRIVATE_KEY.startsWith('0x') ? YOUR_CUSTODY_PRIVATE_KEY : `0x${YOUR_CUSTODY_PRIVATE_KEY}`);

    // VARIANT 1: Standard (Mixed-case address, header.payload)
    const header = { fid: YOUR_FID, type: 'custody', key: account.address };
    const payload = { domain: DOMAIN };
    const hB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const pB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const msg = `${hB64}.${pB64}`;
    const sig = await account.signMessage({ message: msg });
    const sigB64 = Buffer.from(sig).toString('base64url');

    // VARIANT 2: Lowercase (Lowercase address, header.payload)
    const headerLc = { fid: YOUR_FID, type: 'custody', key: account.address.toLowerCase() };
    const hB64Lc = Buffer.from(JSON.stringify(headerLc)).toString('base64url');
    const msgLc = `${hB64Lc}.${pB64}`;
    const sigLc = await account.signMessage({ message: msgLc });
    const sigB64Lc = Buffer.from(sigLc).toString('base64url');

    console.log('\n=== OPTION A: Standard (Mixed-case) ===\n');
    console.log(JSON.stringify({ accountAssociation: { header: hB64, payload: pB64, signature: sigB64 } }, null, 4));

    console.log('\n=== OPTION B: Lowercase Address ===\n');
    console.log(JSON.stringify({ accountAssociation: { header: hB64Lc, payload: pB64, signature: sigB64Lc } }, null, 4));

    console.log('\n=== Try Option A first. If it fails, try Option B. ===\n');
}

generateAccountAssociation().catch(console.error);
