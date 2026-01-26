import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const requiredVars = [
    'VITE_NETWORK',
    'VITE_REWARDS_ADDRESS',
    'VITE_LEADERBOARD_ADDRESS',
    'VITE_SKINS_ADDRESS'
];

console.log('--- Environment Variable Verification ---');

let allPresent = true;

requiredVars.forEach(v => {
    const value = process.env[v];
    if (!value) {
        console.error(`❌ Missing: ${v}`);
        allPresent = false;
    } else {
        const isValidAddress = value.startsWith('0x') && value.length === 42;
        if (v.endsWith('_ADDRESS') && !isValidAddress) {
            console.error(`❌ Invalid Format: ${v}="${value}" (must be a 42-char hex address)`);
            allPresent = false;
        } else {
            console.log(`✅ ${v}="${value}"`);
        }
    }
});

if (allPresent) {
    console.log('\n--- Configuration looks correct! ---');
} else {
    console.log('\n--- Configuration has errors. Please fix .env ---');
    process.exit(1);
}
