/**
 * Farcaster Account Association Generator (Comprehensive)
 * 
 * Generates multiple variants of the signature to debug validation issues.
 */

const { privateKeyToAccount } = require('viem/accounts');
const { keccak256, toHex } = require('viem');
const dotenv = require('dotenv');
const { resolve } = require('path');

dotenv.config({ path: resolve(process.cwd(), '.env') });

const YOUR_FID = 748031;
const YOUR_CUSTODY_PRIVATE_KEY = process.env.PRIVATE_KEY;
const DOMAIN = 'lucky-militial.vercel.app';

async function generate() {
    if (!YOUR_CUSTODY_PRIVATE_KEY) {
        console.error('Error: PRIVATE_KEY not found in .env');
        process.exit(1);
    }

    const account = privateKeyToAccount(YOUR_CUSTODY_PRIVATE_KEY.startsWith('0x') ? YOUR_CUSTODY_PRIVATE_KEY : `0x${YOUR_CUSTODY_PRIVATE_KEY}`);

    // Header & Payload (Standard)
    const header = { fid: YOUR_FID, type: 'custody', key: account.address };
    const payload = { domain: DOMAIN };

    const hB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const pB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const msg = `${hB64}.${pB64}`;

    console.log(`\nFID: ${YOUR_FID}`);
    console.log(`Address: ${account.address}`);
    console.log(`Domain: ${DOMAIN}`);
    console.log(`Message: ${msg}`);

    // SIGNATURE 1: Standard Ethereum Sig (Long format, Base64url of Hex string)
    // Most likely for legacy compatibility
    const sigLong = await account.signMessage({ message: msg });
    const sigLongB64 = Buffer.from(sigLong).toString('base64url');

    // SIGNATURE 2: Raw Bytes Sig (Short format, Base64url of Bytes)
    // The "Newer" standard for JFS
    const sigShortB64 = Buffer.from(sigLong.slice(2), 'hex').toString('base64url');

    // SIGNATURE 3: Raw Signature (No Ethereum prefix)
    // Rarely used but good for testing
    const hash = keccak256(Buffer.from(msg));
    const sigRaw = await account.sign({ hash });
    const sigRawB64 = Buffer.from(sigRaw).toString('base64url');

    // VARIANT 4: Short Format (Bytes) + Lowercase Address
    const headerLc = { fid: YOUR_FID, type: 'custody', key: account.address.toLowerCase() };
    const hB64Lc = Buffer.from(JSON.stringify(headerLc)).toString('base64url');
    const msgLc = `${hB64Lc}.${pB64}`;
    const sigLc = await account.signMessage({ message: msgLc });
    const sigShortB64Lc = Buffer.from(sigLc.slice(2), 'hex').toString('base64url');

    console.log('\n--- VARIANT 1: Long Format (Legacy, Mixed-case) ---');
    console.log(JSON.stringify({ accountAssociation: { header: hB64, payload: pB64, signature: sigLongB64 } }, null, 4));

    console.log('\n--- VARIANT 2: Short Format (Modern, Mixed-case) ---');
    console.log(JSON.stringify({ accountAssociation: { header: hB64, payload: pB64, signature: sigShortB64 } }, null, 4));

    console.log('\n--- VARIANT 4: Short Format (Modern, Lowercase) ---');
    console.log(JSON.stringify({ accountAssociation: { header: hB64Lc, payload: pB64, signature: sigShortB64Lc } }, null, 4));

    console.log('\n================================================');
    console.log('RECOMMENDATION: Use VARIANT 4 (Short + Lowercase) first.');
    console.log('If that fails, use VARIANT 2 (Short + Mixed-case).');
    console.log('================================================\n');
}

generate().catch(console.error);
