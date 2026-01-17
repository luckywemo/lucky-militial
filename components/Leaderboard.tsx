
import React, { useState } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { CONTRACT_ADDRESSES } from '../utils/blockchain';
import { Transaction, TransactionButton, TransactionStatus, TransactionStatusLabel, TransactionStatusAction } from '@coinbase/onchainkit/transaction';
import { createSyncStatsCall } from '../utils/transaction-calls';

const LEADERBOARD_ABI = [
    { name: 'getOperatorStats', type: 'function', stateMutability: 'view', inputs: [{ name: 'operator', type: 'address' }], outputs: [{ name: '', type: 'tuple', components: [{ name: 'kills', type: 'uint256' }, { name: 'wins', type: 'uint256' }, { name: 'gamesPlayed', type: 'uint256' }, { name: 'lastCombatTime', type: 'uint256' }] }] },
] as const;

export default function Leaderboard() {
    const { address } = useAccount();
    const [kills, setKills] = useState(0);
    const [wins, setWins] = useState(0);

    // In a real app, we'd fetch a list of top addresses from an indexer or events
    // For now, we'll show a "TOP OPERATORS" layout with placeholders or the connected user

    const syncCalls = address ? [createSyncStatsCall(address as `0x${string}`, kills, wins, true)] : [];

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="p-4 bg-stone-900/60 border border-stone-800 rounded-xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span>🏆</span> GLOBAL_LEADERBOARD
                </h3>
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
                            <div className="w-4 h-4 rounded-sm bg-stone-800 flex items-center justify-center text-[8px] font-black text-white">O</div>
                            <div className="truncate text-[10px] font-black text-white">OPERATOR_{Math.floor(Math.random() * 9000 + 1000)}</div>
                        </div>
                        <div className="col-span-2 text-center text-[10px] font-black text-cyan-500">{Math.floor(Math.random() * 500)}</div>
                        <div className="col-span-2 text-center text-[10px] font-black text-white">{Math.floor(Math.random() * 50)}</div>
                        <div className="col-span-2 text-right text-[10px] font-black text-orange-500">{Math.floor(Math.random() * 10000)}</div>
                    </div>
                ))}
            </div>

            {/* Sync Stats Section */}
            {address && (
                <div className="p-6 bg-gradient-to-br from-cyan-500/10 to-orange-500/10 border border-cyan-500/30 rounded-xl">
                    <h4 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span>📡</span> SYNC_COMBAT_STATS
                    </h4>
                    <p className="text-[10px] text-stone-400 mb-4 font-bold uppercase">
                        Manually synchronize your combat statistics to the blockchain
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider mb-2 block">
                                Kills
                            </label>
                            <input
                                type="number"
                                value={kills}
                                onChange={(e) => setKills(parseInt(e.target.value) || 0)}
                                className="w-full bg-stone-900/60 border border-stone-700 rounded-lg px-3 py-2 text-white font-bold text-sm focus:border-cyan-500 focus:outline-none"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider mb-2 block">
                                Wins
                            </label>
                            <input
                                type="number"
                                value={wins}
                                onChange={(e) => setWins(parseInt(e.target.value) || 0)}
                                className="w-full bg-stone-900/60 border border-stone-700 rounded-lg px-3 py-2 text-white font-bold text-sm focus:border-cyan-500 focus:outline-none"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <Transaction calls={syncCalls}>
                        <TransactionButton className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-black py-3 px-6 rounded-lg shadow-[0_0_20px_rgba(34,211,238,0.4)] border border-white/20 transition-all uppercase tracking-widest text-xs" />
                        <TransactionStatus>
                            <TransactionStatusLabel />
                            <TransactionStatusAction />
                        </TransactionStatus>
                    </Transaction>
                </div>
            )}

            <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-lg text-center">
                <p className="text-[8px] text-orange-500/60 font-black uppercase italic">
                    "REAL-TIME STATS SYNCHRONIZED VIA BASE SMART CONTRACTS"
                </p>
            </div>
        </div>
    );
}
