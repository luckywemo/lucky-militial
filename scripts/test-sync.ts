import { redis, K } from '../utils/redis';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Mocking a game result sync
 */
async function testSync() {
    console.log('--- TEST SYNC START ---');
    const mockData = {
        address: 'GD46DP26XPI4UBZOF64CZ7QX27UZ3RB5TVAZKSVLWXZFWBRS5ECCGHQS',
        kills: 3,
        wins: 1
    };

    const APP_URL = process.env.VITE_APP_URL || 'http://localhost:3000';
    console.log(`Payload: Kills: ${mockData.kills}, Wins: ${mockData.wins} for ${mockData.address} via ${APP_URL}`);

    // We'll call the handle logic directly instead of a network request
    // to verify the logic integration
    const response = await fetch(`${APP_URL}/api/sync-stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockData)
    }).catch(err => {
        console.error('Fetch failed (expected if dev server not running):', err.message);
    });

    if (response) {
        const result = await response.json();
        console.log('Result:', result);
    }
}

testSync().catch(console.error);
