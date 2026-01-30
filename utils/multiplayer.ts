
import Peer from 'peerjs';

/**
 * Standardized PeerJS Configuration for Lucky Militia
 * Optimized for cross-device support (Cloud Signaling + Robust ICE)
 */

// We use 0.peerjs.com as the primary signaling server.
// It is the most reliable among free public options for cross-device discovery.
// Standardized PeerJS Config
// NOTE: For production, you MUST use a paid TURN server (e.g., Twilio, Xirsys, or a private Metered account).
// The credentials below are for the public OpenRelay project and may be rate-limited.
export const PEER_CONFIG = {
    host: '0.peerjs.com',
    port: 443,
    path: '/',
    secure: true,
    debug: 2,
    config: {
        iceServers: [
            // STUN Servers (Lightweight, helps with most NATs)
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },

            // TURN Servers (Relays, required for strict NATs/Firewalls)
            // NOTE: Free tier OpenRelay. reliable for testing, may throttle in production.
            {
                urls: 'turn:openrelay.metered.ca:80',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: 'turn:openrelay.metered.ca:443',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            }
        ],
        sdpSemantics: 'unified-plan',
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
