import { Redis } from '@upstash/redis'

/**
 * Shared Upstash Redis client.
 * In a serverless environment (like Vercel or Next.js API routes), 
 * this client is optimized for short-lived connections.
 */
export const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
})

/**
 * Cache key prefix for Lucky Militia
 */
export const K = {
    LEADERBOARD_CACHE: 'lm:leaderboard:v1',
    PLAYER_STATS: (address: string) => `lm:player:${address.toLowerCase()}:stats`,
    GLOBAL_CONFIG: 'lm:config',
    ACTIVE_SESSIONS: 'lm:sessions',
    // Time-based Leaderboards
    LB_SCORE: (period: string) => `lm:lb:${period}`,
    STATS_HASH: (period: string, address: string) => `lm:stats:${period}:${address.toLowerCase()}`,
}
