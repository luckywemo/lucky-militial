
import https from 'https';

const url = 'https://lucky-militial.vercel.app/api/leaderboard';

https.get(url, (res) => {
    console.log('Status Code:', res.statusCode);
    console.log('Headers:', res.headers);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Body Preview:', data.substring(0, 200));
    });

}).on('error', (e) => {
    console.error('Error:', e);
});
