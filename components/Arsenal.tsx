
import React from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { CONTRACT_ADDRESSES } from '../utils/blockchain';
import { SKINS_ABI } from '../utils/transaction-calls';

type WeaponType = 'pistol' | 'smg' | 'shotgun' | 'railgun';
type Rarity = 'common' | 'rare' | 'legendary';

export default function Arsenal() {
    const { address } = useAccount();

    const { data: tokenIds, isLoading: listLoading } = useReadContract({
        address: CONTRACT_ADDRESSES.SKINS as `0x${string}`,
        abi: SKINS_ABI,
        functionName: 'tokensOfOwner',
        args: address ? [address as `0x${string}`] : undefined,
        query: { enabled: !!address },
    });

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="p-4 bg-stone-900/60 border border-stone-800 rounded-xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>
                <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span>🛡️</span> TACTICAL_ARSENAL
                </h3>
                <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">
                    Managed_Asset_Inventory // Base_Mainnet_Uplink
                </p>
            </div>

            {/* Inventory Display */}
            {!address ? (
                <div className="text-center p-12 bg-black/40 border border-dashed border-stone-800 rounded-xl">
                    <div className="text-4xl mb-4">📡</div>
                    <div className="text-sm font-black text-stone-600 uppercase">Awaiting_Neural_Link</div>
                    <p className="text-[10px] text-stone-700 mt-2 font-bold uppercase italic">Connect wallet to access your secure inventory</p>
                </div>
            ) : listLoading ? (
                <div className="flex flex-col items-center justify-center p-12 gap-4">
                    <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
                    <div className="text-[10px] font-black text-stone-500 uppercase animate-pulse">Scanning_Blockchain...</div>
                </div>
            ) : tokenIds && tokenIds.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                    {tokenIds.map(id => (
                        <SkinItem key={id.toString()} tokenId={id} />
                    ))}
                </div>
            ) : (
                <div className="text-center p-12 bg-black/40 border border-dashed border-stone-800 rounded-xl">
                    <div className="text-4xl mb-4">📦</div>
                    <div className="text-sm font-black text-stone-600 uppercase">Inventory_Empty</div>
                    <p className="text-[10px] text-stone-700 mt-2 font-bold uppercase italic">Use the forge above to mint your first tactical skin</p>
                </div>
            )}
        </div>
    );
}

function SkinItem({ tokenId }: { tokenId: bigint }) {
    const { data: metadata, isLoading } = useReadContract({
        address: CONTRACT_ADDRESSES.SKINS as `0x${string}`,
        abi: SKINS_ABI,
        functionName: 'getSkinMetadata',
        args: [tokenId],
    });

    if (isLoading || !metadata) return <div className="h-40 bg-stone-900/40 rounded-xl border border-stone-800 animate-pulse"></div>;

    const rarityColor = {
        common: 'text-stone-400',
        rare: 'text-cyan-400',
        legendary: 'text-orange-500',
    }[metadata.rarity.toLowerCase()] || 'text-white';

    return (
        <button className="tactical-panel bg-stone-900/40 border border-stone-800 p-4 rounded-xl text-left hover:border-white transition-all group active:scale-95">
            <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-black/60 rounded flex items-center justify-center text-2xl">
                    {metadata.weaponType === 'pistol' && '🔫'}
                    {metadata.weaponType === 'smg' && '⚔️'}
                    {metadata.weaponType === 'shotgun' && '🔥'}
                    {metadata.weaponType === 'railgun' && '⚡'}
                </div>
                <div className={`text-[8px] font-black uppercase tracking-widest ${rarityColor}`}>
                    {metadata.rarity}
                </div>
            </div>
            <div className="text-xs font-black text-white uppercase mb-1">{metadata.weaponType}_SKIN</div>
            <div className="flex justify-between items-center text-[10px] font-bold text-stone-500">
                <span>POWER_BOOST</span>
                <span className="text-orange-500">+{metadata.powerBoost.toString()}%</span>
            </div>
            <div className="mt-3 py-1.5 bg-white/5 rounded text-center text-[8px] font-black text-stone-600 group-hover:text-white transition-all uppercase">
                Equip_Asset
            </div>
        </button>
    );
}
