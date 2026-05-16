const fs = require('fs');
const path = require('path');
const { createWalletClient, createPublicClient, http, hexToBytes } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { base } = require('viem/chains');
require('dotenv').config();

async function main() {
    const pk = process.env.EVM_PRIVATE_KEY;
    if (!pk) {
        console.error('Error: EVM_PRIVATE_KEY not found in .env');
        process.exit(1);
    }

    const artifactPath = path.resolve(__dirname, '../artifacts/LuckyMilitiaStats.json');
    if (!fs.existsSync(artifactPath)) {
        console.error('Error: Artifact not found. Run compile first.');
        process.exit(1);
    }

    const { abi, bytecode } = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

    const account = privateKeyToAccount(pk.startsWith('0x') ? pk : `0x${pk}`);
    const client = createWalletClient({
        account,
        chain: base,
        transport: http('https://mainnet.base.org')
    });

    const publicClient = createPublicClient({
        chain: base,
        transport: http('https://mainnet.base.org')
    });

    console.log(`Deploying LuckyMilitiaStats to Base Mainnet from ${account.address}...`);

    const hash = await client.deployContract({
        abi,
        bytecode: `0x${bytecode}`,
    });

    console.log(`Deployment transaction sent: ${hash}`);
    console.log('Waiting for confirmation...');

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    console.log(`✅ Contract deployed at: ${receipt.contractAddress}`);
    console.log('\nUPDATE YOUR .env FILE:');
    console.log(`VITE_MILITIA_CONTRACT_ADDRESS=${receipt.contractAddress}`);
}

main().catch(console.error);
