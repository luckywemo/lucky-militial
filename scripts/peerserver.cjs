/**
 * Local PeerJS Server for localhost multiplayer testing
 * 
 * Run with: node scripts/peerserver.js
 * Or use: npm run peerserver (after adding to package.json)
 */

const { PeerServer } = require('peer');

const peerServer = PeerServer({
    port: 9000,
    path: '/peerjs',
    proxied: false,
    allow_discovery: true,
    // Enable CORS for localhost development
    corsOptions: {
        origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'],
        credentials: true
    }
});

peerServer.on('connection', (client) => {
    console.log(`[PeerServer] Client connected: ${client.getId()}`);
});

peerServer.on('disconnect', (client) => {
    console.log(`[PeerServer] Client disconnected: ${client.getId()}`);
});

peerServer.on('error', (error) => {
    console.error('[PeerServer] Error:', error);
});

console.log('');
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║           LUCKY MILITIA LOCAL PEER SERVER                 ║');
console.log('╠═══════════════════════════════════════════════════════════╣');
console.log('║  Status: ONLINE                                           ║');
console.log('║  Port: 9000                                               ║');
console.log('║  Path: /peerjs                                            ║');
console.log('║                                                           ║');
console.log('║  Use this for local multiplayer testing.                  ║');
console.log('║  Both browser tabs will connect to this server.           ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('');
