
import React from 'react';

interface Props {
  playerName: string;
  onExit: () => void;
}

const UIOverlay: React.FC<Props> = ({ playerName, onExit }) => {
  return (
    <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
      <div className="flex justify-between items-start">
        <div className="bg-slate-900/80 p-4 rounded-xl border-2 border-slate-700 pointer-events-auto shadow-xl">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse"></div>
            <span className="font-bold uppercase tracking-tighter text-indigo-100">{playerName}</span>
          </div>
          <div className="w-48 h-3 bg-slate-700 rounded-full overflow-hidden border border-slate-600 mb-2">
            <div id="hp-bar" className="h-full bg-gradient-to-r from-red-600 to-rose-500 w-[100%] transition-all duration-300"></div>
          </div>
          <div className="w-48 h-2 bg-slate-700 rounded-full overflow-hidden border border-slate-600">
            <div id="fuel-bar" className="h-full bg-gradient-to-r from-blue-600 to-indigo-400 w-[100%] transition-all duration-300"></div>
          </div>
        </div>

        <button 
          onClick={onExit}
          className="bg-slate-800/80 hover:bg-red-500 text-slate-400 hover:text-white px-4 py-2 rounded-lg border-2 border-slate-700 hover:border-red-400 pointer-events-auto transition-all font-bold flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          QUIT
        </button>
      </div>

      <div className="flex justify-center mb-8">
        <div className="bg-slate-900/80 px-6 py-2 rounded-full border-2 border-slate-700 text-slate-400 text-[10px] font-mono uppercase tracking-[0.3em] backdrop-blur-sm">
          Networked Prototype | Broadcast Sync
        </div>
      </div>
    </div>
  );
};

export default UIOverlay;
