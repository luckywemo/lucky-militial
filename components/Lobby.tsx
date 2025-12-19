
import React, { useState, useEffect } from 'react';
import { GameMode, CharacterClass, MissionConfig } from '../App';

interface Props {
  playerName: string;
  setPlayerName: (name: string) => void;
  characterClass: CharacterClass;
  setCharacterClass: (c: CharacterClass) => void;
  avatar: string | null;
  unlockedLevel: number;
  missions: MissionConfig[];
  onStart: (roomId: string | null, isHost: boolean, mode: GameMode, levelId?: number) => void;
  onLabs: () => void;
}

const CLASS_META: Record<CharacterClass, { desc: string; hp: number; speed: number; armor: number; tech: number; weapon: string; icon: string }> = {
  STRIKER: { desc: "Versatile frontline assault unit. Optimized for medium-range kinetics and high-mobility flanking maneuvers.", hp: 120, speed: 100, armor: 60, tech: 40, weapon: "R-99 RAZOR", icon: "🎖️" },
  GHOST: { desc: "Advanced stealth operative. Features active cloaking and high-frequency energy projection for quick assassinations.", hp: 80, speed: 150, armor: 20, tech: 100, weapon: "P-20 SILENCED", icon: "🕶️" },
  TITAN: { desc: "Reinforced defense juggernaut. Heavy ceramics and kinetic shielding make this unit a mobile fortress.", hp: 200, speed: 50, armor: 140, tech: 20, weapon: "B-10 BREACHER", icon: "🛡️" }
};

const StatBar: React.FC<{ label: string; value: number; max: number; color: string }> = ({ label, value, max, color }) => {
  const percent = (value / max) * 100;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[9px] font-black tracking-widest text-stone-500 uppercase">
        <span>{label}</span>
        <span className="text-stone-300">{value}</span>
      </div>
      <div className="h-2 bg-stone-900/50 rounded-full overflow-hidden p-[1px] border border-stone-800">
        <div className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${percent}%`, boxShadow: `0 0 10px ${color.replace('bg-', '')}88` }}></div>
      </div>
    </div>
  );
};

const Lobby: React.FC<Props> = ({ playerName, setPlayerName, characterClass, setCharacterClass, avatar, unlockedLevel, missions, onStart, onLabs }) => {
  const [tab, setTab] = useState<'missions' | 'multiplayer'>('missions');
  const [selectedLevelId, setSelectedLevelId] = useState(unlockedLevel);
  const [isHovering, setIsHovering] = useState<number | null>(null);

  const selectedClass = CLASS_META[characterClass];
  const selectedMission = missions.find(m => m.id === selectedLevelId) || missions[0];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-16 animate-in fade-in zoom-in-95 duration-700 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.03)_0%,transparent_100%)]">
      
      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
        
        {/* LEFT: COMMAND OVERVIEW */}
        <div className="lg:col-span-4 flex flex-col space-y-8">
          <div className="space-y-4">
            <h1 className="font-stencil text-7xl lg:text-9xl font-black text-white leading-none tracking-tighter uppercase drop-shadow-[0_0_30px_rgba(249,115,22,0.2)]">
              LUCKY<br/><span className="text-orange-500">MILITIA</span>
            </h1>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-stone-800"></div>
              <p className="text-[10px] font-black text-stone-600 tracking-[0.5em] uppercase whitespace-nowrap">Tactical_Ops_Node_v8.2</p>
            </div>
          </div>

          <div className="tactical-panel p-10 bg-black/60 space-y-8 rounded-2xl border-stone-800 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-100 transition-opacity">
               <div className="w-4 h-4 border-t-2 border-r-2 border-orange-500"></div>
            </div>

            <div className="space-y-3">
              <label className="text-[9px] font-black text-orange-500/60 uppercase tracking-[0.3em]">Operator_Callsign</label>
              <input 
                type="text" 
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value.toUpperCase())}
                className="w-full bg-stone-900/30 border-b-2 border-stone-800 p-3 text-2xl font-black text-white outline-none focus:border-orange-500 transition-all font-stencil tracking-widest placeholder:text-stone-700"
              />
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={() => setTab(tab === 'missions' ? 'multiplayer' : 'missions')}
                className={`py-4 px-6 text-[10px] font-black uppercase tracking-[0.4em] transition-all flex items-center justify-between border-2 ${tab === 'missions' ? 'bg-orange-600/10 border-orange-500 text-orange-500' : 'bg-stone-900 border-stone-800 text-stone-500 hover:text-stone-300'}`}
              >
                <span>{tab === 'missions' ? 'Deployment_Active' : 'Network_Mode'}</span>
                <span className="text-lg">{tab === 'missions' ? '🛰️' : '🌐'}</span>
              </button>
              <button 
                onClick={onLabs}
                className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.4em] bg-stone-900 border-2 border-stone-800 text-stone-500 hover:text-white hover:border-white transition-all flex items-center justify-between"
              >
                <span>Neural_Forge</span>
                <span className="text-lg">⚙️</span>
              </button>
            </div>
          </div>

          <div className="bg-stone-900/40 p-8 border border-stone-800 rounded-2xl space-y-4">
             <div className="flex items-center gap-4">
                <div className="w-2 h-2 bg-green-500 animate-pulse rounded-full shadow-[0_0_10px_green]"></div>
                <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Neural_Link: Established</div>
             </div>
             <p className="text-[11px] text-stone-500 leading-relaxed font-bold italic opacity-70">
               "Broadcast secure. Tactical data synchronization complete. Ready for immediate deployment to Sector {selectedLevelId}."
             </p>
          </div>
        </div>

        {/* CENTER: TACTICAL WORLD MAP */}
        <div className="lg:col-span-5 tactical-panel bg-black/80 p-4 border border-stone-800 relative rounded-3xl overflow-hidden group">
           {/* Map Grid Background */}
           <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#f97316 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
           
           {/* Scanline Sweep */}
           <div className="absolute top-0 left-0 w-full h-[2px] bg-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.5)] animate-[scan_6s_linear_infinite]"></div>

           <div className="relative w-full h-full flex flex-col p-8 z-10">
              <div className="flex justify-between items-center mb-10">
                 <h2 className="text-3xl font-black font-stencil tracking-widest text-white uppercase">{tab === 'missions' ? 'Sector_Map' : 'Network_Nodes'}</h2>
                 <div className="text-[9px] font-black text-stone-600 tracking-widest">MAP_ID: LM_TERRA_01</div>
              </div>

              {tab === 'missions' ? (
                <div className="flex-1 relative bg-stone-950/50 rounded-2xl border border-stone-800 shadow-inner group-hover:border-stone-700 transition-colors overflow-hidden">
                   {/* Realistic Map Pins */}
                   {missions.map(m => {
                     const isUnlocked = m.id <= unlockedLevel;
                     const isSelected = selectedLevelId === m.id;
                     return (
                       <button
                         key={m.id}
                         disabled={!isUnlocked}
                         onClick={() => setSelectedLevelId(m.id)}
                         onMouseEnter={() => setIsHovering(m.id)}
                         onMouseLeave={() => setIsHovering(null)}
                         className={`absolute w-12 h-12 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed grayscale'}`}
                         style={{ left: `${m.coords.x}%`, top: `${m.coords.y}%` }}
                       >
                         {isSelected && <div className="mission-pulse"></div>}
                         <div className={`w-full h-full rounded-xl border-2 flex items-center justify-center font-black text-sm transition-all ${isSelected ? 'bg-orange-600 border-white text-white scale-125 shadow-2xl' : isUnlocked ? 'bg-stone-900 border-stone-700 text-stone-500 hover:border-orange-500 hover:text-white' : 'bg-black border-stone-900 text-stone-800 opacity-50'}`}>
                            {m.id}
                         </div>
                         {isHovering === m.id && isUnlocked && (
                           <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 bg-stone-100 text-black px-4 py-2 rounded-lg text-[10px] font-black whitespace-nowrap shadow-xl z-20 animate-in fade-in slide-in-from-bottom-2">
                             {m.name}
                           </div>
                         )}
                       </button>
                     );
                   })}

                   {/* Mission Details Overlay (Bottom) */}
                   <div className="absolute bottom-6 left-6 right-6 p-6 bg-stone-900/90 border border-stone-700 backdrop-blur-md rounded-xl space-y-4 animate-in slide-in-from-bottom-4">
                      <div className="flex justify-between items-center">
                         <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.4em]">{selectedMission.name}</span>
                         <span className="text-[9px] font-bold text-stone-500">THREAT_LVL: {selectedMission.difficulty}</span>
                      </div>
                      <p className="text-[12px] text-stone-300 leading-tight uppercase font-bold tracking-tight">{selectedMission.objective}</p>
                      <div className="h-1 w-full bg-stone-800 rounded-full overflow-hidden">
                         <div className="h-full bg-orange-600" style={{ width: `${(selectedMission.targetKills / 40) * 100}%` }}></div>
                      </div>
                   </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in zoom-in-95 duration-500">
                   <div className="text-8xl mb-4 animate-pulse">📡</div>
                   <p className="text-stone-500 font-bold uppercase tracking-[0.6em] text-[11px] text-center leading-relaxed">Scanning neural frequencies...<br/>Multiplayer combat link pending.</p>
                   <button onClick={() => setTab('missions')} className="text-orange-500 font-black uppercase text-xs hover:underline tracking-widest">Abort Scan</button>
                </div>
              )}
           </div>
        </div>

        {/* RIGHT: CLASS DOSSIER & DEPLOY */}
        <div className="lg:col-span-3 flex flex-col space-y-8">
           <div className="tactical-panel flex-1 bg-black/60 p-10 border border-stone-800 rounded-3xl flex flex-col space-y-10">
              <div className="flex gap-2">
                {(['STRIKER', 'GHOST', 'TITAN'] as CharacterClass[]).map(c => (
                  <button 
                    key={c}
                    onClick={() => setCharacterClass(c)}
                    className={`flex-1 py-4 rounded-xl text-[10px] font-black border-2 transition-all ${characterClass === c ? 'bg-white border-white text-stone-950 shadow-xl scale-110' : 'bg-stone-950 border-stone-900 text-stone-700 hover:text-stone-400'}`}
                  >
                    {CLASS_META[c].icon}
                  </button>
                ))}
              </div>

              <div className="space-y-4 text-center">
                 <h3 className="text-4xl font-black font-stencil tracking-widest text-white uppercase">{characterClass}</h3>
                 <p className="text-[11px] text-stone-500 italic font-bold">"{selectedClass.desc}"</p>
              </div>

              <div className="space-y-6 pt-6 border-t border-stone-800">
                <StatBar label="Durability" value={selectedClass.hp} max={200} color="bg-orange-500" />
                <StatBar label="Mobility" value={selectedClass.speed} max={160} color="bg-cyan-500" />
                <StatBar label="Heavy_Armor" value={selectedClass.armor} max={200} color="bg-stone-300" />
              </div>
           </div>

           <button 
              onClick={() => onStart(null, true, 'mission', selectedLevelId)}
              className="btn-tactical py-12 bg-white text-stone-950 text-2xl tracking-[0.6em] font-stencil shadow-2xl active:scale-95 group relative overflow-hidden stencil-cutout"
           >
             DEPLOY
             <div className="absolute top-0 left-0 w-full h-full bg-orange-500/10 opacity-0 group-hover:opacity-100 pointer-events-none"></div>
             <div className="absolute -bottom-1 -right-1 text-[10px] opacity-30 font-sans p-4">READY_SYNC</div>
           </button>
        </div>

      </div>

      <style>{`
        @keyframes scan {
          from { transform: translateY(0); }
          to { transform: translateY(100vh); }
        }
      `}</style>
    </div>
  );
};

export default Lobby;
