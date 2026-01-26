
import { createClient, Errors } from '@farcaster/quick-auth';
import { redis, K } from '../utils/redis';

// This is a serverless function compatible with Vercel/Next.js-like environments
export default async function handler(req: Request) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized: Missing or malformed token' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const token = authHeader.split(' ')[1];

    // In production, this should match your ACTUAL deployment domain
    const domain = process.env.NEXT_PUBLIC_URL
        ? new URL(process.env.NEXT_PUBLIC_URL).hostname
        : 'luckymilitia.xyz';

    console.log(`[Auth] Verifying token for domain: ${domain}`);

    try {
        const client = createClient();
        const payload = await client.verifyJwt({
            token,
            domain,
        });

        // payload.sub is the FID
        const fid = payload.sub;

        // NEW: Track authentication in Redis
        try {
            const key = `lm:auth_logs:${fid}`;
            await redis.hset(key, {
                lastLogin: Date.now(),
                verified: true
            });
            await redis.expire(key, 60 * 60 * 24 * 7); // Expire after 7 days
            await redis.incr('lm:total_auths');
        } catch (redisError) {
            console.warn('[Auth] Redis logging failed:', redisError);
            // Don't fail the whole request if Redis is down
        }

        return new Response(JSON.stringify({
            fid,
            verified: true,
            timestamp: Date.now()
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        console.error('[Auth] Verification failed:', e);

        if (e instanceof Errors.InvalidTokenError) {
            return new Response(JSON.stringify({ error: 'Invalid token' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
