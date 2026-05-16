
import React from 'react';
import { getFarcasterUser, getFarcasterPfpUrl, isInFarcaster } from '../utils/farcaster';
import { calculateLevelData, getRankColor } from '../utils/leveling';
import { useBlockchainStats, PlayerStats } from '../utils/blockchain';

interface ProfileDashboardProps {
    playerName: string;
    activeAddress?: string;
    isVerified?: boolean;
    chainName?: string;
}

const ProfileDashboard: React.FC<ProfileDashboardProps> = ({ playerName, activeAddress, isVerified, chainName }) => {
    const [farcasterUser, setFarcasterUser] = React.useState<any>(null);
    const [pfp, setPfp] = React.useState<string | null>(null);
    const [stats, setStats] = React.useState<PlayerStats>({ username: playerName, kills: 0, wins: 0, gamesPlayed: 0 });
    const [isSyncing, setIsSyncing] = React.useState(false);
    const { getStats } = useBlockchainStats();

    const loadData = React.useCallback(async () => {
        setIsSyncing(true);
        const playerId = activeAddress || `guest:${playerName}`;
        console.log(`[Profile] Fetching stats for ${playerId}...`);
        
        try {
            const fetchedStats = await getStats(playerId);
            console.log(`[Profile] Received stats:`, fetchedStats);
            if (fetchedStats) setStats(fetchedStats);
        } catch (e) {
            console.error('[Profile] Fetch failed:', e);
        } finally {
            setIsSyncing(false);
        }
    }, [activeAddress, playerName, getStats]);

    React.useEffect(() => {
        const loadFarcaster = async () => {
            if (isInFarcaster()) {
                const user = await getFarcasterUser();
                const pfpUrl = await getFarcasterPfpUrl();
                setFarcasterUser(user);
                setPfp(pfpUrl);
            }
        };
        loadFarcaster();
        loadData();
    }, [loadData]);

    const levelData = calculateLevelData(stats);
    const formattedBalance = '0';

    return (
        <div className="space-y-6 lg:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* HEADER / IDENTITY */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-stone-900/40 border border-stone-800 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/5 blur-3xl -mr-10 -mt-10"></div>
                <div className="relative">
                    <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-2xl border-4 border-stone-800 overflow-hidden shadow-2xl group-hover:border-orange-500/50 transition-all duration-500">
                        <img
                            src={pfp || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${playerName}`}
                            alt="Profile"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-orange-600 px-2 py-0.5 rounded text-[8px] font-black font-stencil tracking-widest text-white shadow-xl">LVL_{levelData.level}</div>
                </div>

                <div className="text-center sm:text-left flex-1 min-w-0">
                    <div className="flex items-center justify-center sm:justify-start gap-3 mb-1">
                        <h2 className="text-2xl lg:text-4xl font-black text-white truncate uppercase tracking-tight">{playerName}</h2>
                        {activeAddress && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border bg-cyan-600/20 text-cyan-400 border-cyan-500/30`}>
                                🌐 {chainName || 'EVM'}
                            </span>
                        )}
                        {farcasterUser && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border bg-purple-600/20 text-purple-400 border-purple-500/30`}>
                                🟣 FARCASTER
                            </span>
                        )}
                    </div>

                    <div className="w-full max-w-sm mt-4 sm:mt-0">
                        <div className="flex justify-between text-[8px] font-black uppercase text-stone-500 mb-1">
                            <span>XP_PROGRESS</span>
                            <span>{Math.floor(levelData.progressPercent)}%</span>
                        </div>
                        <div className="h-1.5 bg-stone-950 rounded-full overflow-hidden border border-stone-800">
                            <div
                                className="h-full bg-orange-600 shadow-[0_0_8px_#f97316]"
                                style={{ width: `${levelData.progressPercent}%` }}
                            ></div>
                        </div>
                    </div>
                    <p className="text-stone-500 text-xs lg:text-sm font-bold truncate opacity-80 mb-4">{activeAddress || 'OPERATOR_NOT_LINKED'}</p>

                    <div className="flex flex-wrap justify-center sm:justify-start gap-2 lg:gap-4">
                        <div className="px-3 py-1 bg-black/40 border border-stone-800 rounded text-[10px] text-stone-400 font-black uppercase">
                            CLASS: <span className="text-orange-500">STRIKER</span>
                        </div>
                        <div className="px-3 py-1 bg-black/40 border border-stone-800 rounded text-[10px] text-stone-400 font-black uppercase">
                            RANK: <span className={`${getRankColor(levelData.level)}`}>{levelData.rank}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* STATS GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'LMT_BALANCE', value: formattedBalance, icon: '🪙', color: 'text-orange-500' },
                    { label: 'CONFRMD_KILLS', value: stats.kills, icon: '🎯', color: 'text-red-500' },
                    { label: 'WAR_VICTORIES', value: stats.wins, icon: '🏆', color: 'text-yellow-500' },
                    { label: 'OP_RELIABILITY', value: '100%', icon: '🛡️', color: 'text-cyan-500' }
                ].map((stat, i) => (
                    <div key={i} className="tactical-panel bg-stone-900/60 p-4 lg:p-6 rounded-xl border border-stone-800 hover:border-stone-700 transition-all group">
                        <div className="text-xs lg:text-xl mb-1 lg:mb-2">{stat.icon}</div>
                        <div className="text-[8px] lg:text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1">{stat.label}</div>
                        <div className={`text-xl lg:text-3xl font-stencil font-black ${stat.color} group-hover:scale-110 transition-transform origin-left`}>{stat.value}</div>
                    </div>
                ))}
            </div>

            {/* RECENT ACTIVITY & BADGES */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="tactical-panel bg-stone-900/40 p-6 rounded-2xl border border-stone-800">
                    <h3 className="text-sm lg:text-base font-black text-white uppercase mb-6 flex items-center justify-between">
                        <span>UNLOCKED_BADGES</span>
                        <span className="text-[10px] text-stone-600 font-bold tracking-widest">0 / 12</span>
                    </h3>
                    <div className="grid grid-cols-4 gap-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="aspect-square bg-stone-950 border border-dashed border-stone-800 rounded-lg flex items-center justify-center grayscale opacity-20">
                                <span className="text-xl">🏆</span>
                            </div>
                        ))}
                    </div>
                    <p className="mt-6 text-center text-[10px] text-stone-600 font-bold italic uppercase">"Continue operations to earn merit awards."</p>
                </div>

                <div className="tactical-panel bg-stone-900/40 p-6 rounded-2xl border border-stone-800">
                    <h3 className="text-sm lg:text-base font-black text-white uppercase mb-6 flex items-center justify-between">
                        <span>OPERATIONAL_LOGS</span>
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={loadData}
                                disabled={isSyncing}
                                className={`text-[8px] px-2 py-1 rounded border border-orange-500/30 font-black uppercase transition-all ${isSyncing ? 'animate-pulse text-orange-500 bg-orange-500/10' : 'text-stone-500 hover:text-orange-500 hover:bg-orange-500/5'}`}
                            >
                                {isSyncing ? 'SYNCHRONIZING...' : 'REFRESH_UPLINK'}
                            </button>
                            <span className="text-[10px] text-orange-500/50 font-bold tracking-widest">LIVE_FEED</span>
                        </div>
                    </h3>
                    <div className="space-y-4">
                        {[
                             { t: 'BOOT_UP', d: 'Operator recognized. System status: GREEN.' },
                             { t: 'WALLET_SYNC', d: activeAddress ? `Primary wallet linked to ${chainName}.` : 'Operating in GUEST_MODE.' },
                             farcasterUser && { t: 'IDENTITY', d: 'Farcaster profile linked and active.' },
                             activeAddress && { t: 'SECURITY', d: 'Cryptographic identity verified via multichain handshake.' }
                        ].filter(Boolean).map((log: any, i) => (
                            <div key={i} className="border-l-2 border-orange-600/30 pl-4 py-1">
                                <div className="text-[9px] font-black text-orange-500/70 mb-0.5">{log.t}</div>
                                <div className="text-[11px] font-bold text-stone-400 capitalize">{log.d}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileDashboard;
