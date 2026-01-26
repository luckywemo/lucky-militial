import { createPublicClient, http } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { redis, K } from '../utils/redis';
import { CONTRACT_ADDRESSES, TARGET_CHAIN } from '../utils/blockchain';

const LEADERBOARD_ABI = [
    { name: 'getOperatorStats', type: 'function', stateMutability: 'view', inputs: [{ name: 'operator', type: 'address' }], outputs: [{ type: 'tuple', components: [{ name: 'kills', type: 'uint256' }, { name: 'wins', type: 'uint256' }, { name: 'gamesPlayed', type: 'uint256' }, { name: 'lastCombatTime', type: 'uint256' }] }] },
    { name: 'getOperatorCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
    { name: 'operators', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [{ type: 'address' }] },
] as const;

const publicClient = createPublicClient({
    chain: TARGET_CHAIN as any,
    transport: http(),
});

export default async function handler(req: Request) {
    if (req.method !== 'GET') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        // 1. Try to get cached data
        const cached = await redis.get(K.LEADERBOARD_CACHE);
        if (cached) {
            console.log('[Leaderboard] Returning cached data');
            return new Response(JSON.stringify(cached), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 2. Fetch from blockchain
        console.log('[Leaderboard] Cache miss, fetching from blockchain...');

        const count = await publicClient.readContract({
            address: CONTRACT_ADDRESSES.LEADERBOARD as `0x${string}`,
            abi: LEADERBOARD_ABI as any,
            functionName: 'getOperatorCount',
        } as any);

        const operatorCount = Number(count);
        const limit = 50; // Limit to top 50 for API performance
        const indices = Array.from({ length: Math.min(operatorCount, limit) }, (_, i) => BigInt(i));

        // Get addresses
        const addressResults = await Promise.all(
            indices.map(index =>
                publicClient.readContract({
                    address: CONTRACT_ADDRESSES.LEADERBOARD as `0x${string}`,
                    abi: LEADERBOARD_ABI as any,
                    functionName: 'operators',
                    args: [index],
                } as any)
            )
        );

        // Get stats for each address
        const statsResults: any[] = await Promise.all(
            addressResults.map(addr =>
                publicClient.readContract({
                    address: CONTRACT_ADDRESSES.LEADERBOARD as `0x${string}`,
                    abi: LEADERBOARD_ABI as any,
                    functionName: 'getOperatorStats',
                    args: [addr],
                } as any)
            )
        );

        const leaderboardData = addressResults.map((addr, i) => {
            const stats = statsResults[i] as any;
            const kills = Number(stats.kills || 0);
            const wins = Number(stats.wins || 0);
            const score = (kills * 10) + (wins * 50);

            return {
                address: addr,
                kills,
                wins,
                score,
                lastCombat: Number(stats.lastCombatTime || 0)
            };
        }).sort((a, b) => b.score - a.score);

        // 3. Cache the result for 5 minutes
        await redis.set(K.LEADERBOARD_CACHE, leaderboardData, { ex: 300 });

        return new Response(JSON.stringify(leaderboardData), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('[Leaderboard] API Error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error', message: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
