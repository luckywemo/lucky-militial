import React, { useState, useEffect, useRef } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { GameMode, CharacterClass, MissionConfig, MPMatchMode, MPMap, MPConfig } from '../App';

interface SquadMember {
  name: string;
  team: 'alpha' | 'bravo';
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
  };
}

const CLASS_META: Record<CharacterClass, { desc: string; hp: number; speed: number; armor: number; tech: number; icon: string; color: string }> = {
  STRIKER: { desc: "Versatile combat specialist for high-intensity frontline operations.", hp: 120, speed: 100, armor: 60, tech: 40, icon: "🎖️", color: "#f97316" },
  GHOST: { desc: "Reconnaissance specialist utilizing advanced stealth and speed-boost gear.", hp: 80, speed: 150, armor: 20, tech: 100, icon: "🕶️", color: "#22d3ee" },
  TITAN: { desc: "Heavily armored juggernaut designed for static defense and area denial.", hp: 200, speed: 50, armor: 140, tech: 20, icon: "🛡️", color: "#78716c" }
};

const MAP_META: Record<MPMap, { name: string; desc: string; icon: string }> = {
  URBAN_RUINS: { name: "URBAN RUINS", desc: "Symmetrical tactical sector.", icon: "🏙️" },
  THE_PIT: { name: "THE PIT", desc: "Close quarters killbox.", icon: "🕳️" },
  OUTPOST_X: { name: "OUTPOST X", desc: "Industrial facility maze.", icon: "🏭" }
};

const PersonnelCard: React.FC<{ member: SquadMember, isSelf: boolean }> = ({ member, isSelf }) => {
  const isAlpha = member.team === 'alpha';
  const colorClass = isAlpha ? 'border-orange-500/30 bg-orange-500/5' : 'border-cyan-500/30 bg-cyan-500/5';
  const textClass = isAlpha ? 'text-orange-500' : 'text-cyan-500';
  const badgeClass = isAlpha ? 'bg-orange-600' : 'bg-cyan-600';

  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-lg border ${colorClass} transition-all relative overflow-hidden group hover:bg-white/5`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${isAlpha ? 'bg-orange-500' : 'bg-cyan-500'}`}></div>
      <div className={`w-8 h-8 rounded-sm flex items-center justify-center font-black text-xs text-white ${badgeClass} shadow-lg border border-white/10`}>
        {member.name[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-black text-white uppercase tracking-wider truncate flex items-center gap-2">
          {member.name}
          {isSelf && <span className="text-[6px] bg-white/10 px-1 py-0.5 rounded text-white/40 font-bold">YOU</span>}
        </div>
        <div className={`text-[7px] font-bold uppercase tracking-widest ${textClass} opacity-80`}>
          {member.team}_UNIT_STATUS_OK
        </div>
      </div>
      <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isAlpha ? 'bg-orange-500' : 'bg-cyan-500'}`}></div>
    </div>
  );
};

const Lobby: React.FC<Props> = ({ playerName, setPlayerName, characterClass, setCharacterClass, avatar, unlockedLevel, missions, onStart, onLabs, settings }) => {
  const [tab, setTab] = useState<'missions' | 'multiplayer' | 'settings'>('missions');
  const [selectedLevelId, setSelectedLevelId] = useState(unlockedLevel);
  const [roomCode, setRoomCode] = useState('');
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [squad, setSquad] = useState<SquadMember[]>([{ name: playerName, team: 'alpha' }]);
  const [statusMsg, setStatusMsg] = useState('OFFLINE');
  
  const [mpMatchMode, setMpMatchMode] = useState<MPMatchMode>('TDM');
  const [mpMap, setMpMap] = useState<MPMap>('URBAN_RUINS');
  const [scoreLimit, setScoreLimit] = useState(50);

  const peerRef = useRef<Peer | null>(null);
  const connections = useRef<DataConnection[]>([]);

  const selectedMission = missions.find(m => m.id === selectedLevelId) || missions[0];

  useEffect(() => {
    return () => { if (peerRef.current) peerRef.current.destroy(); };
  }, []);

  const handleCreateRoom = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setIsHost(true);
    setActiveRoom(code);
    setSquad([{ name: playerName, team: 'alpha' }]);
    setStatusMsg('TRANSMITTING...');
    
    peerRef.current = new Peer(`LM-SCTR-${code}`);
    peerRef.current.on('open', () => setStatusMsg('BROADCASTING'));
    peerRef.current.on('connection', (conn) => {
      conn.on('open', () => {
        connections.current.push(conn);
        conn.send({ 
          type: 'welcome', 
          squad: [...squad, { name: playerName, team: 'alpha' }],
          settings: { mpMatchMode, mpMap, scoreLimit }
        });
      });
      conn.on('data', (data: any) => {
        if (data.type === 'join') {
          setSquad((prev) => {
            const next = [...prev, { name: data.name, team: data.team }];
            connections.current.forEach(c => c.send({ type: 'sync_squad', squad: next }));
            return next;
          });
        }
        if (data.type === 'switch_team') {
          setSquad((prev) => {
            const next = prev.map(m => m.name === data.name ? { ...m, team: data.team } : m);
            connections.current.forEach(c => c.send({ type: 'sync_squad', squad: next }));
            return next;
          });
        }
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
          }
        }
        if (data.type === 'start') {
          onStart(roomCode, false, 'multiplayer', undefined, data.squad, data.mpConfig);
        }
      });
    });
  };

  const switchTeam = () => {
    const myMember = squad.find(m => m.name === playerName);
    if (!myMember) return;
    const nextTeam: 'alpha' | 'bravo' = myMember.team === 'alpha' ? 'bravo' : 'alpha';
    
    if (isHost) {
      setSquad((prev) => {
        const next = prev.map(m => m.name === playerName ? { ...m, team: nextTeam } : m);
        connections.current.forEach(c => c.send({ type: 'sync_squad', squad: next }));
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
        const config: MPConfig = { mode: mpMatchMode, map: mpMap, alphaBots: 2, bravoBots: 2, scoreLimit };
        connections.current.forEach(c => c.send({ type: 'start', squad, mpConfig: config }));
        onStart(activeRoom, true, 'multiplayer', undefined, squad, config);
      }
    } else {
      onStart(null, true, 'mission', selectedLevelId);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 lg:p-10 animate-in fade-in duration-500 font-mono overflow-y-auto overflow-x-hidden">
      <div className="w-full max-w-[1300px] grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8">
        
        {/* LEFT NAV BAR */}
        <div className="lg:col-span-3 flex flex-col gap-4 lg:gap-6">
          <div className="tactical-panel p-4 sm:p-8 bg-stone-900/90 border border-stone-800 rounded-xl lg:rounded-2xl relative overflow-hidden group">
             <h1 className="font-stencil text-2xl sm:text-3xl lg:text-5xl font-black text-white leading-none uppercase mb-1 sm:mb-2 drop-shadow-[0_2px_15px_rgba(249,115,22,0.3)]">
               LUCKY<br className="hidden sm:block"/><span className="text-orange-500"> MILITIA</span>
             </h1>
             <div className="text-[8px] lg:text-[10px] font-black text-stone-600 tracking-[0.3em] lg:tracking-[0.5em] uppercase">Command_Nexus_Terminal</div>
          </div>

          <div className="tactical-panel flex-1 p-4 lg:p-6 bg-stone-900/60 rounded-xl lg:rounded-2xl border border-stone-800 flex flex-col gap-3 lg:gap-4">
             <div className="mb-2">
               <label className="text-[8px] lg:text-[10px] font-black text-orange-500/70 uppercase tracking-[0.3em] lg:tracking-[0.4em] mb-1.5 lg:mb-2.5 block px-1">Operator_Identity</label>
               <input 
                 value={playerName}
                 onChange={e => setPlayerName(e.target.value.toUpperCase())}
                 className="w-full bg-black/60 border border-stone-800 p-3 lg:p-4 text-sm lg:text-xl font-black text-white outline-none focus:border-orange-500 rounded-lg lg:rounded-xl transition-all shadow-inner placeholder:opacity-20"
                 placeholder="ENTER CALLSIGN"
               />
             </div>

             <div className="grid grid-cols-3 lg:grid-cols-1 gap-2 lg:gap-2">
               {(['missions', 'multiplayer', 'settings'] as const).map(t => (
                 <button 
                   key={t}
                   onClick={() => setTab(t)}
                   className={`py-3 lg:py-5 px-2 lg:px-8 text-[9px] lg:text-[11px] font-black uppercase tracking-[0.2em] lg:tracking-[0.4em] transition-all flex items-center justify-center lg:justify-between rounded-lg lg:rounded-xl border-2 ${tab === t ? 'bg-orange-600 border-orange-400 text-white shadow-xl' : 'bg-stone-950/80 border-stone-800 text-stone-500 hover:text-stone-300 hover:bg-stone-900'}`}
                 >
                   <span className="flex items-center gap-2 lg:gap-4">
                     <span className="text-sm lg:text-base">{t === 'missions' && '🗺️'}{t === 'multiplayer' && '📡'}{t === 'settings' && '⚙️'}</span>
                     <span className="hidden sm:inline">{t}</span>
                   </span>
                   {tab === t && <div className="hidden lg:block w-2 h-2 bg-white rounded-full shadow-[0_0_10px_white]"></div>}
                 </button>
               ))}
             </div>

             <div className="mt-2 lg:mt-auto pt-3 lg:pt-6 border-t border-stone-800/40">
                <button onClick={onLabs} className="w-full py-3 lg:py-5 bg-stone-950 border border-stone-800 rounded-lg lg:rounded-xl text-[8px] lg:text-[10px] font-black uppercase tracking-[0.3em] lg:tracking-[0.4em] text-stone-600 hover:text-orange-500 hover:border-orange-900/50 transition-all flex items-center justify-center gap-2 lg:gap-3 active:scale-[0.98]">
                   🧬 <span className="hidden sm:inline">Bio_Forge_Terminal</span><span className="sm:hidden">BIO_FORGE</span>
                </button>
             </div>
          </div>
        </div>

        {/* CENTER CONSOLE */}
        <div className="lg:col-span-6 tactical-panel bg-stone-950/90 border border-stone-800 rounded-2xl lg:rounded-3xl relative overflow-hidden flex flex-col min-h-[400px] lg:min-h-[720px] shadow-2xl">
           <div className="p-4 lg:p-8 border-b border-stone-800 flex justify-between items-center bg-stone-900/30 backdrop-blur-xl">
              <h2 className="text-xl lg:text-3xl font-black font-stencil tracking-[0.2em] lg:tracking-[0.3em] text-white uppercase italic drop-shadow-lg">{tab}</h2>
              <div className="flex items-center gap-2 lg:gap-3 bg-black/60 px-3 lg:px-5 py-1.5 lg:py-2.5 rounded-full border border-stone-800">
                <div className={`w-1.5 lg:w-2 h-1.5 lg:h-2 rounded-full ${statusMsg !== 'OFFLINE' ? 'bg-green-500 animate-pulse' : 'bg-stone-700'}`}></div>
                <div className="text-[8px] lg:text-[10px] font-black text-stone-500 uppercase tracking-widest">{statusMsg}</div>
              </div>
           </div>

           <div className="flex-1 overflow-y-auto p-4 lg:p-8 scrollbar-hide">
              {tab === 'missions' && (
                <div className="flex flex-col gap-4 lg:gap-8 h-full animate-in fade-in slide-in-from-bottom-6 duration-500">
                   <div className="flex-1 relative bg-black/60 rounded-xl lg:rounded-2xl border border-stone-800 overflow-hidden min-h-[280px] lg:min-h-[340px] shadow-inner p-4">
                      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #444 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
                      {missions.map(m => (
                        <button
                          key={m.id}
                          disabled={m.id > unlockedLevel}
                          onClick={() => setSelectedLevelId(m.id)}
                          className={`absolute w-10 h-10 lg:w-14 lg:h-14 -translate-x-1/2 -translate-y-1/2 transition-all ${m.id <= unlockedLevel ? 'cursor-pointer hover:scale-125' : 'opacity-20 grayscale cursor-not-allowed'}`}
                          style={{ left: `${m.coords.x}%`, top: `${m.coords.y}%` }}
                        >
                          {selectedLevelId === m.id && <div className="mission-pulse"></div>}
                          <div className={`w-full h-full rounded-sm border-2 flex items-center justify-center font-black text-sm lg:text-lg shadow-2xl transition-all ${selectedLevelId === m.id ? 'bg-orange-600 border-white text-white scale-110' : 'bg-stone-900 border-stone-800 text-stone-600'}`}>
                             {m.id}
                          </div>
                        </button>
                      ))}
                   </div>
                   <div className="p-4 lg:p-8 bg-stone-900/60 border border-stone-800 rounded-xl lg:rounded-2xl relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1.5 lg:w-2 h-full bg-orange-600"></div>
                      <div className="flex items-center gap-2 lg:gap-4 mb-2 lg:mb-3">
                        <span className="text-sm lg:text-[16px] font-black text-white uppercase tracking-[0.1em] lg:tracking-[0.2em] hud-glow">{selectedMission.name}</span>
                        <div className="h-px flex-1 bg-stone-800"></div>
                        <span className="text-[8px] lg:text-[10px] font-bold text-stone-500 uppercase tracking-widest whitespace-nowrap">Level_{selectedMission.id}</span>
                      </div>
                      <p className="text-[10px] lg:text-[12px] text-stone-400 leading-relaxed font-bold italic opacity-90 pl-1 lg:pl-2">"{selectedMission.objective}"</p>
                   </div>
                </div>
              )}

              {tab === 'multiplayer' && !activeRoom && (
                <div className="flex flex-col gap-4 lg:gap-8 h-full justify-center animate-in fade-in slide-in-from-bottom-6 duration-500">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-8">
                      <button onClick={handleCreateRoom} className="group p-6 lg:p-12 bg-stone-900/30 border-2 border-stone-800 hover:border-orange-500/50 rounded-2xl lg:rounded-3xl text-center transition-all hover:bg-stone-900/50">
                         <div className="w-14 h-14 lg:w-20 lg:h-20 bg-orange-600/10 rounded-xl lg:rounded-2xl mx-auto flex items-center justify-center group-hover:bg-orange-600 group-hover:shadow-[0_0_30px_rgba(249,115,22,0.4)] transition-all mb-4 lg:mb-8 border border-orange-500/10">
                           <span className="text-3xl lg:text-5xl">📡</span>
                         </div>
                         <h3 className="text-sm lg:text-xl font-black text-white uppercase tracking-[0.2em] lg:tracking-[0.3em] mb-1 lg:mb-2">Host_Sector</h3>
                         <p className="text-[8px] lg:text-[10px] text-stone-600 uppercase tracking-widest font-bold">Generate Private Uplink</p>
                      </button>

                      <div className="p-6 lg:p-12 bg-stone-950/80 border-2 border-stone-800 rounded-2xl lg:rounded-3xl text-center shadow-xl">
                         <h3 className="text-sm lg:text-xl font-black text-white uppercase tracking-[0.2em] lg:tracking-[0.3em] mb-4 lg:mb-6">Link_Access</h3>
                         <div className="space-y-4 lg:space-y-6">
                            <input 
                              value={roomCode} 
                              onChange={e => setRoomCode(e.target.value.toUpperCase())} 
                              maxLength={4} 
                              className="w-full bg-black border-2 border-stone-800 p-3 lg:p-5 text-center text-3xl lg:text-5xl font-black tracking-[0.3em] lg:tracking-[0.5em] text-orange-500 rounded-xl lg:rounded-2xl outline-none focus:border-orange-600 shadow-inner" 
                              placeholder="0000" 
                            />
                            <button onClick={handleJoinRoom} disabled={roomCode.length !== 4} className="w-full py-3 lg:py-5 bg-white disabled:bg-stone-800 disabled:text-stone-600 text-stone-950 font-black text-[10px] lg:text-[12px] uppercase tracking-[0.3em] lg:tracking-[0.5em] rounded-lg lg:rounded-xl transition-all shadow-xl hover:bg-stone-200">Establish_Link</button>
                         </div>
                      </div>
                   </div>
                </div>
              )}

              {tab === 'multiplayer' && activeRoom && (
                <div className="flex flex-col gap-4 lg:gap-8 h-full animate-in fade-in zoom-in-95 duration-500">
                   <div className="grid grid-cols-2 gap-3 lg:gap-6">
                      <div className="tactical-panel bg-stone-900/40 border border-stone-800 rounded-xl lg:rounded-2xl overflow-hidden p-3 lg:p-6 flex items-center gap-3 lg:gap-6 shadow-lg">
                        <div className="text-2xl lg:text-5xl">{MAP_META[mpMap].icon}</div>
                        <div>
                           <div className="text-[7px] lg:text-[9px] text-stone-600 uppercase font-black tracking-widest mb-0.5 lg:mb-1 opacity-60">MAP_SECTOR</div>
                           <div className="text-[11px] lg:text-[15px] text-white font-black uppercase tracking-wider">{MAP_META[mpMap].name}</div>
                        </div>
                      </div>
                      <div className="tactical-panel bg-stone-900/40 border border-stone-800 rounded-xl lg:rounded-2xl p-3 lg:p-6 flex items-center gap-3 lg:gap-6 shadow-lg">
                        <div className="text-2xl lg:text-5xl">⚔️</div>
                        <div>
                           <div className="text-[7px] lg:text-[9px] text-stone-600 uppercase font-black tracking-widest mb-0.5 lg:mb-1 opacity-60">PROTOCOL</div>
                           <div className="text-[11px] lg:text-[15px] text-orange-500 font-black uppercase tracking-wider">{mpMatchMode}</div>
                        </div>
                      </div>
                   </div>

                   <div className="space-y-4 lg:space-y-6">
                      <div className="flex items-center gap-3 lg:gap-6 px-1 lg:px-2">
                        <div className="h-px flex-1 bg-stone-800/80"></div>
                        <h3 className="text-[8px] lg:text-[11px] font-black text-stone-600 uppercase tracking-[0.4em] lg:tracking-[0.6em] whitespace-nowrap">Tactical_Assignments</h3>
                        <div className="h-px flex-1 bg-stone-800/80"></div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 lg:gap-6">
                        <div className="space-y-3 lg:space-y-4">
                           <div className="text-[8px] lg:text-[11px] font-black text-orange-500 uppercase tracking-[0.2em] lg:tracking-[0.3em] flex items-center gap-2 lg:gap-3">
                             <div className="w-2 lg:w-2.5 h-2 lg:h-2.5 rounded-full bg-orange-500 shadow-[0_0_10px_#f97316]"></div> Alpha
                           </div>
                           <div className="space-y-2 lg:space-y-3">
                              {squad.filter(m => m.team === 'alpha').map((m, i) => <PersonnelCard key={i} member={m} isSelf={m.name === playerName} />)}
                              {squad.filter(m => m.team === 'alpha').length === 0 && <div className="h-10 lg:h-16 border-2 border-dashed border-stone-900 rounded-lg lg:rounded-xl flex items-center justify-center text-[7px] lg:text-[10px] text-stone-800 uppercase font-bold tracking-widest italic">Awaiting</div>}
                           </div>
                        </div>
                        <div className="space-y-3 lg:space-y-4">
                           <div className="text-[8px] lg:text-[11px] font-black text-cyan-500 uppercase tracking-[0.2em] lg:tracking-[0.3em] flex items-center gap-2 lg:gap-3">
                             <div className="w-2 lg:w-2.5 h-2 lg:h-2.5 rounded-full bg-cyan-500 shadow-[0_0_10px_#22d3ee]"></div> Bravo
                           </div>
                           <div className="space-y-2 lg:space-y-3">
                              {squad.filter(m => m.team === 'bravo').map((m, i) => <PersonnelCard key={i} member={m} isSelf={m.name === playerName} />)}
                              {squad.filter(m => m.team === 'bravo').length === 0 && <div className="h-10 lg:h-16 border-2 border-dashed border-stone-900 rounded-lg lg:rounded-xl flex items-center justify-center text-[7px] lg:text-[10px] text-stone-800 uppercase font-bold tracking-widest italic">Awaiting</div>}
                           </div>
                        </div>
                      </div>
                   </div>

                   <div className="mt-auto flex flex-col sm:flex-row gap-3 lg:gap-6 pt-4 lg:pt-8 border-t border-stone-800/60">
                      <button onClick={switchTeam} className="flex-1 py-3 lg:py-5 bg-stone-900/60 border-2 border-stone-800 rounded-lg lg:rounded-xl text-stone-500 font-black text-[9px] lg:text-[11px] uppercase tracking-[0.2em] lg:tracking-[0.4em] hover:text-white hover:border-stone-600 transition-all active:scale-[0.98]">Switch_Deployment</button>
                      <div className="bg-stone-950 px-6 lg:px-10 py-2 lg:py-3 rounded-lg lg:rounded-xl border-2 border-stone-800 flex flex-row sm:flex-col items-center justify-center gap-3 sm:gap-1 shadow-inner">
                        <span className="text-[7px] lg:text-[8px] text-stone-600 uppercase font-black tracking-widest opacity-60">LINK_CODE</span>
                        <span className="text-lg lg:text-2xl font-black text-orange-500 font-stencil tracking-[0.2em] lg:tracking-[0.3em]">{activeRoom}</span>
                      </div>
                   </div>
                </div>
              )}

              {tab === 'settings' && (
                <div className="space-y-8 lg:space-y-12 h-full animate-in slide-in-from-bottom-10 duration-500">
                   {/* AUDIO CONFIG */}
                   <div className="space-y-4 lg:space-y-6">
                      <div className="flex items-center gap-3 lg:gap-4 border-b border-stone-800/80 pb-2 lg:pb-3 px-1 lg:px-2">
                        <span className="text-xl lg:text-2xl">🔊</span>
                        <h3 className="text-[11px] lg:text-[13px] font-black text-white uppercase tracking-[0.3em] lg:tracking-[0.5em]">Acoustics</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4 lg:gap-6">
                        <button 
                          onClick={() => settings.setAudioEnabled(!settings.audioEnabled)}
                          className={`group p-4 lg:p-8 border-2 rounded-xl lg:rounded-2xl flex justify-between items-center transition-all ${settings.audioEnabled ? 'bg-orange-500/10 border-orange-500/40 shadow-xl' : 'bg-stone-950 border-stone-800'}`}
                        >
                           <div className="text-left">
                              <span className={`text-[12px] lg:text-[15px] font-black uppercase tracking-wider block mb-1 lg:mb-1.5 ${settings.audioEnabled ? 'text-white' : 'text-stone-600'}`}>Master_Audio</span>
                              <span className="text-[7px] lg:text-[9px] text-stone-600 uppercase font-bold tracking-widest opacity-70">Hardware environmental sync</span>
                           </div>
                           <div className={`w-12 lg:w-16 h-6 lg:h-8 rounded-full p-1 transition-all ${settings.audioEnabled ? 'bg-orange-600 shadow-[0_0_20px_rgba(249,115,22,0.4)]' : 'bg-stone-900'}`}>
                              <div className={`w-4 lg:w-5 h-4 lg:h-5 bg-white rounded-full shadow-lg transition-all transform ${settings.audioEnabled ? 'translate-x-6 lg:translate-x-8' : 'translate-x-0'}`}></div>
                           </div>
                        </button>
                        
                        <div className="bg-stone-900/40 border-2 border-stone-800 rounded-xl lg:rounded-2xl p-4 lg:p-6 space-y-3 lg:space-y-4 shadow-inner">
                           <div className="flex justify-between text-[8px] lg:text-[10px] font-black text-stone-600 uppercase tracking-widest px-1 lg:px-2">
                              <span>Signal_Intensity</span>
                              <span className="text-orange-500">STABLE_100%</span>
                           </div>
                           <div className="h-2 lg:h-2.5 bg-stone-950 rounded-full overflow-hidden border border-stone-800 p-0.5">
                              <div className="h-full bg-orange-500 w-[100%] rounded-full shadow-[0_0_15px_rgba(249,115,22,0.7)]"></div>
                           </div>
                        </div>
                      </div>
                   </div>

                   {/* DIFFICULTY SCALER */}
                   <div className="space-y-4 lg:space-y-6">
                      <div className="flex items-center gap-3 lg:gap-4 border-b border-stone-800/80 pb-2 lg:pb-3 px-1 lg:px-2">
                        <span className="text-xl lg:text-2xl">📈</span>
                        <h3 className="text-[11px] lg:text-[13px] font-black text-white uppercase tracking-[0.3em] lg:tracking-[0.5em]">Simulation_Load</h3>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 lg:gap-4">
                         {[
                           { val: 0.5, label: 'RECRUIT', desc: 'Baseline' },
                           { val: 1.0, label: 'VETERAN', desc: 'Standard' },
                           { val: 1.5, label: 'ELITE', desc: 'Overload' },
                           { val: 2.5, label: 'LETHAL', desc: 'Extreme' }
                         ].map(item => (
                           <button 
                             key={item.val}
                             onClick={() => settings.setDifficultyModifier(item.val)}
                             className={`p-3 lg:p-6 border-2 rounded-xl lg:rounded-2xl transition-all flex flex-col items-center gap-1 lg:gap-2 group ${settings.difficultyModifier === item.val ? 'bg-white border-white text-stone-950 scale-105 shadow-xl' : 'bg-black/60 border-stone-800 text-stone-600 hover:text-stone-300 hover:border-stone-600'}`}
                           >
                             <span className="text-[10px] lg:text-[12px] font-black tracking-tight">{item.label}</span>
                             <span className={`text-[7px] lg:text-[8px] uppercase font-black opacity-50 ${settings.difficultyModifier === item.val ? 'text-stone-700' : 'text-stone-800'}`}>{item.desc}</span>
                           </button>
                         ))}
                      </div>
                   </div>
                </div>
              )}
           </div>
        </div>

        {/* RIGHT UNIT SPEC PANEL */}
        <div className="lg:col-span-3 flex flex-col gap-4 lg:gap-8">
           <div className="tactical-panel flex-1 bg-stone-900/90 border border-stone-800 rounded-2xl lg:rounded-3xl p-4 lg:p-8 flex flex-col gap-4 lg:gap-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              
              <div className="grid grid-cols-3 gap-2 lg:gap-3">
                {(['STRIKER', 'GHOST', 'TITAN'] as CharacterClass[]).map(c => (
                  <button 
                    key={c} 
                    onClick={() => setCharacterClass(c)} 
                    className={`aspect-square rounded-lg lg:rounded-xl flex flex-col items-center justify-center transition-all border-2 ${characterClass === c ? 'bg-white border-white text-stone-950 scale-110 shadow-xl' : 'bg-stone-950 border-stone-800 text-stone-700 hover:text-stone-400 hover:border-stone-700'}`}
                  >
                    <span className="text-xl lg:text-3xl mb-1 lg:mb-1.5">{CLASS_META[c].icon}</span>
                    <span className="text-[7px] lg:text-[9px] font-black uppercase tracking-tighter">{c}</span>
                  </button>
                ))}
              </div>

              <div className="text-center space-y-2 lg:space-y-4 pt-2 lg:pt-6">
                 <h3 className="text-2xl lg:text-4xl font-black font-stencil tracking-[0.2em] lg:tracking-[0.3em] text-white uppercase italic drop-shadow-[0_4px_12px_rgba(249,115,22,0.4)]">{characterClass}</h3>
                 <p className="text-[9px] lg:text-[11px] text-stone-500 font-bold leading-relaxed italic px-2 lg:px-4">"{CLASS_META[characterClass].desc}"</p>
              </div>

              <div className="space-y-4 lg:space-y-8 pt-4 lg:pt-8 border-t border-stone-800/60">
                <div className="space-y-2 lg:space-y-2.5">
                   <div className="flex justify-between text-[8px] lg:text-[10px] font-black text-stone-600 uppercase tracking-widest px-1">
                     <span>Hull_Integrity</span>
                     <span className="text-stone-300 font-black">{CLASS_META[characterClass].hp}</span>
                   </div>
                   <div className="h-2 lg:h-2.5 bg-stone-950 rounded-full overflow-hidden border border-stone-800 p-0.5 shadow-inner">
                      <div className="h-full bg-orange-600 transition-all duration-1000 ease-out shadow-[0_0_12px_#f97316]" style={{ width: `${(CLASS_META[characterClass].hp / 200) * 100}%` }}></div>
                   </div>
                </div>
                <div className="space-y-2 lg:space-y-2.5">
                   <div className="flex justify-between text-[8px] lg:text-[10px] font-black text-stone-600 uppercase tracking-widest px-1">
                     <span>Kinetic_Speed</span>
                     <span className="text-stone-300 font-black">{CLASS_META[characterClass].speed}</span>
                   </div>
                   <div className="h-2 lg:h-2.5 bg-stone-950 rounded-full overflow-hidden border border-stone-800 p-0.5 shadow-inner">
                      <div className="h-full bg-cyan-500 transition-all duration-1000 ease-out shadow-[0_0_12px_#22d3ee]" style={{ width: `${(CLASS_META[characterClass].speed / 160) * 100}%` }}></div>
                   </div>
                </div>
              </div>

              <div className="mt-auto bg-stone-950/80 p-4 lg:p-6 rounded-xl lg:rounded-2xl border border-stone-800/60 text-center shadow-inner relative overflow-hidden">
                <div className="text-[8px] lg:text-[9px] font-black text-stone-700 uppercase tracking-[0.3em] lg:tracking-[0.4em] mb-1 relative">Unit_Status</div>
                <div className="text-[9px] lg:text-[11px] font-black text-green-500 uppercase tracking-widest animate-pulse relative">READY_FOR_DEPLOYMENT</div>
              </div>
           </div>

           <button 
              disabled={tab === 'multiplayer' && (!activeRoom || !isHost)}
              onClick={deploy}
              className="py-6 lg:py-16 bg-white disabled:bg-stone-900 disabled:text-stone-800 disabled:border-stone-800 text-stone-950 font-stencil text-4xl lg:text-6xl tracking-[0.2em] transition-all rounded-2xl lg:rounded-[2.5rem] border-b-[8px] lg:border-b-[14px] border-stone-300 active:translate-y-2 active:border-b-[2px] shadow-2xl hover:bg-orange-600 hover:text-white hover:border-orange-800 hover:-translate-y-1"
           >
             DEPLOY
           </button>
        </div>
      </div>
    </div>
  );
};

export default Lobby;