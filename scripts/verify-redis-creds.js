
import https from 'https';

const url = 'https://cosmic-rat-32829.upstash.io/dbsize';
const token = 'AYA9AAIncDI3NGFhMmU0M2FiMTg0MmY4Yjk3N2ZhNjZkNDA3MjMzNnAyMzI4Mjk';

const options = {
    headers: {
        Authorization: `Bearer ${token}`
    }
};

https.get(url, options, (res) => {
    console.log('Redis Connection Status:', res.statusCode);

    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Response:', data);
    });
}).on('error', (e) => {
    console.error('Redis Connection Error:', e);
});
