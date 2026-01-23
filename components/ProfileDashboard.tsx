
import React from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { CONTRACT_ADDRESSES } from '../utils/blockchain';
import { getFarcasterUser, getFarcasterPfpUrl, isInFarcaster } from '../utils/farcaster';
import { formatUnits } from 'viem';

interface ProfileDashboardProps {
    playerName: string;
    activeAddress?: string;
    isVerified?: boolean;
}

const ProfileDashboard: React.FC<ProfileDashboardProps> = ({ playerName, activeAddress, isVerified }) => {
    const [farcasterUser, setFarcasterUser] = React.useState<any>(null);
    const [pfp, setPfp] = React.useState<string | null>(null);

    React.useEffect(() => {
        const loadFarcasterData = async () => {
            if (isInFarcaster()) {
                const user = await getFarcasterUser();
                const pfpUrl = await getFarcasterPfpUrl();
                setFarcasterUser(user);
                setPfp(pfpUrl);
            }
        };
        loadFarcasterData();
    }, []);

    const address = activeAddress;

    // Fetch LMT Balance
    const { data: lmtBalance } = useReadContract({
        address: CONTRACT_ADDRESSES.REWARDS as `0x${string}`,
        abi: [{ name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] }] as const,
        functionName: 'balanceOf',
        args: address ? [address as `0x${string}`] : undefined,
        query: { enabled: !!address && CONTRACT_ADDRESSES.REWARDS !== '0x0000000000000000000000000000000000000000' },
    });

    // Fetch Stats (Mocked or from Leaderboard contract if deployed)
    const stats = {
        kills: 0,
        wins: 0,
        gamesPlayed: 0
    };

    const formattedBalance = lmtBalance ? parseFloat(formatUnits(lmtBalance, 18)).toLocaleString() : '0';

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
                    <div className="absolute -bottom-2 -right-2 bg-orange-600 px-2 py-0.5 rounded text-[8px] font-black font-stencil tracking-widest text-white shadow-xl">LVL_1</div>
                </div>

                <div className="text-center sm:text-left flex-1 min-w-0">
                    <div className="flex items-center justify-center sm:justify-start gap-3 mb-1">
                        <h2 className="text-2xl lg:text-4xl font-black text-white truncate uppercase tracking-tight">{playerName}</h2>
                        {farcasterUser && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${isVerified ? 'bg-green-600/20 text-green-400 border-green-500/30' : 'bg-purple-600/20 text-purple-400 border-purple-500/30'}`}>
                                🟣 {isVerified ? 'VERIFIED' : 'FARCASTER'}
                            </span>
                        )}
                    </div>
                    <p className="text-stone-500 text-xs lg:text-sm font-bold truncate opacity-80 mb-4">{address || 'OPERATOR_NOT_LINKED'}</p>

                    <div className="flex flex-wrap justify-center sm:justify-start gap-2 lg:gap-4">
                        <div className="px-3 py-1 bg-black/40 border border-stone-800 rounded text-[10px] text-stone-400 font-black uppercase">
                            CLASS: <span className="text-orange-500">STRIKER</span>
                        </div>
                        <div className="px-3 py-1 bg-black/40 border border-stone-800 rounded text-[10px] text-stone-400 font-black uppercase">
                            RANK: <span className="text-cyan-400">RECRUIT</span>
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
                        <span className="text-[10px] text-orange-500/50 font-bold tracking-widest">LIVE_FEED</span>
                    </h3>
                    <div className="space-y-4">
                        {[
                            { t: 'BOOT_UP', d: 'Operator recognized. System status: GREEN.' },
                            { t: 'WALLET_SYNC', d: 'Primary wallet address verified on Base chain.' },
                            { t: 'SECURITY', d: 'Farcaster identity confirmed. SDK Ready.' },
                            isVerified && { t: 'QUICK_AUTH', d: 'Cryptographic identity verified via Farcaster JWT.' }
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
