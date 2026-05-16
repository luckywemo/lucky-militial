
const { createWalletClient, http, publicActions } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { base, baseSepolia } = require('viem/chains');
const dotenv = require('dotenv');
const { resolve } = require('path');
const { readFileSync, writeFileSync } = require('fs');

dotenv.config({ path: resolve(process.cwd(), '.env') });

const network = process.env.VITE_NETWORK === 'base' ? base : baseSepolia;
const privateKey = process.env.PRIVATE_KEY;

if (!privateKey || privateKey.length < 64) {
    console.error('Error: PRIVATE_KEY in .env is missing or invalid.');
    process.exit(1);
}

const account = privateKeyToAccount(`0x${privateKey.replace('0x', '')}`);
const client = createWalletClient({
    account,
    chain: network,
    transport: http()
}).extend(publicActions);

async function deployContract(name, artifactPath) {
    console.log(`\n--- Deploying ${name} ---`);
    try {
        const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));
        const { abi, bytecode } = artifact;

        const hash = await client.deployContract({
            abi,
            bytecode,
            account,
        });
        console.log(`Transaction hash: ${hash}`);
        console.log('Waiting for confirmation...');
        const receipt = await client.waitForTransactionReceipt({ hash });
        console.log(`Deployed at: ${receipt.contractAddress}`);
        return receipt.contractAddress;
    } catch (error) {
        console.error(`Failed to deploy ${name}:`, error.message);
        return null;
    }
}

async function main() {
    console.log(`Using your deployer address: ${account.address}`);
    console.log(`Network: ${network.name}`);

    // Deploy only the Unified Contract
    const hubAddr = await deployContract('LuckyMilitia', './artifacts/contracts/LuckyMilitia.sol/LuckyMilitia.json');

    if (!hubAddr) {
        console.error('Deployment failed.');
        return;
    }

    console.log('\nUpdating .env file with new Unified HUB address...');
    let envContent = readFileSync('.env', 'utf8');

    // Remove old keys if they exist, or just ensure we don't rely on them
    // We'll standardise on VITE_HUB_ADDRESS
    const newEntry = `VITE_HUB_ADDRESS=${hubAddr}`;

    if (envContent.includes('VITE_HUB_ADDRESS=')) {
        envContent = envContent.replace(/VITE_HUB_ADDRESS=.*/, newEntry);
    } else {
        envContent += `\n${newEntry}`;
    }

    // Comment out or remove old keys to avoid confusion
    // (Optional, but good for cleanup)
    envContent = envContent.replace(/VITE_REWARDS_ADDRESS=.*/g, '# VITE_REWARDS_ADDRESS=DEPRECATED');
    envContent = envContent.replace(/VITE_LEADERBOARD_ADDRESS=.*/g, '# VITE_LEADERBOARD_ADDRESS=DEPRECATED');
    envContent = envContent.replace(/VITE_SKINS_ADDRESS=.*/g, '# VITE_SKINS_ADDRESS=DEPRECATED');

    writeFileSync('.env', envContent);
    console.log('.env updated successfully!');

    console.log('\n--- REDEPLOYMENT COMPLETE ---');
    console.log(`Lucky Militia Hub: ${hubAddr}`);
}

main().catch(console.error);
