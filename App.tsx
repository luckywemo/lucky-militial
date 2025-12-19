
import React, { useState, useEffect } from 'react';
import Lobby from './components/Lobby';
import GameContainer from './components/GameContainer';
import CreativeSuite from './components/CreativeSuite';
import VibeAssistant from './components/VibeAssistant';

export type AppState = 'boot' | 'lobby' | 'playing' | 'labs';
export type GameMode = 'bot' | 'multiplayer' | 'mission';
export type CharacterClass = 'STRIKER' | 'GHOST' | 'TITAN';

export interface MissionConfig {
  id: number;
  name: string;
  objective: string;
  targetKills: number;
  difficulty: number;
  coords: { x: number; y: number };
}

const MISSIONS: MissionConfig[] = [
  { id: 1, name: "ALPHA_PROTOCOL", objective: "Clear local sector of rogue drones.", targetKills: 5, difficulty: 1, coords: { x: 20, y: 30 } },
  { id: 2, name: "NEON_SCARE", objective: "Eliminate reinforced security units.", targetKills: 10, difficulty: 2, coords: { x: 45, y: 60 } },
  { id: 3, name: "VOID_STRIKE", objective: "Tactical wipe of high-threat squads.", targetKills: 20, difficulty: 3, coords: { x: 75, y: 40 } },
  { id: 4, name: "OMNI_CORE", objective: "Full system purge. Zero survivors.", targetKills: 35, difficulty: 5, coords: { x: 90, y: 85 } },
];

const BootSequence: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const bootLogs = [
    "> INITIALIZING NEURAL_LINK_V5...",
    "> SYNCING TACTICAL SATELLITE BROADCAST...",
    "> LOADING ASSET_HUMAN_MODELS_01...",
    "> CALIBRATING HUD_VISOR_OVERLAY...",
    "> MOUNTING KINETIC_ENGINE_v4...",
    "> VERIFYING ENCRYPTION_KEYS...",
    "> UPLINK SUCCESSFUL. WELCOME OPERATOR."
  ];

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      if (current < bootLogs.length) {
        setLogs(prev => [...prev, bootLogs[current]]);
        current++;
      } else {
        clearInterval(interval);
        setTimeout(onComplete, 800);
      }
    }, 300);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#050505] p-10 font-mono relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(249,115,22,0.08)_0%,transparent_70%)] animate-pulse"></div>
      <div className="w-full max-w-2xl space-y-6 relative z-10">
        <div className="flex items-center gap-6 mb-16">
          <div className="w-16 h-16 bg-orange-600 rounded-lg flex items-center justify-center animate-bounce shadow-[0_0_40px_rgba(249,115,22,0.5)]">
            <span className="text-3xl">🎖️</span>
          </div>
          <div>
            <div className="text-orange-500 text-sm font-black tracking-[0.6em] uppercase">SYSTEM_BOOT_TERMINAL</div>
            <div className="text-stone-500 text-[10px] font-bold tracking-widest uppercase">Lucky Militia Neural Bridge</div>
          </div>
        </div>
        
        <div className="space-y-3 bg-black/40 p-8 border border-stone-800 rounded-xl min-h-[300px] flex flex-col justify-end">
          {logs.map((log, i) => (
            <div key={i} className="text-stone-300 text-xs font-bold tracking-widest border-l-2 border-orange-600 pl-4 animate-in slide-in-from-left-4 duration-300">
              <span className="text-orange-500/50 mr-3">[{new Date().toLocaleTimeString('en-GB')}]</span>
              {log}
            </div>
          ))}
          {logs.length < bootLogs.length && (
            <div className="w-2 h-4 bg-orange-500 animate-pulse ml-1"></div>
          )}
        </div>

        <div className="pt-8">
          <div className="w-full h-1 bg-stone-900 overflow-hidden rounded-full">
            <div className="h-full bg-orange-600 transition-all duration-300" style={{ width: `${(logs.length / bootLogs.length) * 100}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [view, setView] = useState<AppState>('boot');
  const [playerName, setPlayerName] = useState('OPERATOR_' + Math.floor(Math.random() * 9999));
  const [characterClass, setCharacterClass] = useState<CharacterClass>('STRIKER');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>('mission');
  const [unlockedLevel, setUnlockedLevel] = useState(1);
  const [activeLevelId, setActiveLevelId] = useState(1);

  const startCombat = (room: string | null, host: boolean, mode: GameMode, levelId?: number) => {
    setRoomId(room);
    setIsHost(host);
    setGameMode(mode);
    if (levelId) setActiveLevelId(levelId);
    setView('playing');
  };

  const onMissionComplete = () => {
    if (activeLevelId === unlockedLevel) {
      setUnlockedLevel(prev => Math.min(prev + 1, MISSIONS.length));
    }
  };

  const nextLevel = () => {
    const nextId = activeLevelId + 1;
    if (nextId <= MISSIONS.length) {
      setActiveLevelId(nextId);
      setView('lobby');
      setTimeout(() => setView('playing'), 50);
    } else {
      setView('lobby');
    }
  };

  return (
    <div className={`min-h-screen bg-[#050505] text-stone-100 font-sans selection:bg-orange-500/30 overflow-hidden flex flex-col relative`}>
      <VibeAssistant />

      <main className="relative flex-1 flex flex-col">
        {view === 'boot' && <BootSequence onComplete={() => setView('lobby')} />}
        
        {view === 'lobby' && (
          <Lobby 
            playerName={playerName} 
            setPlayerName={setPlayerName} 
            characterClass={characterClass}
            setCharacterClass={setCharacterClass}
            avatar={avatar}
            unlockedLevel={unlockedLevel}
            missions={MISSIONS}
            onStart={startCombat} 
            onLabs={() => setView('labs')} 
          />
        )}

        {view === 'playing' && (
          <GameContainer 
            playerName={playerName} 
            characterClass={characterClass}
            avatar={avatar}
            roomId={roomId}
            isHost={isHost}
            gameMode={gameMode}
            mission={MISSIONS.find(m => m.id === activeLevelId)}
            onExit={() => setView('lobby')} 
            onMissionComplete={onMissionComplete}
            onNextLevel={nextLevel}
          />
        )}

        {view === 'labs' && (
          <CreativeSuite 
            onBack={() => setView('lobby')} 
            setAvatar={setAvatar} 
          />
        )}
      </main>
    </div>
  );
};

export default App;
