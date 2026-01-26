
import { createPublicClient, http, getContractAddress } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const network = process.env.VITE_NETWORK === 'base' ? base : baseSepolia;
const client = createPublicClient({
    chain: network,
    transport: http()
});

async function findPotentialContracts() {
    const deployer = '0xD8D2dB6ED2dC089CAf56e25DC61401Ecc56F706C';
    console.log(`Calculating potential contract addresses for ${deployer} on ${network.name}...`);

    for (let i = 0; i < 4; i++) {
        const addr = getContractAddress({ from: deployer as `0x${string}`, nonce: BigInt(i) });
        const code = await client.getBytecode({ address: addr });
        if (code && code !== '0x') {
            console.log(`[FOUND] Nonce ${i}: ${addr} (Contract detected!)`);
        } else {
            console.log(`[MISS] Nonce ${i}: ${addr} (No code)`);
        }
    }
}

findPotentialContracts();
