import { 
  Keypair, 
  rpc, 
  TransactionBuilder, 
  Networks, 
  Operation, 
  StrKey 
} from '@stellar/stellar-sdk';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.VITE_STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = process.env.VITE_STELLAR_PASSPHRASE || 'Test SDF Network ; September 2015';
const WASM_PATH = path.resolve(process.cwd(), 'contracts/soroban_militia/target_build/wasm32-unknown-unknown/release/soroban_militia.wasm');




const server = new rpc.Server(RPC_URL);

async function fundAccount(publicKey: string) {
  console.log(`[Stellar] Funding account ${publicKey} via Friendbot...`);
  try {
    const response = await fetch(`https://friendbot.stellar.org/?addr=${publicKey}`);
    if (response.ok) {
      console.log(`[Stellar] Account funded successfully.`);
    } else {
      const text = await response.text();
      console.error(`[Stellar] Friendbot error:`, text);
    }
  } catch (error: any) {
    console.error(`[Stellar] Friendbot error:`, error.message);
  }
}

async function deploy() {
  let secret = process.env.STELLAR_DEPLOYER_SECRET;
  let kp: Keypair;

  if (!secret) {
    console.log('[Stellar] No deployer secret found. Generating new keypair...');
    kp = Keypair.random();
    secret = kp.secret();
    console.log(`[Stellar] New Public Key: ${kp.publicKey()}`);
    console.log(`[Stellar] New Secret Key: ${secret}`);
    await fundAccount(kp.publicKey());
  } else {
    kp = Keypair.fromSecret(secret);
    console.log(`[Stellar] Using existing deployer: ${kp.publicKey()}`);
  }

  // Ensure WASM exists
  if (!fs.existsSync(WASM_PATH)) {
    console.error(`[Error] WASM file not found at ${WASM_PATH}. Please build the contract first.`);
    process.exit(1);
  }

  const wasmBuffer = fs.readFileSync(WASM_PATH);
  console.log(`[Stellar] Loaded WASM (${wasmBuffer.length} bytes)`);

  const account = await server.getAccount(kp.publicKey());
  
  console.log('[Stellar] Step 1: Uploading WASM...');
  const uploadOp = Operation.uploadContractWasm({ wasm: wasmBuffer });
  
  let tx = new TransactionBuilder(account, { fee: '100000', networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(uploadOp)
    .setTimeout(60)
    .build();

  console.log('[Stellar] Simulating Step 1...');
  let sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${JSON.stringify(sim.error)}`);
  }
  tx = server.assembleTransaction(tx, sim);

  tx.sign(kp);
  
  let result = await server.sendTransaction(tx);
  console.log('[Stellar] Transaction sent (hash: ' + result.hash + '). Waiting for result...');
  
  let status = await pollStatus(result.hash);
  if (status.status !== 'SUCCESS') {
    throw new Error(`Upload failed (status: ${status.status}): ${JSON.stringify(status)}`);
  }

  const wasmId = (status as any).returnValue.bytes().toString('hex');
  console.log(`[Stellar] WASM Uploaded. WASM ID: ${wasmId}`);

  console.log('[Stellar] Step 2: Creating Contract Instance...');
  const createOp = Operation.createContract({
    wasmId: Buffer.from(wasmId, 'hex'),
    address: kp.publicKey()
  });

  const account2 = await server.getAccount(kp.publicKey());
  let tx2 = new TransactionBuilder(account2, { fee: '100000', networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(createOp)
    .setTimeout(60)
    .build();

  console.log('[Stellar] Simulating Step 2...');
  let sim2 = await server.simulateTransaction(tx2);
  if (rpc.Api.isSimulationError(sim2)) {
    throw new Error(`Simulation 2 failed: ${JSON.stringify(sim2.error)}`);
  }
  tx2 = server.assembleTransaction(tx2, sim2);

  tx2.sign(kp);
  let result2 = await server.sendTransaction(tx2);
  console.log('[Stellar] Transaction sent (hash: ' + result2.hash + '). Waiting for result...');
  let status2 = await pollStatus(result2.hash);
  
  if (status2.status !== 'SUCCESS') {
    throw new Error(`Instantiation failed: ${JSON.stringify(status2)}`);
  }

  const contractId = (status2 as any).createdContractId;
  console.log(`\n🚀 DEPLOYMENT SUCCESSFUL!`);
  console.log(`Contract ID: ${contractId}`);

  // Update .env
  updateEnv(secret, contractId);
}

async function pollStatus(hash: string) {
  let attempts = 0;
  while (attempts < 20) {
    try {
      const res = await server.getTransaction(hash);
      if (res.status === 'SUCCESS' || res.status === 'FAILED') {
        return res;
      }
    } catch (e) {
      // Ignore 404s while waiting for ingestion
    }
    await new Promise(r => setTimeout(r, 3000));
    attempts++;
  }
  throw new Error('Transaction timeout after 60 seconds polling');
}

function updateEnv(secret: string, contractId: string) {
  const envPath = path.resolve(process.cwd(), '.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  } else {
    // Generate from example if possible
    const examplePath = path.resolve(process.cwd(), '.env.example');
    if (fs.existsSync(examplePath)) {
      envContent = fs.readFileSync(examplePath, 'utf8');
    }
  }

  // Standardise placeholders
  const updates = [
    { key: 'VITE_NETWORK', val: 'testnet' },
    { key: 'VITE_STELLAR_NETWORK', val: 'testnet' },
    { key: 'VITE_STELLAR_RPC_URL', val: 'https://soroban-testnet.stellar.org' },
    { key: 'VITE_STELLAR_PASSPHRASE', val: 'Test SDF Network ; September 2015' },
    { key: 'VITE_CONTRACT_ID', val: contractId },
    { key: 'STELLAR_DEPLOYER_SECRET', val: secret }
  ];

  updates.forEach(({ key, val }) => {
    const regex = new RegExp(`^${key}=.*`, 'm');
    if (envContent.match(regex)) {
      envContent = envContent.replace(regex, `${key}=${val}`);
    } else {
      envContent += `\n${key}=${val}`;
    }
  });

  fs.writeFileSync(envPath, envContent);
  console.log(`[Stellar] .env file updated at ${envPath}`);
}

deploy().catch(err => {
  console.error('[Stellar] Deployment Failed:', err);
  process.exit(1);
});
