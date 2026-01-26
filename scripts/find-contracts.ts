
import { createPublicClient, http } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import dotenv from 'dotenv';
import { resolve } from 'path';
import { privateKeyToAccount } from 'viem/accounts';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const network = process.env.VITE_NETWORK === 'base' ? base : baseSepolia;
const client = createPublicClient({
    chain: network,
    transport: http()
});

async function findContracts() {
    const deployer = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`).address;
    console.log(`Deployer address: ${deployer}`);
    console.log(`Searching for contract creations on ${network.name}...`);

    const nonce = await client.getTransactionCount({ address: deployer });
    console.log(`Nonce (next tx index): ${nonce}`);

    // We can't easily iterate all txs without an indexer, but we can check common nonces
    // or just tell the user we couldn't find them if the nonce is 0.
    if (nonce === 0) {
        console.log('No transactions found from this deployer on this network.');
    } else {
        console.log(`The deployer has ${nonce} transactions. Please check a block explorer for contract addresses if not in .env.`);
    }
}

findContracts();
