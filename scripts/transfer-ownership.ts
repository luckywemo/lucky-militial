
import { createWalletClient, http, publicActions } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const network = process.env.VITE_NETWORK === 'base' ? base : baseSepolia;
const privateKey = process.env.PRIVATE_KEY;

if (!privateKey) {
    console.error('PRIVATE_KEY not found in .env');
    process.exit(1);
}

const account = privateKeyToAccount(`0x${privateKey.replace('0x', '')}`);
const client = createWalletClient({
    account,
    chain: network,
    transport: http()
}).extend(publicActions);

const targetOwner = '0x4D206ee1514ADB5a43c695e8674a99F722Fa4957';
const contracts = [
    { name: 'Rewards', address: process.env.VITE_REWARDS_ADDRESS },
    { name: 'Leaderboard', address: process.env.VITE_LEADERBOARD_ADDRESS },
    { name: 'Skins', address: process.env.VITE_SKINS_ADDRESS }
];

async function transfer() {
    console.log(`Using deployer: ${account.address}`);
    console.log(`Target owner: ${targetOwner}`);
    console.log(`Network: ${network.name}`);

    for (const contract of contracts) {
        if (!contract.address) {
            console.warn(`Skipping ${contract.name}: No address found in .env`);
            continue;
        }

        console.log(`\n--- Transferring ${contract.name} (${contract.address}) ---`);
        try {
            // Check current owner first
            const currentOwner = await client.readContract({
                address: contract.address as `0x${string}`,
                abi: [{ name: 'owner', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] }] as const,
                functionName: 'owner'
            });

            if (currentOwner.toLowerCase() === targetOwner.toLowerCase()) {
                console.log(`${contract.name} is already owned by the target.`);
                continue;
            }

            if (currentOwner.toLowerCase() !== account.address.toLowerCase()) {
                console.error(`ERROR: ${contract.name} is owned by ${currentOwner}, not the deployer. Cannot transfer.`);
                continue;
            }

            const hash = await client.writeContract({
                address: contract.address as `0x${string}`,
                abi: [{ name: 'transferOwnership', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'newOwner', type: 'address' }], outputs: [] }] as const,
                functionName: 'transferOwnership',
                args: [targetOwner as `0x${string}`]
            });
            console.log(`Transaction sent: ${hash}`);
            console.log('Waiting for confirmation...');
            const receipt = await client.waitForTransactionReceipt({ hash });
            console.log(`Success! Status: ${receipt.status}`);
        } catch (e) {
            console.error(`Failed to transfer ${contract.name}: ${e.message}`);
        }
    }
    console.log('\n--- Ownership transfer process complete ---');
}

transfer();
