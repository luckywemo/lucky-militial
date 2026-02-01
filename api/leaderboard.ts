import { createPublicClient, http } from 'viem';
import { redis, K } from '../utils/redis';
import { CONTRACT_ADDRESSES, TARGET_CHAIN } from '../utils/blockchain';

export default async function handler(req: Request) {
    if (req.method !== 'GET') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const url = new URL(req.url);
        const period = url.searchParams.get('period') || 'alltime';
        // Validate period format roughly (simple alpha/numeric check)
        const safePeriod = period.replace(/[^a-zA-Z0-9:]/g, '');

        let cacheKey = `lm:cache:lb:${safePeriod}`;

        // 1. Try Cache
        const cached = await redis.get(cacheKey);
        if (cached) {
            return new Response(JSON.stringify(cached), { headers: { 'Content-Type': 'application/json' } });
        }

        console.log(`[Leaderboard] Fetching for period: ${safePeriod}`);

        // 2. Fetch Top 50 from Redis ZSET
        // ZREVRANGE lm:lb:{period} 0 49 WITHSCORES
        const lbKey = K.LB_SCORE(safePeriod);
        const topWithScores = await redis.zrange(lbKey, 0, 49, { rev: true, withScores: true });

        // topWithScores is [member1, score1, member2, score2, ...] or object? 
        // Upstash SDK returns array: [ { member: '...', score: ... } ] if withScores is true?
        // Wait, standard node-redis returns ['mem', 'score'], upstash might return object or array depending on version.
        // Checking Upstash Redis docs assumption: usually returns array of objects { member, score } in recent versions.
        // Let's assume standard behavior or verifying return type is safer.
        // Recent @upstash/redis zrange returns { member, score }[] if withScores: true.

        if (!topWithScores || topWithScores.length === 0) {
            return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } });
        }

        // 3. Hydrate with detailed stats from HASH
        const pipeline = redis.pipeline();
        topWithScores.forEach((entry: any) => {
            // entry is { member: string, score: number }
            const statsKey = K.STATS_HASH(safePeriod, entry.member);
            pipeline.hgetall(statsKey);
        });

        const details = await pipeline.exec();

        const leaderboardData = topWithScores.map((entry: any, i: number) => {
            const stat = (details[i] as any) || {};
            return {
                address: entry.member,
                score: entry.score,
                kills: Number(stat.kills || 0),
                wins: Number(stat.wins || 0),
                lastCombat: Number(stat.lastCombat || 0)
            };
        });

        // 4. Cache for 60 seconds
        await redis.set(cacheKey, leaderboardData, { ex: 60 });

        return new Response(JSON.stringify(leaderboardData), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('[Leaderboard] API Error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
