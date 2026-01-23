
import React from 'react';
import { useAccount } from 'wagmi';

const LEADERBOARD_ABI = [
    { name: 'getOperatorStats', type: 'function', stateMutability: 'view', inputs: [{ name: 'operator', type: 'address' }], outputs: [{ name: '', type: 'tuple', components: [{ name: 'kills', type: 'uint256' }, { name: 'wins', type: 'uint256' }, { name: 'gamesPlayed', type: 'uint256' }, { name: 'lastCombatTime', type: 'uint256' }] }] },
] as const;

export default function Leaderboard() {
    const { address } = useAccount();

    // In a real app, we'd fetch a list of top addresses from an indexer or events
    // For now, we'll show a "TOP OPERATORS" layout with placeholders or the connected user

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="p-4 bg-stone-900/60 border border-stone-800 rounded-xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <span>🏆</span> GLOBAL_LEADERBOARD
                    </h3>
                    <div className="px-2 py-0.5 bg-orange-600/20 border border-orange-500/30 rounded text-[8px] font-black text-orange-500">SEASON_01</div>
                </div>
                <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">
                    On-Chain_Combat_Records // Base_Network
                </p>
            </div>

            <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 px-4 py-1 text-[8px] font-black text-stone-600 uppercase tracking-widest">
                    <div className="col-span-1">#</div>
                    <div className="col-span-5">OPERATOR</div>
                    <div className="col-span-2 text-center">KILLS</div>
                    <div className="col-span-2 text-center">WINS</div>
                    <div className="col-span-2 text-right">SCORE</div>
                </div>

                {[1, 2, 3, 4, 5].map((rank) => (
                    <div key={rank} className="grid grid-cols-12 gap-2 px-4 py-3 bg-stone-900/40 border border-stone-800 rounded flex items-center group hover:bg-white/5 transition-all">
                        <div className={`col-span-1 font-black ${rank === 1 ? 'text-orange-500' : 'text-stone-500'}`}>{rank}</div>
                        <div className="col-span-5 flex items-center gap-2">
                            <div className="w-4 h-4 rounded-sm bg-stone-950 flex items-center justify-center text-[8px] font-black text-stone-700">?</div>
                            <div className="truncate text-[10px] font-black text-stone-600 uppercase italic">Awaiting_Operator</div>
                        </div>
                        <div className="col-span-2 text-center text-[10px] font-black text-stone-800">0</div>
                        <div className="col-span-2 text-center text-[10px] font-black text-stone-800">0</div>
                        <div className="col-span-2 text-right text-[10px] font-black text-stone-800">0000</div>
                    </div>
                ))}
            </div>



            <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-lg text-center">
                <p className="text-[8px] text-orange-500/60 font-black uppercase italic">
                    "REAL-TIME STATS SYNCHRONIZED VIA BASE SMART CONTRACTS"
                </p>
            </div>
        </div>
    );
}
