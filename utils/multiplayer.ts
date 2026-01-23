
import Peer from 'peerjs';

/**
 * Standardized PeerJS Configuration for Lucky Militia
 * Optimized for cross-device support (Cloud Signaling + Robust ICE)
 */

// We use 0.peerjs.com as the primary signaling server.
// It is the most reliable among free public options for cross-device discovery.
export const PEER_CONFIG = {
    host: '0.peerjs.com',
    port: 443,
    path: '/',
    secure: true,
    debug: 1, // Minimize noise but keep errors
    config: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            { urls: 'stun:stun.services.mozilla.com' },
            // Better free TURN servers (often more reliable than openrelay)
            { urls: 'turn:relay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
            { urls: 'turn:relay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
            { urls: 'turn:relay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
        ],
        iceTransportPolicy: 'all' as RTCIceTransportPolicy,
        iceCandidatePoolSize: 10,
    }
};

/**
 * Generates a sanitized room code for PeerJS IDs
 */
export const getPeerId = (type: 'SCTR' | 'GAME', roomCode: string) => {
    return `LM-${type}-${roomCode}`;
};

/**
 * Common status messages for ICE states
 */
export const getStatusFromIceState = (state: RTCIceConnectionState): string => {
    switch (state) {
        case 'checking': return 'ESTABLISHING_UPLINK...';
        case 'connected':
        case 'completed': return 'SIGNAL_ACQUIRED';
        case 'failed': return 'LINK_FAILED (NAT_BLOCK)';
        case 'disconnected': return 'SIGNAL_LOST';
        case 'closed': return 'UPLINK_CLOSED';
        default: return state.toUpperCase();
    }
};
