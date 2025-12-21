import React, { useEffect, useRef, useState, useCallback } from 'react';
import Phaser from 'phaser';
import { createGame } from '../game/main';
import { GameMode, CharacterClass, MissionConfig, MPConfig } from '../App';
import { WEAPONS_CONFIG } from '../game/scenes/MainScene';

interface Props {
  playerName: string;
  characterClass: CharacterClass;
  avatar: string | null;
  roomId: string | null;
  isHost: boolean;
  gameMode: GameMode;
  mission?: MissionConfig;
  mpConfig?: MPConfig;
  squad: {name: string, team: 'alpha' | 'bravo'}[];
  audioEnabled: boolean;
  difficultyModifier: number;
  onExit: () => void;
  onMissionComplete: () => void;
  onNextLevel: () => void;
}

const WEAPON_LIST = Object.values(WEAPONS_CONFIG);

const HUDBar: React.FC<{ value: number, max: number, color: string, label: string, glowColor: string }> = ({ value, max, color, label, glowColor }) => {
  const percent = Math.max(0, Math.min(1, value / max));
  return (
    <div className="space-y-1 w-full">
      <div className="flex justify-between text-[6px] lg:text-[8px] font-black uppercase tracking-[0.2em] lg:tracking-[0.4em] text-white/50 px-1">
        <span>{label}</span>
        <span className="opacity-80">{Math.round(percent * 100)}%</span>
      </div>
      <div className="h-2 lg:h-3 bg-black/90 border border-white/10 p-[1px] relative rounded-sm overflow-hidden shadow-inner">
         <div 
            className={`h-full transition-all duration-300 ${color} rounded-sm`} 
            style={{ 
                width: `${percent * 100}%`,
                boxShadow: percent > 0 ? `0 0 10px ${glowColor}` : 'none'
            }} 
         />
      </div>
    </div>
  );
};

const FloatingStick: React.FC<{
  side: 'left' | 'right';
  onMove: (x: number, y: number) => void;
  onEnd: () => void;
}> = ({ side, onMove, onEnd }) => {
  const [active, setActive] = useState(false);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const pointerId = useRef<number | null>(null);
  const radius = window.innerWidth < 640 ? 48 : 64;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (pointerId.current !== null) return;
    pointerId.current = e.pointerId;
    setOrigin({ x: e.clientX, y: e.clientY });
    setKnob({ x: 0, y: 0 });
    setActive(true);
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (e.pointerId !== pointerId.current) return;
    let dx = e.clientX - origin.x;
    let dy = e.clientY - origin.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > radius) {
      const angle = Math.atan2(dy, dx);
      dx = Math.cos(angle) * radius;
      dy = Math.sin(angle) * radius;
    }
    setKnob({ x: dx, y: dy });
    onMove(dx / radius, dy / radius);
  }, [origin, onMove, radius]);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    if (e.pointerId !== pointerId.current) return;
    pointerId.current = null;
    setActive(false);
    onEnd(); 
  }, [onEnd]);

  useEffect(() => {
    if (active) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [active, handlePointerMove, handlePointerUp]);

  return (
    <div onPointerDown={handlePointerDown} className={`absolute top-0 bottom-0 w-1/2 touch-none pointer-events-auto z-[1000] ${side === 'left' ? 'left-0' : 'right-0'}`}>
      {active && (
        <div className="fixed pointer-events-none z-[1001]" style={{ left: origin.x - (radius + 6), top: origin.y - (radius + 6) }}>
          <div className="rounded-full border-2 border-white/20 bg-black/60 backdrop-blur-md flex items-center justify-center shadow-2xl" style={{ width: (radius * 2 + 12), height: (radius * 2 + 12) }}>
            <div className="bg-white/30 rounded-full border border-white/20 shadow-lg" style={{ width: radius * 0.8, height: radius * 0.8, transform: `translate(${knob.x}px, ${knob.y}px)` }}></div>
          </div>
        </div>
      )}
    </div>
  );
};

const GameContainer: React.FC<Props> = ({ playerName, characterClass, avatar, roomId, isHost, gameMode, mission, mpConfig, squad, audioEnabled, difficultyModifier, onExit, onMissionComplete, onNextLevel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [stats, setStats] = useState({ 
    hp: 100, maxHp: 100, shield: 100, ammo: 0, maxAmmo: 0, weaponKey: 'pistol', weaponName: 'SIDEARM', isInfinite: true, abilityCooldown: 0, kills: 0, points: 0, teamScores: { alpha: 0, bravo: 0 }, mode: 'MISSION'
  });

  const updateVirtualInput = useCallback((data: any) => {
    const scene = gameRef.current?.scene.getScene('MainScene') as any;
    if (scene?.virtualInput) Object.assign(scene.virtualInput, data);
  }, []);

  useEffect(() => {
    if (containerRef.current && !gameRef.current) {
      gameRef.current = createGame(containerRef.current, playerName, avatar, roomId, isHost, gameMode, characterClass, mission, mpConfig, squad);
      const scene = gameRef.current.scene.getScene('MainScene') as any;
      if (scene) {
        scene.audioEnabled = audioEnabled;
        scene.difficultyModifier = difficultyModifier;
      }
    }
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [playerName, characterClass, avatar, roomId, isHost, gameMode, mission, mpConfig]);

  useEffect(() => {
    const interval = setInterval(() => {
      if ((window as any).gameStats) {
        setStats({ ...(window as any).gameStats });
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden font-mono text-stone-100 touch-none flex flex-col">
      <div ref={containerRef} className="flex-1 relative" />
      
      {/* TACTICAL HUD OVERLAY */}
      <div className="absolute inset-0 pointer-events-none p-4 lg:p-12 flex flex-col justify-between z-[2000]">
        
        {/* Top Section - Operator Stats & Team Score */}
        <div className="flex justify-between items-start animate-in fade-in slide-in-from-top-10 duration-700">
          <div className="tactical-panel bg-black/70 p-3 lg:p-6 border-l-4 border-orange-500 rounded-r-xl lg:rounded-r-2xl min-w-[180px] lg:min-w-[320px] backdrop-blur-xl shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-start mb-2 lg:mb-4">
              <div>
                <span className="text-[7px] lg:text-[10px] font-black uppercase text-orange-500/60 tracking-[0.2em] lg:tracking-[0.4em]">{stats.mode}</span>
                <div className="text-sm lg:text-2xl font-black font-stencil text-white leading-tight mt-0.5">{playerName}</div>
              </div>
              <div className="text-right hidden sm:block">
                <div className="text-[7px] lg:text-[9px] font-black text-white/40 uppercase tracking-widest mb-0.5 lg:mb-1">Tactical_Score</div>
                <div className="text-sm lg:text-3xl font-stencil text-white drop-shadow-lg">{stats.points.toLocaleString()}</div>
              </div>
            </div>
            
            <div className="hidden lg:grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/5 p-3 rounded-xl border border-white/5 shadow-inner">
                <div className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Kills</div>
                <div className="text-2xl font-stencil text-white">{stats.kills}</div>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/5 shadow-inner">
                <div className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Class</div>
                <div className="text-[14px] font-black text-orange-500 uppercase tracking-tighter">{characterClass}</div>
              </div>
            </div>

            <div className="space-y-2 lg:space-y-5">
              <HUDBar label="HULL" value={stats.hp} max={stats.maxHp} color="bg-orange-500" glowColor="rgba(249,115,22,0.6)" />
              <HUDBar label="SHIELD" value={stats.shield} max={100} color="bg-cyan-400" glowColor="rgba(34,211,238,0.6)" />
            </div>
          </div>

          <div className="flex gap-2 lg:gap-6">
            <div className="tactical-panel bg-black/80 px-4 lg:px-10 py-2 lg:py-5 border-b-2 lg:border-b-4 border-orange-500 rounded-lg lg:rounded-2xl flex flex-col items-center shadow-2xl backdrop-blur-md">
              <span className="text-[7px] lg:text-[11px] font-black text-orange-500/80 mb-0.5 lg:mb-1 tracking-[0.1em] lg:tracking-[0.3em] uppercase">ALPHA</span>
              <span className="text-2xl lg:text-5xl font-stencil text-white drop-shadow-lg">{stats.teamScores.alpha}</span>
            </div>
            <div className="tactical-panel bg-black/80 px-4 lg:px-10 py-2 lg:py-5 border-b-2 lg:border-b-4 border-cyan-500 rounded-lg lg:rounded-2xl flex flex-col items-center shadow-2xl backdrop-blur-md">
              <span className="text-[7px] lg:text-[11px] font-black text-cyan-500/80 mb-0.5 lg:mb-1 tracking-[0.1em] lg:tracking-[0.3em] uppercase">BRAVO</span>
              <span className="text-2xl lg:text-5xl font-stencil text-white drop-shadow-lg">{stats.teamScores.bravo}</span>
            </div>
          </div>
        </div>

        {/* Bottom Section - Weapon & Controls */}
        <div className="flex justify-between items-end animate-in fade-in slide-in-from-bottom-10 duration-700">
          <div className="flex flex-col gap-3 lg:gap-6 items-start pointer-events-auto">
             <button 
               onPointerDown={() => updateVirtualInput({isAbility:true})} 
               onPointerUp={() => updateVirtualInput({isAbility:false})} 
               className={`w-14 h-14 lg:w-24 lg:h-24 rounded-2xl lg:rounded-3xl border-2 font-black flex flex-col items-center justify-center transition-all ${stats.abilityCooldown > 0 ? 'bg-stone-900/80 border-stone-800 text-stone-700' : 'bg-orange-600 border-orange-400 text-white active:scale-90 hover:bg-orange-500'}`}
             >
               <span className="text-[7px] lg:text-[10px] uppercase tracking-widest font-black mb-0.5 lg:mb-1">Boost</span>
               <span className="text-xs lg:text-2xl font-stencil">{stats.abilityCooldown > 0 ? 'WAIT' : 'READY'}</span>
             </button>
             <div className="flex gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5 backdrop-blur-sm shadow-xl overflow-x-auto max-w-[40vw] sm:max-w-none">
                {WEAPON_LIST.map(w => (
                  <button 
                    key={w.key} 
                    onClick={() => window.dispatchEvent(new CustomEvent('weapon_swap', {detail: {key: w.key}}))} 
                    className={`w-10 h-10 lg:w-14 lg:h-14 rounded-lg lg:rounded-xl border-2 flex-shrink-0 flex items-center justify-center text-lg lg:text-2xl transition-all ${stats.weaponKey === w.key ? 'bg-white text-black border-white shadow-[0_0_10px_white]' : 'bg-black/60 border-stone-800 text-stone-600 hover:text-stone-300'}`}
                  >
                    {w.icon}
                  </button>
                ))}
             </div>
          </div>

          <div className="flex flex-col items-end gap-3 lg:gap-8">
            <div className="tactical-panel bg-black/80 p-3 lg:p-8 rounded-l-2xl lg:rounded-l-3xl border-r-4 lg:border-r-[12px] border-white text-right min-w-[120px] lg:min-w-[220px] shadow-2xl backdrop-blur-xl">
              <span className="text-[7px] lg:text-[11px] font-black text-stone-500 mb-1 lg:mb-2 block uppercase tracking-[0.2em] lg:tracking-[0.4em] opacity-80">{stats.weaponName}</span>
              <div className="flex items-baseline justify-end gap-1.5 lg:gap-3">
                <span className="text-2xl lg:text-6xl font-stencil text-white tracking-tighter drop-shadow-lg">{stats.isInfinite ? 'INF' : stats.ammo}</span>
                {!stats.isInfinite && <span className="text-[8px] lg:text-sm font-black text-stone-600 tracking-widest uppercase">/ {stats.maxAmmo}</span>}
              </div>
            </div>
            <button onClick={onExit} className="bg-red-600 hover:bg-red-500 text-white px-6 lg:px-12 py-3 lg:py-5 text-[8px] lg:text-[12px] font-black tracking-[0.3em] lg:tracking-[0.6em] pointer-events-auto transition-all uppercase rounded-md lg:rounded-lg border-b-2 lg:border-b-[6px] border-red-900 active:translate-y-1 active:border-b-0 shadow-2xl">Abort</button>
          </div>
        </div>
      </div>

      <FloatingStick side="left" onMove={(x, y) => updateVirtualInput({ moveX: x, moveY: y })} onEnd={() => updateVirtualInput({ moveX: 0, moveY: 0 })} />
      <FloatingStick side="right" onMove={(x, y) => updateVirtualInput({ aimAngle: Math.atan2(y, x), isFiring: true })} onEnd={() => updateVirtualInput({ isFiring: false })} />
    </div>
  );
};

export default GameContainer;