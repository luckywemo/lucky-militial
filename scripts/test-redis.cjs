const { Redis } = require('@upstash/redis')
require('dotenv').config()

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
})

async function testConnection() {
    try {
        console.log('Testing connection to Upstash Redis...')
        console.log('URL defined:', !!process.env.UPSTASH_REDIS_REST_URL)
        console.log('Token defined:', !!process.env.UPSTASH_REDIS_REST_TOKEN)

        const result = await redis.ping()
        console.log('Ping Result:', result)

        if (result === 'PONG') {
            console.log('✅ Connection successful!')
        } else {
            console.error('❌ Connection failed: Unexpected response.')
        }
    } catch (error) {
        console.error('❌ Connection failed:', error.message)
    }
}

testConnection()
