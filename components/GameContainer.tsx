
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Phaser from 'phaser';
import { createGame } from '../game/main';
import { GameMode, CharacterClass, MissionConfig } from '../App';

interface Props {
  playerName: string;
  characterClass: CharacterClass;
  avatar: string | null;
  roomId: string | null;
  isHost: boolean;
  gameMode: GameMode;
  mission?: MissionConfig;
  onExit: () => void;
  onMissionComplete: () => void;
  onNextLevel: () => void;
}

const WEAPONS = [
  { key: 'pistol', icon: '🔫', name: 'P-20' },
  { key: 'smg', icon: '⚔️', name: 'R-99' },
  { key: 'shotgun', icon: '🔥', name: 'B-10' },
  { key: 'launcher', icon: '🚀', name: 'M-55' },
  { key: 'railgun', icon: '⚡', name: 'VOLT' },
  { key: 'plasma', icon: '🔮', name: 'X-1' },
  { key: 'stinger', icon: '🎯', name: 'M-90' },
  { key: 'neutron', icon: '💠', name: 'X-ION' }
];

const HUDBar: React.FC<{ value: number, max: number, color: string, label: string }> = ({ value, max, color, label }) => {
  const percent = Math.max(0, Math.min(1, value / max));
  return (
    <div className="space-y-0.5 w-full">
      <div className="flex justify-between text-[7px] font-black uppercase tracking-widest text-white/40">
        <span>{label}</span>
        <span>{Math.round(percent * 100)}</span>
      </div>
      <div className="h-2 bg-black/40 border border-white/10 p-[0.5px] relative">
         <div className={`h-full transition-all duration-300 ${color}`} style={{ width: `${percent * 100}%`, boxShadow: `0 0 10px ${color.includes('orange') ? '#f97316' : '#22d3ee'}33` }}></div>
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
  const radius = 50;

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
    <div onPointerDown={handlePointerDown} className={`absolute top-0 bottom-0 w-1/2 touch-none pointer-events-auto flex items-center justify-center z-[1000] ${side === 'left' ? 'left-0' : 'right-0'}`}>
      {active && (
        <div className="fixed pointer-events-none z-[1001] animate-in zoom-in-75 duration-200" style={{ left: origin.x - 60, top: origin.y - 60 }}>
          <div className="relative w-[120px] h-[120px] rounded-full border border-orange-500/20 bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <div className="w-10 h-10 bg-white/5 border border-white/20 rounded-full flex items-center justify-center shadow-2xl" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}>
               <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const GameContainer: React.FC<Props> = ({ playerName, characterClass, avatar, roomId, isHost, gameMode, mission, onExit, onMissionComplete, onNextLevel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [stats, setStats] = useState({ 
    hp: 100, maxHp: 100, shield: 100, ammo: 0, maxAmmo: 0, weaponKey: 'pistol', weaponName: 'SIDEARM', isInfinite: true, abilityCooldown: 0, kills: 0, deaths: 0 
  });
  const [coords, setCoords] = useState({ x: 1000, y: 1000 });
  const [radar, setRadar] = useState<any>({ enemies: [], pickups: [] });
  const [isVictory, setIsVictory] = useState(false);

  const updateVirtualInput = useCallback((data: any) => {
    const scene = gameRef.current?.scene.getScene('MainScene') as any;
    if (scene?.virtualInput) Object.assign(scene.virtualInput, data);
  }, []);

  useEffect(() => {
    if (containerRef.current && !gameRef.current) {
      gameRef.current = createGame(containerRef.current, playerName, avatar, roomId, isHost, gameMode, characterClass, mission);
    }
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [playerName, characterClass, avatar, roomId, isHost, gameMode, mission]);

  useEffect(() => {
    const interval = setInterval(() => {
      if ((window as any).gameStats) {
        const currentStats = (window as any).gameStats;
        setStats({ ...currentStats });
        if (mission && currentStats.kills >= mission.targetKills && !isVictory) {
          setIsVictory(true);
          onMissionComplete();
        }
      }
      if ((window as any).radarData) setRadar({ ...(window as any).radarData });
      const scene = gameRef.current?.scene.getScene('MainScene') as any;
      if (scene?.player) setCoords({ x: Math.round(scene.player.x), y: Math.round(scene.player.y) });
    }, 100);
    return () => clearInterval(interval);
  }, [mission, isVictory, onMissionComplete]);

  const isLowHP = stats.hp / stats.maxHp < 0.3;

  return (
    <div className={`relative w-full h-full bg-black overflow-hidden font-mono text-stone-100 touch-none flex flex-col transition-all duration-500 ${isLowHP ? 'animate-[lowhp-flash_2s_infinite]' : ''}`}>
      <div ref={containerRef} className="flex-1 relative bg-stone-950" />
      
      {/* HUD Overlay - Reduced Padding */}
      <div className="absolute inset-0 pointer-events-none p-4 md:p-6 flex flex-col justify-between z-[2000]">
        
        {/* TOP: VISOR VITALS - Miniaturized */}
        <div className="flex justify-between items-start animate-in slide-in-from-top-6 duration-700">
          <div className="space-y-3 w-full max-w-[240px]">
            <div className="tactical-panel visor-curve-left p-4 bg-black/60 border-l-2 border-orange-500 pointer-events-auto backdrop-blur-md">
               <div className="flex justify-between items-center mb-3">
                  <div className="text-[10px] font-black uppercase text-orange-500 tracking-[0.3em]">{playerName}</div>
                  <div className={`text-[7px] font-bold uppercase transition-colors px-1 py-0.5 border border-white/10 ${isLowHP ? 'text-red-500 animate-pulse' : 'text-stone-600'}`}>
                    {isLowHP ? 'CRITICAL' : 'STABLE'}
                  </div>
               </div>
               <div className="space-y-3">
                  <HUDBar label="INTEGRITY" value={stats.hp} max={stats.maxHp} color="bg-white" />
                  <HUDBar label="SHIELD" value={stats.shield} max={100} color="bg-cyan-500" />
               </div>
            </div>

            {mission && (
              <div className="tactical-panel visor-curve-left p-3 bg-black/60 border-l-2 border-white/10 pointer-events-auto backdrop-blur-md">
                <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-stone-500 mb-2">
                  <span>OBJ: {mission.name}</span>
                  <span className="text-orange-500">{stats.kills}/{mission.targetKills}</span>
                </div>
                <div className="h-1 bg-stone-900 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-600 transition-all duration-500" style={{ width: `${(stats.kills / mission.targetKills) * 100}%` }}></div>
                </div>
              </div>
            )}
          </div>

          {/* Radar - Shrunk */}
          <div className="tactical-panel visor-curve-right p-2 bg-black/60 rounded-full border border-stone-800 pointer-events-auto shadow-xl backdrop-blur-md">
             <div className="w-32 h-32 relative overflow-hidden rounded-full border border-stone-900">
                <div className="absolute inset-0 animate-[spin_4s_linear_infinite] pointer-events-none opacity-30">
                  <div className="w-1/2 h-full bg-gradient-to-r from-orange-500/20 to-transparent"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-5">
                   <div className="w-px h-full bg-orange-500"></div>
                   <div className="h-px w-full bg-orange-500"></div>
                </div>
                {radar.enemies?.map((e: any, i: number) => {
                   const dx = (e.x - coords.x) / 15;
                   const dy = (e.y - coords.y) / 15;
                   if (Math.sqrt(dx*dx + dy*dy) > 60) return null;
                   return (
                     <div 
                        key={i} 
                        className="absolute w-1.5 h-1.5 bg-red-500 shadow-[0_0_5px_red] rounded-full" 
                        style={{ left: `calc(50% + ${dx}px)`, top: `calc(50% + ${dy}px)`, transform: 'translate(-50%, -50%)' }} 
                     />
                   );
                })}
             </div>
          </div>
        </div>

        {/* BOTTOM: COMBAT DECK - Compressed */}
        <div className="flex justify-between items-end animate-in slide-in-from-bottom-6 duration-700">
          <div className="flex flex-col gap-4 items-start">
             <button 
                onPointerDown={(e) => { e.stopPropagation(); updateVirtualInput({ isAbility: true }); }}
                onPointerUp={(e) => { e.stopPropagation(); updateVirtualInput({ isAbility: false }); }}
                className={`w-20 h-20 rounded-none flex flex-col items-center justify-center pointer-events-auto transition-all duration-300 stencil-cutout border ${stats.abilityCooldown > 0 ? 'bg-stone-900 border-stone-800 text-stone-700' : 'bg-orange-600 border-orange-400 text-white shadow-lg active:scale-95'}`}
             >
                <div className="text-[8px] font-black uppercase tracking-widest mb-0.5">BOOST</div>
                <div className="text-[11px] font-black">{stats.abilityCooldown > 0 ? Math.ceil(stats.abilityCooldown/1000) : 'READY'}</div>
             </button>

             <div className="bg-black/60 p-2 rounded-xl border border-stone-800 pointer-events-auto flex flex-col gap-1.5 backdrop-blur-md max-h-[220px] overflow-y-auto custom-scrollbar">
                {WEAPONS.map(w => (
                   <button 
                      key={w.key}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('weapon_swap', { detail: { key: w.key } })); }}
                      className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-all ${stats.weaponKey === w.key ? 'bg-white border-white text-stone-950 scale-105 shadow-md' : 'bg-stone-900 border-stone-800 text-stone-600 hover:text-stone-300'}`}
                   >
                      <span className="text-lg">{w.icon}</span>
                   </button>
                ))}
             </div>
          </div>

          <div className="flex flex-col items-end gap-4">
             <div className="tactical-panel visor-curve-right p-5 bg-black/60 border-r-2 border-white pointer-events-auto text-right w-56 shadow-xl backdrop-blur-md group">
                <div className="text-[8px] font-black uppercase text-stone-500 mb-1 tracking-[0.3em]">{stats.weaponName}</div>
                <div className="text-4xl font-black italic tracking-tighter mb-2 font-stencil">
                   {stats.isInfinite ? '∞' : `${stats.ammo}/${stats.maxAmmo}`}
                </div>
                <div className="h-1 w-full bg-stone-900/50 rounded-none overflow-hidden">
                   <div className="h-full bg-white" style={{ width: `${(stats.ammo / (stats.maxAmmo || 1)) * 100}%` }}></div>
                </div>
             </div>

             <button 
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onExit(); }}
                className="bg-red-600/80 hover:bg-red-600 text-white px-8 py-4 text-[10px] font-black uppercase tracking-[0.4em] pointer-events-auto stencil-cutout transition-all"
              >
                ABORT_OP
             </button>
          </div>
        </div>
      </div>

      {isVictory && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-500">
           <div className="text-center space-y-10 w-full max-w-xl px-8">
              <div className="space-y-4">
                <h2 className="text-6xl font-black italic tracking-tighter font-stencil text-orange-500 uppercase">Sector_Secure</h2>
                <p className="text-stone-500 font-bold uppercase tracking-[0.4em] text-[10px]">Extraction_Signal_Locked</p>
              </div>
              
              <div className="flex gap-4">
                <button onClick={onExit} className="flex-1 py-6 bg-stone-800 text-white font-black uppercase tracking-widest stencil-cutout">Base</button>
                <button onClick={onNextLevel} className="flex-1 py-6 bg-white text-stone-950 font-black uppercase tracking-widest stencil-cutout">Next</button>
              </div>
           </div>
        </div>
      )}

      <FloatingStick side="left" onMove={(x, y) => updateVirtualInput({ moveX: x, moveY: y })} onEnd={() => updateVirtualInput({ moveX: 0, moveY: 0 })} />
      <FloatingStick side="right" onMove={(x, y) => updateVirtualInput({ aimAngle: Math.atan2(y, x), isFiring: true })} onEnd={() => updateVirtualInput({ isFiring: false })} />

      <style>{`
        .visor-curve-left { border-radius: 0 20px 20px 0; }
        .visor-curve-right { border-radius: 20px 0 0 20px; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #444; border-radius: 10px; }
        @keyframes lowhp-flash {
          0%, 100% { background-color: black; }
          50% { background-color: #1a0404; }
        }
      `}</style>
    </div>
  );
};

export default GameContainer;
