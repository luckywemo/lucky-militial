import { useState, useEffect, useRef } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { PEER_CONFIG, getPeerId, getStatusFromIceState } from '../utils/multiplayer';
import { MPMatchMode, MPMap } from '../App';

export interface SquadMember {
    name: string;
    team: 'alpha' | 'bravo';
    id: string;
}

interface UseMultiplayerProps {
    playerName: string;
    mpMatchMode: MPMatchMode;
    mpMap: MPMap;
    scoreLimit: number;
    alphaBots: number;
    bravoBots: number;
    onGameStart: (roomCode: string, isHost: boolean, squad: SquadMember[], mpConfig: any) => void;
}

export function useMultiplayer({
    playerName,
    mpMatchMode,
    mpMap,
    scoreLimit,
    alphaBots,
    bravoBots,
    onGameStart
}: UseMultiplayerProps) {
    const [activeRoom, setActiveRoom] = useState<string | null>(null);
    const [isHost, setIsHost] = useState(false);
    const [squad, setSquad] = useState<SquadMember[]>([{ name: playerName, team: 'alpha', id: 'host' }]);
    const [statusMsg, setStatusMsg] = useState('OFFLINE');

    const peerRef = useRef<Peer | null>(null);
    const connections = useRef<DataConnection[]>([]);
    const squadRef = useRef<SquadMember[]>(squad);

    useEffect(() => {
        squadRef.current = squad;
    }, [squad]);

    // Handle Peer Destruction
    useEffect(() => {
        return () => {
            if (peerRef.current) {
                peerRef.current.destroy();
            }
        };
    }, []);

    // Sync name changes to connected peers
    useEffect(() => {
        if (!activeRoom) return;

        if (isHost) {
            setSquad((prev) => {
                const next = prev.map(m => m.id === 'host' ? { ...m, name: playerName } : m);
                broadcastSquad(next);
                return next;
            });
        } else {
            const conn = connections.current[0];
            if (conn && conn.open) {
                conn.send({ type: 'update_name', name: playerName });
            }
        }
    }, [playerName, activeRoom, isHost]);

    const broadcastSquad = (newList: SquadMember[]) => {
        connections.current.forEach(c => {
            if (c.open) {
                c.send({ type: 'sync_squad', squad: newList });
            }
        });
    };

    const handleCreateRoom = () => {
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        setIsHost(true);
        setActiveRoom(code);
        setSquad([{ name: playerName, team: 'alpha', id: 'host' }]);
        setStatusMsg('TRANSMITTING...');

        peerRef.current = new Peer(getPeerId('SCTR', code), PEER_CONFIG);

        peerRef.current.on('error', (err) => {
            console.error('[Multiplayer] Host error:', err);
            if (err.type === 'peer-unavailable') setStatusMsg('ROOM_NOT_FOUND');
            else if (err.type === 'unavailable-id') setStatusMsg('CODE_COLLISION_RETRY');
            else setStatusMsg(`SERVER_ERR: ${err.type}`);
        });

        peerRef.current.on('open', (id) => {
            console.log('[Multiplayer] Host ready:', id);
            setStatusMsg('BROADCASTING');
        });

        peerRef.current.on('connection', (conn) => {
            conn.on('open', () => {
                connections.current.push(conn);
                conn.send({
                    type: 'welcome',
                    squad: squadRef.current,
                    settings: { mpMatchMode, mpMap, scoreLimit, alphaBots, bravoBots }
                });

                const pc = (conn as any).peerConnection as RTCPeerConnection | undefined;
                if (pc) {
                    pc.addEventListener('iceconnectionstatechange', () => {
                        if (pc.iceConnectionState === 'failed') setStatusMsg('CLIENT_LINK_FAILED');
                    });
                }
            });

            conn.on('data', (data: any) => {
                if (data.type === 'join') {
                    setSquad((prev) => {
                        const next = [...prev.filter(m => m.id !== conn.peer), { name: data.name, team: data.team, id: conn.peer }];
                        broadcastSquad(next);
                        return next;
                    });
                }
                if (data.type === 'switch_team') {
                    setSquad((prev) => {
                        const next = prev.map(m => m.id === conn.peer ? { ...m, team: data.team } : m);
                        broadcastSquad(next);
                        return next;
                    });
                }
                if (data.type === 'update_name') {
                    setSquad((prev) => {
                        const next = prev.map(m => m.id === conn.peer ? { ...m, name: data.name } : m);
                        broadcastSquad(next);
                        return next;
                    });
                }
            });

            conn.on('close', () => {
                connections.current = connections.current.filter(c => c !== conn);
                setSquad(prev => {
                    const next = prev.filter(m => m.id !== conn.peer);
                    broadcastSquad(next);
                    return next;
                });
            });
        });
    };

    const handleJoinRoom = (code: string) => {
        if (code.length !== 4) return;
        setIsHost(false);
        setActiveRoom(code);
        setStatusMsg('LINKING...');

        peerRef.current = new Peer(PEER_CONFIG);

        peerRef.current.on('error', (err) => {
            console.error('[Multiplayer] Client error:', err);
            // Don't kill state immediately, might be a temporary network blip
            setStatusMsg(`PEER ERR: ${err.type}`);
        });

        peerRef.current.on('open', (id) => {
            const hostId = getPeerId('SCTR', code);
            connectToHostWithRetry(hostId, 0);
        });
    };

    const connectToHostWithRetry = (hostId: string, attempt: number) => {
        if (!peerRef.current) return;

        const MAX_ATTEMPTS = 5;
        const BASE_DELAY = 1000;

        if (attempt >= MAX_ATTEMPTS) {
            setStatusMsg('CONNECTION_TIMEOUT');
            return;
        }

        setStatusMsg(attempt === 0 ? 'LINKING...' : `RETRYING (${attempt + 1}/${MAX_ATTEMPTS})...`);

        const conn = peerRef.current.connect(hostId, { reliable: true });

        // Set a timeout to verify connection
        const timeoutId = setTimeout(() => {
            if (!connections.current.some(c => c.peer === hostId && c.open)) {
                console.log(`[Multiplayer] Connection timeout (Attempt ${attempt + 1}). Retrying...`);
                // Close the stalled connection attempt if it exists
                conn.close();
                const delay = BASE_DELAY * Math.pow(1.5, attempt); // Exponential backoff
                setTimeout(() => connectToHostWithRetry(hostId, attempt + 1), delay);
            }
        }, 4000); // 4s timeout per attempt

        conn.on('error', (err) => {
            clearTimeout(timeoutId);
            console.error('[Multiplayer] Connection error:', err);
            setStatusMsg('LINK_FAILED'); // Will be overwritten by retry or timeout
        });

        conn.on('open', () => {
            clearTimeout(timeoutId);
            connections.current = [conn];
            setStatusMsg('CONNECTED');
            conn.send({ type: 'join', name: playerName, team: 'bravo' });

            const pc = (conn as any).peerConnection as RTCPeerConnection | undefined;
            if (pc) {
                pc.addEventListener('iceconnectionstatechange', () => {
                    setStatusMsg(getStatusFromIceState(pc.iceConnectionState));
                });
            }
        });

        conn.on('data', (data: any) => {
            if (data.type === 'sync_squad' || data.type === 'welcome') {
                setSquad(data.squad);
            }
            if (data.type === 'start') {
                onGameStart(hostId, false, data.squad, data.mpConfig);
            }
            if (data.type === 'update_name') {
                setSquad((prev) => prev.map(m => m.id === data.id ? { ...m, name: data.name } : m));
            }
        });

        conn.on('close', () => {
            setStatusMsg('DISCONNECTED');
            setActiveRoom(null);
        });
    };

    const switchTeam = () => {
        const myId = isHost ? 'host' : (peerRef.current?.id || '');
        const myMember = squadRef.current.find(m => m.id === myId || (m.name === playerName && !isHost));
        if (!myMember) return;
        const nextTeam: 'alpha' | 'bravo' = myMember.team === 'alpha' ? 'bravo' : 'alpha';

        if (isHost) {
            setSquad((prev) => {
                const next = prev.map(m => m.id === 'host' ? { ...m, team: nextTeam } : m);
                broadcastSquad(next);
                return next;
            });
        } else {
            const conn = connections.current[0];
            if (conn) conn.send({ type: 'switch_team', name: playerName, team: nextTeam });
        }
    };

    const initiateStart = (config: any) => {
        if (!isHost || !activeRoom) return;
        connections.current.forEach(c => c.send({
            type: 'start',
            squad: squadRef.current,
            mpConfig: config
        }));
        onGameStart(activeRoom, true, squadRef.current, config);
    };

    return {
        activeRoom,
        isHost,
        squad,
        statusMsg,
        handleCreateRoom,
        handleJoinRoom,
        switchTeam,
        initiateStart,
        setSquad,
        setActiveRoom
    };
}
