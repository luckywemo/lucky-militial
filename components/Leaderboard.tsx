import React, { useState, useEffect, useMemo } from 'react';
import { useBlockchainStats } from '../utils/blockchain';

interface Props {
    activeAddress?: string;
    playerName?: string;
}

interface LeaderboardEntry {
    address: string;
    username: string | null;
    score: number;
    kills: number;
    wins: number;
    lastCombat: number;
}

const RANK_BADGES = ['🥇', '🥈', '🥉'];
const RANK_COLORS = ['text-yellow-400', 'text-stone-300', 'text-amber-600'];

function formatAddress(addr: string): string {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function timeSince(ts: number): string {
    if (!ts) return 'NEVER';
    const delta = Date.now() - ts;
    const mins = Math.floor(delta / 60000);
    if (mins < 1) return 'JUST_NOW';
    if (mins < 60) return `${mins}m_AGO`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h_AGO`;
    return `${Math.floor(hrs / 24)}d_AGO`;
}

export default function Leaderboard({ activeAddress, playerName }: Props) {
    const [period, setPeriod] = useState('alltime');
    const [type, setType] = useState<'combined' | 'pve' | 'pvp'>('combined');
    const [isLoading, setIsLoading] = useState(false);
    const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [verifiedStats, setVerifiedStats] = useState<{ [addr: string]: boolean }>({});
    const [isVerifying, setIsVerifying] = useState<string | null>(null);

    const { getStats } = useBlockchainStats();

    useEffect(() => {
        let isMounted = true;
        
        async function fetchLeaderboard(isInitialFetch = false) {
            try {
                if (isInitialFetch && leaderboardData.length === 0) {
                    setIsLoading(true);
                }
                
                let queryPeriod = 'alltime';
                const now = new Date();
                const ymd = now.toISOString().split('T')[0].replace(/-/g, '');
                const ym = ymd.substring(0, 6);

                if (period === 'daily') queryPeriod = `daily:${ymd}`;
                if (period === 'monthly') queryPeriod = `monthly:${ym}`;

                const response = await fetch(`/api/leaderboard?period=${queryPeriod}&type=${type}`);
                if (!response.ok) throw new Error('Failed to fetch leaderboard');
                const data = await response.json();
                
                if (isMounted) {
                    setLeaderboardData(data);
                    setError(null);
                }
            } catch (err: any) {
                console.error('[Leaderboard] Fetch error:', err);
                if (isMounted) setError(err.message);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }

        // Initial fetch
        fetchLeaderboard(true);

        // Polling every 10 seconds
        const intervalId = setInterval(() => {
            fetchLeaderboard(false);
        }, 10000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [period, type]);

    // Find current player's rank
    const myEntry = useMemo(() => {
        if (!activeAddress) return null;
        const idx = leaderboardData.findIndex(e => e.address.toLowerCase() === activeAddress.toLowerCase());
        if (idx === -1) return null;
        return { ...leaderboardData[idx], rank: idx + 1 };
    }, [leaderboardData, activeAddress]);

    const handleVerify = async (addr: string, expectedScore: number) => {
        try {
            setIsVerifying(addr);
            const stats = await getStats(addr);
            if (stats) {
                // Simplified verification: check if kills + wins derived score matches roughly
                // Or just if we got a response from the contract for this user
                const onChainScore = Number(stats.kills) * 10 + Number(stats.wins) * 50;
                if (onChainScore >= expectedScore) {
                     setVerifiedStats(prev => ({ ...prev, [addr]: true }));
                }
            }
        } catch (e) {
            console.error('[Leaderboard] Verification failed:', e);
        } finally {
            setIsVerifying(null);
        }
    };

    const topScore = leaderboardData.length > 0 ? leaderboardData[0].score : 1;

    return (
        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-500">

            {/* Header */}
            <div className="p-4 lg:p-6 bg-stone-900/60 border border-stone-800 rounded-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-orange-500 via-orange-600 to-transparent"></div>
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl"></div>
                <div className="flex items-center justify-between mb-3 relative z-10">
                    <h3 className="text-lg lg:text-xl font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <span className="text-2xl">🏆</span> COMBAT_RECORDS
                    </h3>
                    <div className="flex flex-col gap-2">
                        <div className="flex gap-1 justify-end">
                            {([
                                { id: 'combined', label: 'ALL_OPS' },
                                { id: 'pve', label: 'CAMPAIGN' },
                                { id: 'pvp', label: 'ARENA' }
                            ] as const).map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setType(t.id)}
                                    className={`px-2 py-1 rounded text-[7px] font-black uppercase tracking-tighter transition-all ${type === t.id
                                        ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                                        : 'bg-black/40 text-stone-600 border border-stone-800/40 hover:text-stone-400'
                                    }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-1">
                            {(['alltime', 'monthly', 'daily'] as const).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={`px-2.5 py-1.5 border rounded text-[8px] lg:text-[9px] font-black uppercase tracking-wider transition-all ${period === p
                                        ? 'bg-orange-500 text-white border-orange-400 shadow-lg shadow-orange-500/20'
                                        : 'bg-stone-950 text-stone-500 border-stone-800 hover:border-stone-600 hover:text-stone-300'
                                        }`}
                                >
                                    {p === 'alltime' ? 'ALL_TIME' : p === 'monthly' ? 'MONTHLY' : 'DAILY'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-between relative z-10">
                    <p className="text-[9px] lg:text-[10px] text-stone-500 font-bold uppercase tracking-wider">
                        Protocol // {type.toUpperCase()} // {period.toUpperCase()} // {leaderboardData.length} OPERATORS_INDEXED
                    </p>
                    {!isLoading && !error && (
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-[7px] text-green-500 font-black uppercase">LIVE_FEED</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Personal Stats Card (if user is ranked) */}
            {myEntry && (
                <div className="p-4 bg-orange-500/5 border border-orange-500/30 rounded-xl relative overflow-hidden">
                    <div className="absolute -top-8 -right-8 w-24 h-24 bg-orange-500/10 rounded-full blur-xl"></div>
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-orange-600 flex items-center justify-center text-lg font-black text-white shadow-lg">
                                #{myEntry.rank}
                            </div>
                            <div>
                                <div className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                                    {playerName || formatAddress(myEntry.address)}
                                    <span className="text-[7px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded font-bold">YOU</span>
                                </div>
                                <div className="text-[8px] text-stone-500 font-bold uppercase mt-0.5">
                                    {myEntry.kills} KILLS // {myEntry.wins} WINS // LAST: {timeSince(myEntry.lastCombat)}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <div className="text-right">
                                <div className="text-xl lg:text-2xl font-stencil text-orange-500">{myEntry.score.toLocaleString()}</div>
                                <div className="text-[7px] text-stone-600 font-bold uppercase">COMBAT_SCORE</div>
                            </div>
                            
                            {verifiedStats[myEntry.address] ? (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded text-[7px] text-cyan-400 font-black animate-in zoom-in duration-300">
                                    <span className="text-[10px]">🛡️</span> SOROBAN_VERIFIED
                                </div>
                            ) : (
                                <button 
                                    onClick={() => handleVerify(myEntry.address, myEntry.score)}
                                    disabled={isVerifying === myEntry.address}
                                    className="px-2 py-1 bg-stone-900 border border-stone-800 rounded text-[7px] text-stone-400 font-black hover:text-white hover:border-stone-600 transition-all disabled:opacity-50"
                                >
                                    {isVerifying === myEntry.address ? 'SYNCHRONIZING...' : 'VERIFY_ON_CHAIN'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Column Headers */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[7px] lg:text-[8px] font-black text-stone-600 uppercase tracking-widest border-b border-stone-800/50">
                <div className="col-span-1">#</div>
                <div className="col-span-4">OPERATOR</div>
                <div className="col-span-2 text-center">KILLS</div>
                <div className="col-span-2 text-center">WINS</div>
                <div className="col-span-1 text-center hidden lg:block">LAST</div>
                <div className="col-span-2 lg:col-span-2 text-right">SCORE</div>
            </div>

            {/* Leaderboard Body */}
            <div className="space-y-1.5">
                {isLoading ? (
                    <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-14 bg-stone-900/20 border border-stone-800/50 rounded-lg animate-pulse" style={{ animationDelay: `${i * 100}ms` }}></div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-center py-12 bg-stone-950/40 border border-red-900/30 rounded-lg">
                        <span className="text-2xl mb-2 block">⚠️</span>
                        <p className="text-[10px] text-red-500 font-black uppercase tracking-widest">UPLINK_ERROR</p>
                        <p className="text-[8px] text-stone-600 mt-1">{error}</p>
                    </div>
                ) : leaderboardData.length > 0 ? (
                    leaderboardData.slice(0, 50).map((op, index) => {
                        const isMe = op.address.toLowerCase() === activeAddress?.toLowerCase();
                        const isTop3 = index < 3;
                        const scorePercent = Math.max(5, Math.round((op.score / topScore) * 100));

                        return (
                            <div
                                key={op.address}
                                className={`grid grid-cols-12 gap-2 px-4 py-3 rounded-lg items-center group transition-all duration-300 relative overflow-hidden ${isMe
                                    ? 'bg-orange-500/10 border border-orange-500/40 shadow-lg shadow-orange-500/5'
                                    : isTop3
                                        ? 'bg-stone-900/60 border border-stone-700/60 hover:border-stone-600'
                                        : 'bg-stone-900/30 border border-stone-800/40 hover:bg-stone-900/50 hover:border-stone-700'
                                    }`}
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                {/* Score bar background */}
                                <div
                                    className={`absolute left-0 top-0 h-full transition-all duration-700 ${isMe ? 'bg-orange-500/5' : 'bg-white/[0.02]'}`}
                                    style={{ width: `${scorePercent}%` }}
                                ></div>

                                {/* Rank */}
                                <div className={`col-span-1 font-black text-sm relative z-10 ${isTop3 ? RANK_COLORS[index] : 'text-stone-600'}`}>
                                    {isTop3 ? RANK_BADGES[index] : index + 1}
                                </div>

                                {/* Operator */}
                                <div className="col-span-4 flex items-center gap-2 relative z-10">
                                    <div className={`w-6 h-6 rounded flex items-center justify-center text-[8px] font-black text-white uppercase ${isTop3 ? 'bg-orange-600' : 'bg-stone-800'}`}>
                                        {(op.username || op.address)[0]}
                                    </div>
                                    <div className="truncate flex items-center gap-1.5">
                                        <div className="text-[10px] font-black text-white uppercase tracking-wide truncate">
                                            {op.username || formatAddress(op.address)}
                                        </div>
                                        {verifiedStats[op.address] && (
                                            <span className="text-[8px] text-cyan-500" title="Blockchain Verified">🛡️</span>
                                        )}
                                    </div>
                                    {isMe && <span className="text-[6px] text-orange-400 font-bold">YOUR_PROFILE</span>}
                                </div>


                                {/* Kills */}
                                <div className="col-span-2 text-center text-[10px] font-black text-stone-300 relative z-10">
                                    {op.kills.toLocaleString()}
                                </div>

                                {/* Wins */}
                                <div className="col-span-2 text-center text-[10px] font-black text-stone-300 relative z-10">
                                    {op.wins.toLocaleString()}
                                </div>

                                {/* Last Combat */}
                                <div className="col-span-1 text-center text-[7px] font-bold text-stone-600 uppercase hidden lg:block relative z-10">
                                    {timeSince(op.lastCombat)}
                                </div>

                                {/* Score */}
                                <div className={`col-span-2 lg:col-span-2 text-right font-black relative z-10 ${isTop3 ? 'text-orange-500 text-sm' : 'text-stone-400 text-[10px]'}`}>
                                    {op.score.toLocaleString()}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-14 bg-stone-950/40 border border-dashed border-stone-800 rounded-lg">
                        <span className="text-3xl mb-3 block opacity-30">📡</span>
                        <p className="text-[10px] text-stone-600 font-black uppercase tracking-widest">NO_COMBAT_DATA_FOR_PERIOD</p>
                        <p className="text-[8px] text-stone-700 mt-1">Deploy to the battlefield to register on the leaderboard</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-stone-950/60 border border-stone-800/50 rounded-lg flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-cyan-500 rounded-full animate-pulse"></div>
                        <p className="text-[7px] text-stone-600 font-black uppercase tracking-widest">
                            {type === 'pvp' ? 'ARENA_SCORE = (KILLS × 25) + (WINS × 100)' : 'CAMPAIGN_SCORE = (KILLS × 5) + (WINS × 20)'}
                        </p>
                    </div>
                </div>
                <p className="text-[7px] text-stone-700 font-bold uppercase">
                    {leaderboardData.length > 0 ? `${leaderboardData.length} RANKED` : 'AWAITING_DATA'}
                </p>
            </div>
        </div>
    );
}
