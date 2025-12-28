
import React, { useState, useEffect } from 'react';
import Lobby from './components/Lobby';
import GameContainer from './components/GameContainer';
import CreativeSuite from './components/CreativeSuite';
import VibeAssistant from './components/VibeAssistant';

export type AppState = 'boot' | 'lobby' | 'playing' | 'labs';
export type GameMode = 'bot' | 'multiplayer' | 'mission';
export type CharacterClass = 'STRIKER' | 'GHOST' | 'TITAN';
export type MPMatchMode = 'TDM' | 'FFA' | 'HARDPOINT' | '1V1';
export type MPMap = 'URBAN_RUINS' | 'THE_PIT' | 'OUTPOST_X';

export interface MPConfig {
  mode: MPMatchMode;
  map: MPMap;
  alphaBots: number;
  bravoBots: number;
  scoreLimit: number;
  mapSeed: string;
}

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
  const [glitch, setGlitch] = useState(false);

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
        if (Math.random() > 0.8) {
          setGlitch(true);
          setTimeout(() => setGlitch(false), 50);
        }
      } else {
        clearInterval(interval);
        setTimeout(onComplete, 1200);
      }
    }, 120);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex-1 flex flex-col items-center justify-center bg-[#050505] p-3 sm:p-6 lg:p-10 font-mono relative overflow-hidden transition-all duration-75 ${glitch ? 'invert scale-[1.01] brightness-150' : ''}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(249,115,22,0.1)_0%,transparent_70%)] animate-pulse"></div>
      <div className="w-full max-w-2xl space-y-3 sm:space-y-6 lg:space-y-10 relative z-10">
        <div className="flex items-center gap-3 sm:gap-5 lg:gap-8 mb-4 sm:mb-8 lg:mb-16 animate-in fade-in slide-in-from-top-10 duration-700">
          <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-orange-600 rounded-lg flex items-center justify-center animate-bounce shadow-[0_0_50px_rgba(249,115,22,0.6)] border-2 border-white/20">
            <span className="text-2xl sm:text-3xl lg:text-4xl">🎖️</span>
          </div>
          <div>
            <div className="text-orange-500 text-xs sm:text-base lg:text-lg font-black tracking-[0.3em] sm:tracking-[0.5em] lg:tracking-[0.8em] uppercase mb-1 drop-shadow-lg">LUCKY_MILITIA</div>
            <div className="text-stone-500 text-[8px] sm:text-[9px] lg:text-[10px] font-bold tracking-[0.2em] sm:tracking-[0.3em] lg:tracking-[0.4em] uppercase opacity-70">Neural_Bridge_Terminal_v2.0</div>
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3 lg:space-y-4 bg-black/60 p-3 sm:p-6 lg:p-10 border border-stone-800 rounded-xl lg:rounded-2xl min-h-[140px] sm:min-h-[220px] lg:min-h-[340px] flex flex-col justify-end backdrop-blur-xl shadow-2xl relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"></div>
          {logs.map((log, i) => (
            <div key={i} className="text-stone-300 text-[9px] sm:text-[10px] lg:text-[11px] font-bold tracking-wider lg:tracking-widest border-l-2 border-orange-600 pl-2 sm:pl-3 lg:pl-5 animate-in slide-in-from-left-4 duration-200">
              <span className="text-orange-500/40 mr-2 sm:mr-3 lg:mr-4 font-black">[{new Date().toLocaleTimeString('en-GB')}]</span>
              {log}
            </div>
          ))}
          {logs.length < bootLogs.length && (
            <div className="w-2 h-3 sm:h-4 bg-orange-500 animate-pulse ml-1 shadow-[0_0_10px_#f97316]"></div>
          )}
        </div>

        <div className="pt-3 sm:pt-6 lg:pt-10">
          <div className="flex justify-between text-[8px] sm:text-[9px] lg:text-[10px] font-black text-stone-600 uppercase tracking-wider lg:tracking-widest mb-2 lg:mb-3">
            <span>Core_Stability</span>
            <span>{Math.floor((logs.length / bootLogs.length) * 100)}%</span>
          </div>
          <div className="w-full h-1 sm:h-1.5 bg-stone-900 overflow-hidden rounded-full border border-stone-800 p-px">
            <div className="h-full bg-orange-600 transition-all duration-300 shadow-[0_0_15px_rgba(249,115,22,0.5)]" style={{ width: `${(logs.length / bootLogs.length) * 100}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

import { OnchainKitProvider } from '@coinbase/onchainkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { base } from 'wagmi/chains';
import { config } from './wagmi-config';
import WalletConnect from './components/WalletConnect';

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={import.meta.env.VITE_ONCHAINKIT_API_KEY}
          chain={base}
        >
          <AppContent />
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

const AppContent: React.FC = () => {
  const [view, setView] = useState<AppState>('boot');

  const [playerName, setPlayerName] = useState('OPERATOR_' + Math.floor(Math.random() * 9999));
  const [characterClass, setCharacterClass] = useState<CharacterClass>('STRIKER');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>('mission');
  const [unlockedLevel, setUnlockedLevel] = useState(1);
  const [activeLevelId, setActiveLevelId] = useState(1);
  const [squad, setSquad] = useState<{ name: string, team: 'alpha' | 'bravo' }[]>([]);
  const [mpConfig, setMpConfig] = useState<MPConfig | null>(null);

  // Settings State
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [difficultyModifier, setDifficultyModifier] = useState(1);
  const [virtualControlsEnabled, setVirtualControlsEnabled] = useState(false);

  const startCombat = (room: string | null, host: boolean, mode: GameMode, levelId?: number, squadMembers?: { name: string, team: 'alpha' | 'bravo' }[], mpSettings?: MPConfig) => {
    setRoomId(room);
    setIsHost(host);
    setGameMode(mode);
    if (squadMembers) setSquad(squadMembers);
    if (levelId) setActiveLevelId(levelId || 1);
    if (mpSettings) setMpConfig(mpSettings);
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
    <div className={`min-h-screen bg-[#050505] text-stone-100 font-mono selection:bg-orange-500/30 overflow-hidden flex flex-col relative`}>
      <VibeAssistant />
      <WalletConnect />

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
            settings={{
              audioEnabled,
              setAudioEnabled,
              difficultyModifier,
              setDifficultyModifier,
              virtualControlsEnabled,
              setVirtualControlsEnabled
            }}
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
            mission={gameMode === 'mission' ? MISSIONS.find(m => m.id === activeLevelId) : undefined}
            mpConfig={mpConfig || undefined}
            squad={squad}
            audioEnabled={audioEnabled}
            difficultyModifier={difficultyModifier}
            virtualControlsEnabled={virtualControlsEnabled}
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
