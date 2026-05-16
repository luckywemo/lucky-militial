
import { 
  Keypair, 
  rpc, 
  TransactionBuilder, 
  Networks, 
  Operation, 
  Address,
  nativeToScVal 
} from '@stellar/stellar-sdk';
import { redis, K } from '../utils/redis';

const RPC_URL = process.env.VITE_STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = process.env.VITE_STELLAR_PASSPHRASE || 'Test SDF Network ; September 2015';
const CONTRACT_ID = process.env.VITE_CONTRACT_ID;
const DEPLOYER_SECRET = process.env.STELLAR_DEPLOYER_SECRET;

const server = new rpc.Server(RPC_URL);

/**
 * Sync stats to Stellar and Redis
 */
export const config = {
    runtime: 'edge',
};

export default async function handler(request: Request) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const body = await request.json();
        const { address, kills, wins, username, mode } = body;

        if (!address || typeof kills !== 'number' || typeof wins !== 'number') {
            return new Response('Invalid Request', { status: 400 });
        }

        // PvP kills and wins are worth significantly more to prioritize PvP skill
        const isPvP = mode === 'multiplayer';
        const killWeight = isPvP ? 25 : 5;
        const winWeight = isPvP ? 100 : 20;
        const score = (kills * killWeight) + (wins * winWeight);

        // --- PART 1: REDIS UPDATE (Performance/Leaderboard) ---
        const now = new Date();
        const ymd = now.toISOString().split('T')[0].replace(/-/g, '');
        const ym = ymd.substring(0, 6);

        const periods = [
            { key: 'alltime' },
            { key: `daily:${ymd}` },
            { key: `monthly:${ym}` }
        ];

        const pipeline = redis.pipeline();
        for (const p of periods) {
            // General Leaderboard
            pipeline.zincrby(K.LB_SCORE(p.key), score, address);
            
            // Mode Specific Leaderboard
            if (mode === 'multiplayer') {
                pipeline.zincrby(K.LB_PVP(p.key), score, address);
            } else {
                pipeline.zincrby(K.LB_PVE(p.key), score, address);
            }

            const statsKey = K.STATS_HASH(p.key, address);
            pipeline.hincrby(statsKey, 'kills', kills);
            pipeline.hincrby(statsKey, 'wins', wins);
            pipeline.hincrby(statsKey, 'score', score);
            
            if (mode === 'multiplayer') {
                pipeline.hincrby(statsKey, 'pvp_kills', kills);
                pipeline.hincrby(statsKey, 'pvp_wins', wins);
            }

            pipeline.hset(statsKey, { lastCombat: Date.now() });
            if (username) {
                pipeline.hset(statsKey, { username });
            }

            // Invalidate the cache for this period so the leaderboard reflects the update immediately
            pipeline.del(`lm:cache:lb:${p.key}`);
        }
        await pipeline.exec();
        console.log(`[Sync] Updated Redis for ${address} (Name: ${username}, Score +${score})`);


        // --- PART 2: STELLAR UPDATE (Authority/Blockchain) ---
        if (DEPLOYER_SECRET && CONTRACT_ID) {
            try {
                const kp = Keypair.fromSecret(DEPLOYER_SECRET);
                const account = await server.getAccount(kp.publicKey());
                
                // We'll record both kills and wins if they occurred
                // In a single transaction if possible, or multi-op
                const ops: any[] = [];
                
                if (kills > 0) {
                    ops.push(Operation.invokeContractFunction({
                        contract: CONTRACT_ID,
                        function: 'record_kill',
                        args: [nativeToScVal(new Address(address))]
                    }));
                }
                
                if (wins > 0) {
                    ops.push(Operation.invokeContractFunction({
                        contract: CONTRACT_ID,
                        function: 'record_win',
                        args: [nativeToScVal(new Address(address))]
                    }));
                }

                if (ops.length > 0) {
                    let tx = new TransactionBuilder(account, { 
                        fee: '100000', 
                        networkPassphrase: NETWORK_PASSPHRASE 
                    });
                    
                    ops.forEach(op => tx.addOperation(op));
                    
                    const builtTx = tx.setTimeout(30).build();
                    
                    // Simulate and Assemble
                    const sim = await server.simulateTransaction(builtTx);
                    if (rpc.Api.isSimulationError(sim)) {
                        console.error('[Sync] Stellar simulation failed:', sim.error);
                    } else {
                        const finalTx = rpc.assembleTransaction(builtTx, sim);
                        finalTx.sign(kp);
                        const result = await server.sendTransaction(finalTx);
                        console.log(`[Sync] Stellar tx sent: ${result.hash}`);
                    }
                }
            } catch (err: any) {
                console.error('[Sync] Stellar write failed:', err.message);
            }
        } else {
            console.warn('[Sync] Skipping Stellar write: Missing DEPLOYER_SECRET or VITE_CONTRACT_ID');
        }

        return new Response(JSON.stringify({ success: true, score_added: score }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e: any) {
        console.error('[Sync] Error:', e);
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
