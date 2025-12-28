
import React, { useState, useEffect, useRef } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { GameMode, CharacterClass, MissionConfig, MPMatchMode, MPMap, MPConfig } from '../App';
import { useReadContract, useAccount } from 'wagmi';
import { CONTRACT_ADDRESSES } from '../utils/blockchain';
import Arsenal from './Arsenal';
import Leaderboard from './Leaderboard';
import { parseEther } from 'viem';


interface SquadMember {
  name: string;
  team: 'alpha' | 'bravo';
  id: string;
}

interface Props {
  playerName: string;
  setPlayerName: (name: string) => void;
  characterClass: CharacterClass;
  setCharacterClass: (c: CharacterClass) => void;
  avatar: string | null;
  unlockedLevel: number;
  missions: MissionConfig[];
  onStart: (roomId: string | null, isHost: boolean, mode: GameMode, levelId?: number, squad?: SquadMember[], mpConfig?: MPConfig) => void;
  onLabs: () => void;
  settings: {
    audioEnabled: boolean;
    setAudioEnabled: (v: boolean) => void;
    difficultyModifier: number;
    setDifficultyModifier: (v: number) => void;
    virtualControlsEnabled: boolean;
    setVirtualControlsEnabled: (v: boolean) => void;
  };
}

const CLASS_META: Record<CharacterClass, { desc: string; hp: number; speed: number; armor: number; tech: number; icon: string; color: string }> = {
  STRIKER: { desc: "Versatile combat specialist.", hp: 120, speed: 100, armor: 60, tech: 40, icon: "🎖️", color: "#f97316" },
  GHOST: { desc: "Reconnaissance specialist.", hp: 80, speed: 150, armor: 20, tech: 100, icon: "🕶️", color: "#22d3ee" },
  TITAN: { desc: "Heavily armored juggernaut.", hp: 200, speed: 50, armor: 140, tech: 20, icon: "🛡️", color: "#78716c" }
};

const MAP_META: Record<MPMap, { name: string; desc: string; icon: string }> = {
  URBAN_RUINS: { name: "URBAN RUINS", desc: "Symmetrical tactical sector.", icon: "🏙️" },
  THE_PIT: { name: "THE PIT", desc: "Close quarters killbox.", icon: "🕳️" },
  OUTPOST_X: { name: "OUTPOST X", desc: "Industrial facility maze.", icon: "🏭" }
};

const PersonnelCard: React.FC<{ member: SquadMember, isSelf: boolean }> = ({ member, isSelf }) => {
  const isAlpha = member.team === 'alpha';
  const colorClass = isAlpha ? 'border-orange-500/30 bg-orange-500/5' : 'border-cyan-500/30 bg-cyan-500/5';

  return (
    <div className={`flex items-center gap-2 p-1.5 rounded border ${colorClass} transition-all relative overflow-hidden group hover:bg-white/5`}>
      <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${isAlpha ? 'bg-orange-500' : 'bg-cyan-500'}`}></div>
      <div className={`w-6 h-6 rounded-sm flex items-center justify-center font-black text-[10px] text-white ${isAlpha ? 'bg-orange-600' : 'bg-cyan-600'}`}>
        {member.name ? member.name[0] : '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[9px] font-black text-white uppercase tracking-wider truncate flex items-center gap-1">
          {member.name || 'UNKNOWN_UNIT'}
          {isSelf && <span className="text-[5px] bg-white/10 px-1 py-0.5 rounded text-white/40 font-bold">YOU</span>}
        </div>
      </div>
      <div className={`w-1 h-1 rounded-full animate-pulse ${isAlpha ? 'bg-orange-500' : 'bg-cyan-500'}`}></div>
    </div>
  );
};

const Lobby: React.FC<Props> = ({ playerName, setPlayerName, characterClass, setCharacterClass, avatar, unlockedLevel, missions, onStart, onLabs, settings }) => {
  const [tab, setTab] = useState<'missions' | 'multiplayer' | 'arsenal' | 'leaderboard' | 'controls' | 'settings'>('missions');
  const { address } = useAccount();

  // Token gating check for Bio-Forge (Labs)
  const { data: lmtBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.REWARDS as `0x${string}`,
    abi: [{ name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] }] as const,
    functionName: 'balanceOf',
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address },
  });

  const hasLabAccess = lmtBalance ? lmtBalance >= parseEther('100') : false;

  const [selectedLevelId, setSelectedLevelId] = useState(unlockedLevel);
  const [roomCode, setRoomCode] = useState('');
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [squad, setSquad] = useState<SquadMember[]>([{ name: playerName, team: 'alpha', id: 'host' }]);
  const [statusMsg, setStatusMsg] = useState('OFFLINE');

  const [mpMatchMode, setMpMatchMode] = useState<MPMatchMode>('TDM');
  const [mpMap, setMpMap] = useState<MPMap>('URBAN_RUINS');
  const [scoreLimit, setScoreLimit] = useState(50);
  const [alphaBots, setAlphaBots] = useState(2);
  const [bravoBots, setBravoBots] = useState(2);

  const peerRef = useRef<Peer | null>(null);
  const connections = useRef<DataConnection[]>([]);
  const squadRef = useRef<SquadMember[]>(squad);

  useEffect(() => {
    squadRef.current = squad;
  }, [squad]);

  // Sync name changes to connected peers
  useEffect(() => {
    if (!activeRoom) return; // Only sync if in a room

    const myId = isHost ? 'host' : (peerRef.current?.id || '');

    if (isHost) {
      // Host: update own squad entry and broadcast to all clients
      setSquad((prev) => {
        const next = prev.map(m => m.id === 'host' ? { ...m, name: playerName } : m);
        // Broadcast to all clients
        connections.current.forEach(c => {
          if (c.open) {
            c.send({ type: 'update_name', id: 'host', name: playerName });
          }
        });
        return next;
      });
    } else {
      // Client: send update to host
      const conn = connections.current[0];
      if (conn && conn.open) {
        conn.send({ type: 'update_name', name: playerName });
      }
    }
  }, [playerName, activeRoom, isHost]);

  const bgMusicRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (settings.audioEnabled) {
      if (!bgMusicRef.current) {
        bgMusicRef.current = new Audio('/assets/audio/bg-music.wav');
        bgMusicRef.current.loop = true;
        bgMusicRef.current.volume = 0.08;
      }
      bgMusicRef.current.play().catch(() => { });
    } else {
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
      }
    }

    return () => {
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
        bgMusicRef.current = null;
      }
    };
  }, [settings.audioEnabled]);

  useEffect(() => {
    return () => { if (peerRef.current) peerRef.current.destroy(); };
  }, []);

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

    peerRef.current = new Peer(`LM-SCTR-${code}`);
    peerRef.current.on('open', () => setStatusMsg('BROADCASTING'));
    peerRef.current.on('connection', (conn) => {
      conn.on('open', () => {
        connections.current.push(conn);
        conn.send({
          type: 'welcome',
          squad: squadRef.current,
          settings: { mpMatchMode, mpMap, scoreLimit, alphaBots, bravoBots }
        });
      });

      conn.on('data', (data: any) => {
        if (data.type === 'join') {
          setSquad((prev) => {
            const filtered = prev.filter(m => m.id !== conn.peer);
            const next = [...filtered, { name: data.name, team: data.team, id: conn.peer }];
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

  const handleJoinRoom = () => {
    if (roomCode.length !== 4) return;
    setIsHost(false);
    setActiveRoom(roomCode);
    setStatusMsg('LINKING...');

    peerRef.current = new Peer();
    peerRef.current.on('open', () => {
      const conn = peerRef.current!.connect(`LM-SCTR-${roomCode}`);
      conn.on('open', () => {
        connections.current = [conn];
        setStatusMsg('CONNECTED');
        conn.send({ type: 'join', name: playerName, team: 'bravo' });
      });
      conn.on('data', (data: any) => {
        if (data.type === 'sync_squad' || data.type === 'welcome') {
          setSquad(data.squad);
          if (data.settings) {
            setMpMatchMode(data.settings.mpMatchMode);
            setMpMap(data.settings.mpMap);
            setScoreLimit(data.settings.scoreLimit);
            setAlphaBots(data.settings.alphaBots || 0);
            setBravoBots(data.settings.bravoBots || 0);
          }
        }
        if (data.type === 'start') {
          onStart(roomCode, false, 'multiplayer', undefined, data.squad, data.mpConfig);
        }
        if (data.type === 'update_name') {
          setSquad((prev) => {
            return prev.map(m => m.id === data.id ? { ...m, name: data.name } : m);
          });
        }
      });
      conn.on('close', () => {
        setStatusMsg('DISCONNECTED');
        setActiveRoom(null);
      });
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

  const deploy = () => {
    if (tab === 'multiplayer' && activeRoom) {
      if (isHost) {
        const mapSeed = Math.random().toString(36).substring(2, 12).toUpperCase();
        const config: MPConfig = { mode: mpMatchMode, map: mpMap, alphaBots, bravoBots, scoreLimit, mapSeed };
        connections.current.forEach(c => c.send({
          type: 'start',
          squad: squadRef.current,
          mpConfig: config
        }));
        onStart(activeRoom, true, 'multiplayer', undefined, squadRef.current, config);
      }
    } else {
      onStart(null, true, 'mission', selectedLevelId);
    }
  };

  const selectedMission = missions.find(m => m.id === selectedLevelId) || missions[0];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 lg:p-10 animate-in fade-in duration-500 font-mono overflow-y-auto overflow-x-hidden relative bg-black">
      <div className="w-full max-w-[1300px] grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-8 pb-24 lg:pb-0">

        {/* LEFT NAV BAR */}
        <div className="lg:col-span-3 flex flex-col gap-2 lg:gap-6">
          <div className="tactical-panel p-3 lg:p-8 bg-stone-900/90 border border-stone-800 rounded-xl relative overflow-hidden group">
            <h1 className="font-stencil text-lg sm:text-3xl lg:text-5xl font-black text-white leading-none uppercase mb-1 drop-shadow-[0_2px_15px_rgba(249,115,22,0.3)]">
              LUCKY<br className="hidden sm:block" /><span className="text-orange-500"> MILITIA</span>
            </h1>
            <div className="text-[7px] lg:text-[10px] font-black text-stone-600 tracking-[0.2em] lg:tracking-[0.5em] uppercase">Command_Nexus</div>
          </div>

          <div className="tactical-panel flex-1 p-2 lg:p-6 bg-stone-900/60 rounded-xl border border-stone-800 flex flex-col gap-2">
            <div className="mb-1">
              <label className="text-[7px] lg:text-[10px] font-black text-orange-500/70 uppercase tracking-widest mb-1 block">Operator_ID</label>
              <input
                value={playerName}
                onChange={e => setPlayerName(e.target.value.toUpperCase())}
                className="w-full bg-black/60 border border-stone-800 p-2 lg:p-4 text-xs lg:text-xl font-black text-white outline-none focus:border-orange-500 rounded transition-all shadow-inner"
                placeholder="CALLSIGN"
              />
            </div>

            <div className="grid grid-cols-4 lg:grid-cols-1 gap-1 lg:gap-2">
              {(['missions', 'multiplayer', 'arsenal', 'leaderboard', 'controls', 'settings'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`py-2 lg:py-5 px-1 lg:px-8 text-[7px] lg:text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center lg:justify-between rounded border ${tab === t ? 'bg-orange-600 border-orange-400 text-white shadow-xl' : 'bg-stone-950/80 border-stone-800 text-stone-500 hover:text-stone-300'}`}
                >
                  <span className="flex items-center gap-1 lg:gap-4">
                    <span className="text-xs lg:text-base">
                      {t === 'missions' && '🗺️'}
                      {t === 'multiplayer' && '📡'}
                      {t === 'arsenal' && '🛡️'}
                      {t === 'leaderboard' && '🏆'}
                      {t === 'controls' && '⌨️'}
                      {t === 'settings' && '⚙️'}
                    </span>
                    <span className="hidden sm:inline">{t}</span>
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-1 lg:mt-auto pt-2 lg:pt-6 border-t border-stone-800/40">
              <button
                onClick={hasLabAccess ? onLabs : undefined}
                className={`w-full py-2 lg:py-5 border border-stone-800 rounded text-[7px] lg:text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 lg:gap-3 active:scale-[0.98] ${hasLabAccess ? 'bg-stone-950 text-stone-500 hover:text-orange-500' : 'bg-stone-950/30 text-stone-700 cursor-not-allowed grayscale'}`}
              >
                {hasLabAccess ? '🧬' : '🔒'}
                <span className="hidden sm:inline">{hasLabAccess ? 'Bio_Forge_Terminal' : 'Bio_Forge_Locked'}</span>
                <span className="sm:hidden">{hasLabAccess ? 'BIO_FORGE' : 'LOCKED'}</span>
              </button>
              {!hasLabAccess && (
                <div className="mt-2 text-[6px] lg:text-[8px] text-orange-500/60 font-black text-center uppercase tracking-tighter">
                  Requires 100 LMT to access
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CENTER CONSOLE */}
        <div className="lg:col-span-6 tactical-panel bg-stone-950/90 border border-stone-800 rounded-2xl relative flex flex-col lg:min-h-[720px] shadow-2xl">
          <div className="p-3 lg:p-8 border-b border-stone-800 flex justify-between items-center bg-stone-900/30 backdrop-blur-xl">
            <h2 className="text-xs lg:text-3xl font-black font-stencil tracking-widest text-white uppercase italic">{tab}</h2>
            <div className="flex items-center gap-1 lg:gap-3 bg-black/60 px-2 lg:px-4 py-1 lg:py-2 rounded-full border border-stone-800">
              <div className={`w-1 lg:w-2 h-1 lg:h-2 rounded-full ${statusMsg !== 'OFFLINE' ? 'bg-green-500 animate-pulse' : 'bg-stone-700'}`}></div>
              <div className="text-[6px] lg:text-[10px] font-black text-stone-500 uppercase tracking-tighter">{statusMsg}</div>
            </div>
          </div>

          <div className="lg:flex-1 lg:overflow-y-auto p-3 lg:p-8">
            {tab === 'missions' && (
              <div className="flex flex-col gap-3 lg:gap-8 h-full">
                <div className="flex-1 relative bg-black/60 rounded-xl border border-stone-800 overflow-hidden min-h-[200px] lg:min-h-[340px] shadow-inner p-2">
                  <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #444 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
                  {missions.map(m => (
                    <button
                      key={m.id}
                      disabled={m.id > unlockedLevel}
                      onClick={() => setSelectedLevelId(m.id)}
                      className={`absolute w-8 h-8 lg:w-14 lg:h-14 -translate-x-1/2 -translate-y-1/2 transition-all ${m.id <= unlockedLevel ? 'cursor-pointer hover:scale-110' : 'opacity-20 grayscale cursor-not-allowed'}`}
                      style={{ left: `${m.coords.x}%`, top: `${m.coords.y}%` }}
                    >
                      {selectedLevelId === m.id && <div className="mission-pulse"></div>}
                      <div className={`w-full h-full rounded border flex items-center justify-center font-black text-[10px] lg:text-lg ${selectedLevelId === m.id ? 'bg-orange-600 border-white text-white scale-110' : 'bg-stone-900 border-stone-800 text-stone-600'}`}>
                        {m.id}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="p-3 lg:p-6 bg-stone-900/60 border border-stone-800 rounded-lg relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-orange-600"></div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] lg:text-[16px] font-black text-white uppercase tracking-widest">{selectedMission.name}</span>
                    <div className="h-px flex-1 bg-stone-800"></div>
                    <span className="text-[7px] lg:text-[10px] font-bold text-stone-500 uppercase tracking-widest whitespace-nowrap">Level_{selectedMission.id}</span>
                  </div>
                  <p className="text-[8px] lg:text-[12px] text-stone-400 leading-relaxed font-bold italic opacity-90 pl-1 lg:pl-2">"{selectedMission.objective}"</p>
                </div>
              </div>
            )}

            {tab === 'multiplayer' && !activeRoom && (
              <div className="flex flex-col gap-4 h-full justify-center">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-8">
                  <button onClick={handleCreateRoom} className="p-6 lg:p-12 bg-stone-900/30 border border-stone-800 rounded-xl text-center hover:bg-stone-900/50 transition-all">
                    <div className="w-10 h-10 lg:w-20 lg:h-20 bg-orange-600/10 rounded-lg mx-auto flex items-center justify-center mb-3">
                      <span className="text-xl lg:text-5xl">📡</span>
                    </div>
                    <h3 className="text-[10px] lg:text-xl font-black text-white uppercase mb-1">Host_Sector</h3>
                    <p className="text-[6px] lg:text-[10px] text-stone-600 uppercase font-bold tracking-widest">Generate Private Uplink</p>
                  </button>

                  <div className="p-6 lg:p-12 bg-stone-950/80 border border-stone-800 rounded-xl text-center shadow-xl">
                    <h3 className="text-[10px] lg:text-xl font-black text-white uppercase mb-3 lg:mb-6">Link_Access</h3>
                    <div className="space-y-3">
                      <input
                        value={roomCode}
                        onChange={e => setRoomCode(e.target.value.toUpperCase())}
                        maxLength={4}
                        className="w-full bg-black border border-stone-800 p-2 lg:p-5 text-center text-xl lg:text-5xl font-black tracking-widest text-orange-500 rounded outline-none focus:border-orange-600"
                        placeholder="0000"
                      />
                      <button onClick={handleJoinRoom} disabled={roomCode.length !== 4} className="w-full py-2 lg:py-4 bg-white disabled:bg-stone-800 disabled:text-stone-600 text-stone-950 font-black text-[9px] lg:text-[12px] uppercase rounded transition-all">Establish_Link</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'multiplayer' && activeRoom && (
              <div className="flex flex-col gap-3 lg:gap-6 h-full">
                <div className="grid grid-cols-2 gap-2 lg:gap-4">
                  <div className="bg-stone-900/40 border border-stone-800 rounded p-2 lg:p-4 flex items-center gap-2">
                    <div className="text-lg lg:text-3xl">{MAP_META[mpMap].icon}</div>
                    <div>
                      <div className="text-[6px] lg:text-[8px] text-stone-600 uppercase font-black">MAP</div>
                      <div className="text-[8px] lg:text-[12px] text-white font-black uppercase truncate">{MAP_META[mpMap].name}</div>
                    </div>
                  </div>
                  <div className="bg-stone-900/40 border border-stone-800 rounded p-2 lg:p-4 flex items-center gap-2">
                    <div className="text-lg lg:text-3xl">⚔️</div>
                    <div>
                      <div className="text-[6px] lg:text-[8px] text-stone-600 uppercase font-black">MODE</div>
                      <div className="text-[8px] lg:text-[12px] text-orange-500 font-black uppercase">{mpMatchMode}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 lg:gap-4">
                    <div className="space-y-2">
                      <div className="text-[10px] font-black text-white bg-orange-600/20 px-2 py-0.5 rounded border border-orange-500/30 uppercase flex items-center justify-between">
                        <span>ALPHA_SQUAD</span>
                        <div className="flex gap-1">
                          <div className="w-1 h-1 bg-orange-500 rounded-full animate-pulse"></div>
                          <div className="w-1 h-1 bg-orange-500 rounded-full animate-pulse delay-75"></div>
                          <div className="w-1 h-1 bg-orange-500 rounded-full animate-pulse delay-150"></div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {squad.filter(m => m.team === 'alpha').map((m, i) => <PersonnelCard key={m.id || i} member={m} isSelf={m.name === playerName} />)}
                        {squad.filter(m => m.team === 'alpha').length === 0 && <div className="h-8 border border-dashed border-stone-900 rounded flex items-center justify-center text-[6px] text-stone-800 uppercase font-bold italic">Awaiting_Uplink</div>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[10px] font-black text-white bg-cyan-600/20 px-2 py-0.5 rounded border border-cyan-500/30 uppercase flex items-center justify-between">
                        <span>BRAVO_SQUAD</span>
                        <div className="flex gap-1">
                          <div className="w-1 h-1 bg-cyan-500 rounded-full animate-pulse"></div>
                          <div className="w-1 h-1 bg-cyan-500 rounded-full animate-pulse delay-75"></div>
                          <div className="w-1 h-1 bg-cyan-500 rounded-full animate-pulse delay-150"></div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {squad.filter(m => m.team === 'bravo').map((m, i) => <PersonnelCard key={m.id || i} member={m} isSelf={m.name === playerName} />)}
                        {squad.filter(m => m.team === 'bravo').length === 0 && <div className="h-8 border border-dashed border-stone-900 rounded flex items-center justify-center text-[6px] text-stone-800 uppercase font-bold italic">Awaiting_Uplink</div>}
                      </div>
                    </div>
                  </div>

                  {isHost && (
                    <div className="mt-4 p-4 bg-stone-900/60 border border-stone-800 rounded-xl space-y-4">
                      <div className="flex justify-between items-center bg-black/40 p-2 rounded-lg border border-orange-500/10">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">ALLY_BOTS</span>
                          <span className="text-[7px] text-stone-600 font-bold uppercase">Alpha_Team</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <button onClick={() => setAlphaBots(prev => Math.max(0, prev - 1))} className="w-8 h-8 bg-black/60 border border-stone-800 rounded flex items-center justify-center text-white hover:border-orange-500 transition-all">-</button>
                          <span className="text-xl font-stencil text-white w-8 text-center">{alphaBots}</span>
                          <button onClick={() => setAlphaBots(prev => Math.min(6, prev + 1))} className="w-8 h-8 bg-black/60 border border-stone-800 rounded flex items-center justify-center text-white hover:border-orange-500 transition-all">+</button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center bg-black/40 p-2 rounded-lg border border-cyan-500/10">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">ENEMY_BOTS</span>
                          <span className="text-[7px] text-stone-600 font-bold uppercase">Bravo_Team</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <button onClick={() => setBravoBots(prev => Math.max(0, prev - 1))} className="w-8 h-8 bg-black/60 border border-stone-800 rounded flex items-center justify-center text-white hover:border-cyan-500 transition-all">-</button>
                          <span className="text-xl font-stencil text-white w-8 text-center">{bravoBots}</span>
                          <button onClick={() => setBravoBots(prev => Math.min(6, prev + 1))} className="w-8 h-8 bg-black/60 border border-stone-800 rounded flex items-center justify-center text-white hover:border-cyan-500 transition-all">+</button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-auto flex flex-col sm:flex-row gap-2 pt-4 border-t border-stone-800/60">
                    <button onClick={switchTeam} className="flex-1 py-2 lg:py-4 bg-stone-900/60 border border-stone-800 rounded text-stone-500 font-black text-[8px] lg:text-[11px] uppercase hover:text-white transition-all">Switch_Team</button>
                    <div className="bg-stone-950 px-4 py-1.5 rounded border border-stone-800 flex items-center justify-center gap-2">
                      <span className="text-[6px] text-stone-600 font-black">CODE</span>
                      <span className="text-sm lg:text-xl font-black text-orange-500 font-stencil tracking-widest">{activeRoom}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'arsenal' && (
              <Arsenal />
            )}

            {tab === 'leaderboard' && (
              <Leaderboard />
            )}

            {tab === 'controls' && (
              <div className="space-y-4 lg:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="tactical-panel bg-black/40 border border-stone-800 p-4 rounded-xl">
                    <div className="text-[9px] font-black text-orange-500 uppercase mb-3 flex items-center gap-2">
                      <span className="text-sm">⌨️</span> MOVEMENT
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-stone-500">WASD / ARROWS</span>
                        <span className="text-white">OMNIDIRECTIONAL</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-stone-500">SPACE / L-SHIFT</span>
                        <span className="text-orange-500">BOOST_THRUSTER</span>
                      </div>
                    </div>
                  </div>
                  <div className="tactical-panel bg-black/40 border border-stone-800 p-4 rounded-xl">
                    <div className="text-[9px] font-black text-orange-500 uppercase mb-3 flex items-center gap-2">
                      <span className="text-sm">🖱️</span> COMBAT
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-stone-500">MOUSE MOVEMENT</span>
                        <span className="text-white">NEURAL_AIMING</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-stone-500">LEFT CLICK</span>
                        <span className="text-red-500">FIRE_WEAPON</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="tactical-panel bg-black/40 border border-stone-800 p-4 rounded-xl">
                  <div className="text-[9px] font-black text-cyan-400 uppercase mb-3 flex items-center gap-2">
                    <span className="text-sm">🔫</span> ARSENAL_HOTKEYS
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <div key={num} className="bg-stone-900 border border-stone-800 p-2 rounded text-center">
                        <div className="text-orange-500 font-black text-xs">{num}</div>
                        <div className="text-[6px] text-stone-600 uppercase font-black">SLOT</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-orange-500/5 border border-orange-500/20 p-3 rounded text-[9px] text-orange-500/60 font-bold italic text-center">
                  "NEURAL-LINK CALIBRATED FOR STANDARD QWERTY PERIPHERALS."
                </div>
              </div>
            )}

            {tab === 'settings' && (
              <div className="space-y-6 h-full">
                <div className="space-y-3">
                  <h3 className="text-[10px] lg:text-[13px] font-black text-white uppercase border-b border-stone-800 pb-1 tracking-widest">Acoustics</h3>
                  <button
                    onClick={() => settings.setAudioEnabled(!settings.audioEnabled)}
                    className={`w-full p-3 lg:p-6 border rounded-xl flex justify-between items-center transition-all ${settings.audioEnabled ? 'bg-orange-500/10 border-orange-500/40 shadow-xl' : 'bg-stone-950 border-stone-800'}`}
                  >
                    <span className={`text-[10px] lg:text-[13px] font-black uppercase ${settings.audioEnabled ? 'text-white' : 'text-stone-600'}`}>Master_Audio</span>
                    <div className={`w-8 lg:w-12 h-4 lg:h-6 rounded-full p-0.5 transition-all ${settings.audioEnabled ? 'bg-orange-600 shadow-[0_0_10px_#f97316]' : 'bg-stone-900'}`}>
                      <div className={`w-3 lg:w-5 h-3 lg:h-5 bg-white rounded-full transition-all transform ${settings.audioEnabled ? 'translate-x-4 lg:translate-x-6' : 'translate-x-0'}`}></div>
                    </div>
                  </button>
                </div>

                <div className="space-y-3">
                  <h3 className="text-[10px] lg:text-[13px] font-black text-white uppercase border-b border-stone-800 pb-1 tracking-widest">User_Interface</h3>
                  <button
                    onClick={() => settings.setVirtualControlsEnabled(!settings.virtualControlsEnabled)}
                    className={`w-full p-3 lg:p-6 border rounded-xl flex justify-between items-center transition-all ${settings.virtualControlsEnabled ? 'bg-orange-500/10 border-orange-500/40 shadow-xl' : 'bg-stone-950 border-stone-800'}`}
                  >
                    <span className={`text-[10px] lg:text-[13px] font-black uppercase ${settings.virtualControlsEnabled ? 'text-white' : 'text-stone-600'}`}>Hand_Control_Overlay</span>
                    <div className={`w-8 lg:w-12 h-4 lg:h-6 rounded-full p-0.5 transition-all ${settings.virtualControlsEnabled ? 'bg-orange-600 shadow-[0_0_10px_#f97316]' : 'bg-stone-900'}`}>
                      <div className={`w-3 lg:w-5 h-3 lg:h-5 bg-white rounded-full transition-all transform ${settings.virtualControlsEnabled ? 'translate-x-4 lg:translate-x-6' : 'translate-x-0'}`}></div>
                    </div>
                  </button>
                </div>

                <div className="space-y-3">
                  <h3 className="text-[10px] lg:text-[13px] font-black text-white uppercase border-b border-stone-800 pb-1 tracking-widest">Simulation_Load</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {[
                      { val: 0.5, label: 'RECRUIT' },
                      { val: 1.0, label: 'VETERAN' },
                      { val: 1.5, label: 'ELITE' },
                      { val: 2.5, label: 'LETHAL' }
                    ].map(item => (
                      <button
                        key={item.val}
                        onClick={() => settings.setDifficultyModifier(item.val)}
                        className={`p-2 lg:p-4 border rounded-xl transition-all text-[8px] lg:text-[11px] font-black ${settings.difficultyModifier === item.val ? 'bg-white border-white text-stone-950 scale-105' : 'bg-black/60 border-stone-800 text-stone-600 hover:text-stone-300'}`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT UNIT SPEC PANEL */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          <div className="tactical-panel flex-1 bg-stone-900/90 border border-stone-800 rounded-2xl p-4 lg:p-8 flex flex-col gap-4 lg:gap-3 shadow-2xl relative overflow-hidden">
            <div className="grid grid-cols-3 gap-3 lg:gap-3">
              {(['STRIKER', 'GHOST', 'TITAN'] as CharacterClass[]).map(c => (
                <button
                  key={c}
                  onClick={() => setCharacterClass(c)}
                  className={`aspect-square rounded-xl border transition-all flex flex-col items-center justify-center ${characterClass === c ? 'bg-white border-white text-stone-950 scale-105 lg:scale-110 shadow-xl' : 'bg-stone-950 border-stone-800 text-stone-700 hover:text-stone-400'}`}
                >
                  <span className="text-3xl lg:text-2xl mb-1">{CLASS_META[c].icon}</span>
                  <span className="text-[10px] lg:text-[8px] font-black uppercase tracking-tight">{c}</span>
                </button>
              ))}
            </div>

            <div className="text-center pt-3 lg:pt-2">
              <h3 className="text-2xl lg:text-3xl font-black font-stencil text-white uppercase italic tracking-widest">{characterClass}</h3>
              <p className="text-[11px] lg:text-[10px] text-stone-500 font-bold px-2 mt-2 leading-relaxed">"{CLASS_META[characterClass].desc}"</p>
            </div>

            <div className="space-y-4 lg:space-y-3 mt-auto pt-4 border-t border-stone-800/60">
              <div className="space-y-2 lg:space-y-1.5">
                <div className="flex justify-between text-[11px] lg:text-[10px] font-black text-stone-600 uppercase px-1">
                  <span>Hull_Integrity</span>
                  <span className="text-stone-300">{CLASS_META[characterClass].hp}</span>
                </div>
                <div className="h-2.5 lg:h-2 bg-stone-950 rounded-full overflow-hidden border border-stone-800 p-[1px]">
                  <div className="h-full bg-orange-600 transition-all duration-700 shadow-[0_0_8px_#f97316]" style={{ width: `${(CLASS_META[characterClass].hp / 200) * 100}%` }}></div>
                </div>
              </div>
              <div className="space-y-2 lg:space-y-1.5">
                <div className="flex justify-between text-[11px] lg:text-[10px] font-black text-stone-600 uppercase px-1">
                  <span>Kinetic_Speed</span>
                  <span className="text-stone-300">{CLASS_META[characterClass].speed}</span>
                </div>
                <div className="h-2.5 lg:h-2 bg-stone-950 rounded-full overflow-hidden border border-stone-800 p-[1px]">
                  <div className="h-full bg-cyan-500 transition-all duration-700 shadow-[0_0_8px_#22d3ee]" style={{ width: `${(CLASS_META[characterClass].speed / 150) * 100}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <button
            disabled={tab === 'multiplayer' && (!activeRoom || !isHost || squad.length < 2)}
            onClick={deploy}
            className="hidden lg:block py-6 lg:py-12 bg-white disabled:bg-stone-900 disabled:text-stone-800 text-stone-950 font-stencil text-2xl lg:text-5xl tracking-[0.2em] transition-all rounded-2xl border-b-8 border-stone-300 active:translate-y-1 active:border-b-2 hover:bg-orange-600 hover:text-white"
          >
            DEPLOY
          </button>
        </div>
      </div>

      {/* MOBILE STICKY DEPLOY BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 w-full p-4 bg-stone-950/95 backdrop-blur-lg border-t border-stone-800 flex items-center justify-between z-[500] shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
        <div className="flex flex-col">
          <span className="text-[6px] font-black text-orange-500/60 uppercase tracking-widest">System_Link</span>
          <span className="text-[9px] font-black text-white uppercase tracking-widest">{characterClass} // READY</span>
        </div>
        <button
          disabled={tab === 'multiplayer' && (!activeRoom || !isHost || squad.length < 2)}
          onClick={deploy}
          className="px-6 py-3 bg-orange-600 text-white font-black text-[10px] uppercase tracking-widest rounded border-b-4 border-orange-800 active:translate-y-1 active:border-b-0 disabled:bg-stone-800 disabled:text-stone-600 transition-all shadow-lg"
        >
          Tactical Deployment
        </button>
      </div>
    </div>
  );
};

export default Lobby;
