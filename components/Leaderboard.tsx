import React, { useMemo } from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { CONTRACT_ADDRESSES } from '../utils/blockchain';

const LEADERBOARD_ABI = [
    { name: 'getOperatorStats', type: 'function', stateMutability: 'view', inputs: [{ name: 'operator', type: 'address' }], outputs: [{ name: '', type: 'tuple', components: [{ name: 'kills', type: 'uint256' }, { name: 'wins', type: 'uint256' }, { name: 'gamesPlayed', type: 'uint256' }, { name: 'lastCombatTime', type: 'uint256' }] }] },
    { name: 'getOperatorCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
    { name: 'operators', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [{ type: 'address' }] },
] as const;

export default function Leaderboard() {
    const { address } = useAccount();

    const { data: count, isLoading: countLoading } = useReadContract({
        address: CONTRACT_ADDRESSES.LEADERBOARD as `0x${string}`,
        abi: LEADERBOARD_ABI,
        functionName: 'getOperatorCount',
    });

    const operatorCount = Number(count || 0);
    const indices = useMemo(() => Array.from({ length: Math.min(operatorCount, 10) }, (_, i) => BigInt(i)), [operatorCount]);

    const { data: operatorAddresses, isLoading: operatorsLoading } = useReadContracts({
        contracts: indices.map(index => ({
            address: CONTRACT_ADDRESSES.LEADERBOARD as `0x${string}`,
            abi: LEADERBOARD_ABI,
            functionName: 'operators',
            args: [index],
        })),
    });

    const addresses = useMemo(() => {
        return operatorAddresses?.map(r => r.result as `0x${string}`).filter(Boolean) || [];
    }, [operatorAddresses]);

    const { data: operatorStats, isLoading: statsLoading } = useReadContracts({
        contracts: addresses.map(addr => ({
            address: CONTRACT_ADDRESSES.LEADERBOARD as `0x${string}`,
            abi: LEADERBOARD_ABI,
            functionName: 'getOperatorStats',
            args: [addr],
        })),
    });

    const leaderboardData = useMemo(() => {
        if (!operatorStats || !addresses.length) return [];

        return addresses.map((addr, i) => {
            const stats = operatorStats[i]?.result as any;
            if (!stats) return null;

            const kills = Number(stats.kills || 0);
            const wins = Number(stats.wins || 0);
            const score = (kills * 10) + (wins * 50);

            return {
                address: addr,
                kills,
                wins,
                score,
                lastCombat: Number(stats.lastCombatTime || 0)
            };
        })
            .filter((item): item is NonNullable<typeof item> => item !== null)
            .sort((a, b) => b.score - a.score);
    }, [addresses, operatorStats]);

    const isLoading = countLoading || operatorsLoading || statsLoading;

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

                {isLoading ? (
                    <div className="space-y-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-12 bg-stone-900/20 border border-stone-800/50 rounded animate-pulse"></div>
                        ))}
                    </div>
                ) : leaderboardData.length > 0 ? (
                    leaderboardData.slice(0, 10).map((op, index) => (
                        <div key={op.address} className={`grid grid-cols-12 gap-2 px-4 py-3 bg-stone-900/40 border ${op.address === address ? 'border-orange-500/50 bg-orange-500/5' : 'border-stone-800'} rounded flex items-center group hover:bg-white/5 transition-all`}>
                            <div className={`col-span-1 font-black ${index < 3 ? 'text-orange-500' : 'text-stone-500'}`}>{index + 1}</div>
                            <div className="col-span-5 flex items-center gap-2">
                                <div className="w-4 h-4 rounded-sm bg-orange-600 flex items-center justify-center text-[7px] font-black text-white">
                                    {op.address.slice(2, 4).toUpperCase()}
                                </div>
                                <div className="truncate text-[10px] font-black text-white uppercase italic">
                                    {op.address === address ? 'YOU' : `${op.address.slice(0, 6)}...${op.address.slice(-4)}`}
                                </div>
                            </div>
                            <div className="col-span-2 text-center text-[10px] font-black text-stone-300">{op.kills}</div>
                            <div className="col-span-2 text-center text-[10px] font-black text-stone-300">{op.wins}</div>
                            <div className="col-span-2 text-right text-[10px] font-black text-orange-500">{op.score.toString().padStart(4, '0')}</div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10 bg-stone-950/40 border border-dashed border-stone-800 rounded">
                        <p className="text-[10px] text-stone-600 font-black uppercase tracking-widest">Awaiting_Initial_Combat_Logs</p>
                    </div>
                )}
            </div>

            <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-lg text-center">
                <p className="text-[8px] text-orange-500/60 font-black uppercase italic">
                    "REAL-TIME STATS SYNCHRONIZED VIA BASE SMART CONTRACTS"
                </p>
            </div>
        </div>
    );
}
