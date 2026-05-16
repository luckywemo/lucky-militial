import { Redis } from '@upstash/redis'
import dotenv from 'dotenv'

dotenv.config()

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
})

async function testConnection() {
    try {
        console.log('Testing connection to Upstash Redis...')
        const result = await redis.ping()
        console.log('Ping Result:', result)

        if (result === 'PONG') {
            console.log('✅ Connection successful!')

            // Test write/read
            await redis.set('lm:test_connection', Date.now())
            const val = await redis.get('lm:test_connection')
            console.log('Test value retrieved:', val)

        } else {
            console.error('❌ Connection failed: Unexpected response.')
        }
    } catch (error) {
        console.error('❌ Connection failed:', error)
    }
}

testConnection()
