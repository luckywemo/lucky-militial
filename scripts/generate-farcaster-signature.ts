/**
 * Farcaster Account Association Generator
 * 
 * This script helps generate the account association for your farcaster.json manifest.
 * 
 * USAGE:
 * 1. Install dependencies: npm install viem
 * 2. Update YOUR_FID and YOUR_CUSTODY_PRIVATE_KEY below
 * 3. Run: npx ts-node scripts/generate-farcaster-signature.ts
 * 
 * IMPORTANT: Never commit your private key! Use environment variables in production.
 */

import { createWalletClient, http, toHex, keccak256 } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';

// ============ CONFIGURE THESE VALUES ============
const YOUR_FID = 0; // Replace with your Farcaster FID
const YOUR_CUSTODY_PRIVATE_KEY = '0x...'; // Replace with your custody wallet private key
const DOMAIN = 'luckymilitia.xyz';
// ================================================

async function generateAccountAssociation() {
    // Create the header
    const header = {
        fid: YOUR_FID,
        type: 'custody',
        key: privateKeyToAccount(YOUR_CUSTODY_PRIVATE_KEY as `0x${string}`).address
    };

    // Create the payload
    const payload = {
        domain: DOMAIN
    };

    // Encode to base64
    const headerBase64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');

    // Create message to sign
    const message = `${headerBase64}.${payloadBase64}`;

    // Sign the message
    const account = privateKeyToAccount(YOUR_CUSTODY_PRIVATE_KEY as `0x${string}`);
    const signature = await account.signMessage({ message });
    const signatureBase64 = Buffer.from(signature).toString('base64url');

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
