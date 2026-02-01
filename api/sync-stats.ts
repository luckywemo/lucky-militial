
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import { redis, K } from '../utils/redis';

// Simple ABI for updateStats
const UPDATE_STATS_ABI = [{
    name: 'updateStats',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
        { name: 'operator', type: 'address' },
        { name: 'kills', type: 'uint256' },
        { name: 'wins', type: 'uint256' },
        { name: 'incrementGames', type: 'bool' }
    ],
    outputs: []
}] as const;

export default async function handler(request: Request) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const body = await request.json();
        const { address, kills, wins } = body;

        if (!address || typeof kills !== 'number' || typeof wins !== 'number') {
            return new Response('Invalid Request', { status: 400 });
        }

        const score = (kills * 10) + (wins * 50);

        // Time buckets
        const now = new Date();
        const ymd = now.toISOString().split('T')[0].replace(/-/g, ''); // 20240101
        const ym = ymd.substring(0, 6); // 202401

        const periods = [
            { key: 'alltime' },
            { key: `daily:${ymd}` },
            { key: `monthly:${ym}` }
        ];

        // Pipeline Redis Updates
        const pipeline = redis.pipeline();
        for (const p of periods) {
            // ZSET: Score Ranking
            pipeline.zincrby(K.LB_SCORE(p.key), score, address);

            // HASH: Detailed Stats
            const statsKey = K.STATS_HASH(p.key, address);
            pipeline.hincrby(statsKey, 'kills', kills);
            pipeline.hincrby(statsKey, 'wins', wins);
            pipeline.hincrby(statsKey, 'score', score);
            pipeline.hset(statsKey, { lastCombat: Date.now() });
        }
        await pipeline.exec();
        console.log(`[Sync] Updated Redis for ${address} (Score +${score})`);

        // Update Blockchain (Best Effort)
        try {
            const pk = process.env.PRIVATE_KEY;
            const hub = process.env.VITE_HUB_ADDRESS;

            if (pk && hub) {
                const account = privateKeyToAccount((pk.startsWith('0x') ? pk : `0x${pk}`) as `0x${string}`);
                const chain = process.env.VITE_NETWORK === 'base' ? base : baseSepolia;

                const walletClient = createWalletClient({
                    account,
                    chain,
                    transport: http()
                });

                const hash = await walletClient.writeContract({
                    address: hub as `0x${string}`,
                    abi: UPDATE_STATS_ABI,
                    functionName: 'updateStats',
                    args: [address as `0x${string}`, BigInt(kills), BigInt(wins), true]
                });
                console.log(`[Sync] Blockchain tx sent: ${hash}`);
            } else {
                console.warn('[Sync] Skipping blockchain write: Missing PRIVATE_KEY or VITE_HUB_ADDRESS');
            }
        } catch (err: any) {
            console.error('[Sync] Blockchain write failed:', err);
            // Non-blocking: we still return success because Redis is updated
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
