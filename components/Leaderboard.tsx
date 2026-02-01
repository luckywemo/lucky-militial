import React, { useMemo, useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

export default function Leaderboard() {
    const { address } = useAccount();
    const [period, setPeriod] = useState('alltime');

    useEffect(() => {
        async function fetchLeaderboard() {
            try {
                setIsLoading(true);
                // Calculate period key:
                // All Time: alltime
                // Monthly: monthly:YYYYMM
                // Daily: daily:YYYYMMDD

                let queryPeriod = 'alltime';
                const now = new Date();
                const ymd = now.toISOString().split('T')[0].replace(/-/g, '');
                const ym = ymd.substring(0, 6);

                if (period === 'daily') queryPeriod = `daily:${ymd}`;
                if (period === 'monthly') queryPeriod = `monthly:${ym}`;

                const response = await fetch(`/api/leaderboard?period=${queryPeriod}`);
                if (!response.ok) throw new Error('Failed to fetch leaderboard');
                const data = await response.json();
                setLeaderboardData(data);
                setError(null);
            } catch (err: any) {
                console.error('[Leaderboard] Fetch error:', err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        }

        fetchLeaderboard();
    }, [period]);

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="p-4 bg-stone-900/60 border border-stone-800 rounded-xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <span>🏆</span> LEADERBOARD
                    </h3>
                    <div className="flex gap-1">
                        {['alltime', 'monthly', 'daily'].map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-2 py-1 border rounded text-[8px] font-black uppercase transition-all ${period === p ? 'bg-orange-500 text-white border-orange-500' : 'bg-transparent text-stone-500 border-stone-800 hover:border-stone-600 hover:text-stone-300'}`}
                            >
                                {p === 'alltime' ? 'ALL_TIME' : p}
                            </button>
                        ))}
                    </div>
                </div>
                <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">
                    Combat_Records // {period.toUpperCase()}
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
                    leaderboardData.slice(0, 50).map((op, index) => (
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
                        <p className="text-[10px] text-stone-600 font-black uppercase tracking-widest">NO_DATA_FOR_PERIOD</p>
                    </div>
                )}
            </div>

            <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-lg text-center">
                <p className="text-[8px] text-orange-500/60 font-black uppercase italic">
                    "REAL-TIME STATS SYNCHRONIZED"
                </p>
            </div>
        </div>
    );
}
