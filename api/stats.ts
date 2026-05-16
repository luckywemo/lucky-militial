
import { redis, K } from '../utils/redis';

export const config = {
    runtime: 'edge',
};

export default async function handler(request: Request) {
    const url = new URL(request.url);
    console.log(`[API Stats] Request URL: ${request.url}`);
    
    // Support both /api/stats?address=0x... and /api/stats/0x...
    let address = url.searchParams.get('address');
    
    if (!address) {
        const pathParts = url.pathname.split('/');
        address = pathParts[pathParts.length - 1];
    }

    console.log(`[API Stats] Resolved Address: "${address}"`);

    if (!address || address === 'stats' || address === '') {
        return new Response(JSON.stringify({ error: 'Address required' }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const statsKey = K.STATS_HASH('alltime', address);
        console.log(`[API Stats] Querying Redis Key: ${statsKey}`);
        const stats = await redis.hgetall(statsKey);
        console.log(`[API Stats] Redis Result:`, stats);

        if (!stats) {
            return new Response(JSON.stringify({ 
                username: null, 
                kills: 0, 
                wins: 0, 
                gamesPlayed: 0,
                score: 0 
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Ensure numeric values
        return new Response(JSON.stringify({
            username: stats.username || null,
            kills: Number(stats.kills || 0),
            wins: Number(stats.wins || 0),
            gamesPlayed: Number(stats.gamesPlayed || 0),
            score: Number(stats.score || 0)
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e: any) {
        console.error('[API Stats] Error:', e);
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
