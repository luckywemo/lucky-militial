
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

    const rewardsAddr = await deployContract('LuckyMilitiaRewards', './artifacts/contracts/LuckyMilitiaRewards.sol/LuckyMilitiaRewards.json');
    const leaderboardAddr = await deployContract('LuckyMilitiaLeaderboard', './artifacts/contracts/LuckyMilitiaLeaderboard.sol/LuckyMilitiaLeaderboard.json');
    const skinsAddr = await deployContract('LuckyMilitiaSkins', './artifacts/contracts/LuckyMilitiaSkins.sol/LuckyMilitiaSkins.json');

    if (!rewardsAddr || !leaderboardAddr || !skinsAddr) {
        console.error('Deployment failed.');
        return;
    }

    console.log('\nUpdating .env file with new YOUR contract addresses...');
    let envContent = readFileSync('.env', 'utf8');
    envContent = envContent.replace(/VITE_REWARDS_ADDRESS=.*/, `VITE_REWARDS_ADDRESS=${rewardsAddr}`);
    envContent = envContent.replace(/VITE_LEADERBOARD_ADDRESS=.*/, `VITE_LEADERBOARD_ADDRESS=${leaderboardAddr}`);
    envContent = envContent.replace(/VITE_SKINS_ADDRESS=.*/, `VITE_SKINS_ADDRESS=${skinsAddr}`);
    writeFileSync('.env', envContent);
    console.log('.env updated successfully!');

    console.log('\n--- REDEPLOYMENT COMPLETE ---');
    console.log('You are now the Creator and Owner of:');
    console.log(`Rewards: ${rewardsAddr}`);
    console.log(`Leaderboard: ${leaderboardAddr}`);
    console.log(`Skins: ${skinsAddr}`);
    console.log('\nTransactions will now show your address as the source.');
}

main().catch(console.error);
