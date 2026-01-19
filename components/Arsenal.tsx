
import React, { useState } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { CONTRACT_ADDRESSES } from '../utils/blockchain';
import { Transaction, TransactionButton, TransactionStatus, TransactionStatusLabel, TransactionStatusAction } from '@coinbase/onchainkit/transaction';
import { createMintSkinCall, SKINS_ABI } from '../utils/transaction-calls';

type WeaponType = 'pistol' | 'smg' | 'shotgun' | 'railgun';
type Rarity = 'common' | 'rare' | 'legendary';

export default function Arsenal() {
    const { address } = useAccount();
    const [selectedWeapon, setSelectedWeapon] = useState<WeaponType>('pistol');
    const [selectedRarity, setSelectedRarity] = useState<Rarity>('common');

    const { data: tokenIds, isLoading: listLoading, refetch } = useReadContract({
        address: CONTRACT_ADDRESSES.SKINS as `0x${string}`,
        abi: SKINS_ABI,
        functionName: 'tokensOfOwner',
        args: address ? [address as `0x${string}`] : undefined,
        query: { enabled: !!address },
    });

    const mintCalls = address ? [createMintSkinCall(selectedWeapon, selectedRarity)] : [];

    const weaponOptions: { type: WeaponType; icon: string; label: string }[] = [
        { type: 'pistol', icon: '🔫', label: 'PISTOL' },
        { type: 'smg', icon: '⚔️', label: 'SMG' },
        { type: 'shotgun', icon: '🔥', label: 'SHOTGUN' },
        { type: 'railgun', icon: '⚡', label: 'RAILGUN' },
    ];

    const rarityOptions: { rarity: Rarity; label: string; color: string }[] = [
        { rarity: 'common', label: 'COMMON', color: 'text-stone-400' },
        { rarity: 'rare', label: 'RARE', color: 'text-cyan-400' },
        { rarity: 'legendary', label: 'LEGENDARY', color: 'text-orange-500' },
    ];

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

            {/* Mint Skin Section */}
            {address && (
                <div className="p-6 bg-gradient-to-br from-orange-500/10 to-cyan-500/10 border border-orange-500/30 rounded-xl">
                    <h4 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span>⚡</span> FORGE_NEW_SKIN
                    </h4>

                    {/* Weapon Selection */}
                    <div className="mb-4">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider mb-2 block">
                            Weapon_Type
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {weaponOptions.map(({ type, icon, label }) => (
                                <button
                                    key={type}
                                    onClick={() => setSelectedWeapon(type)}
                                    className={`p-3 rounded-lg border-2 transition-all ${selectedWeapon === type
                                        ? 'border-orange-500 bg-orange-500/20'
                                        : 'border-stone-700 bg-stone-900/40 hover:border-stone-600'
                                        }`}
                                >
                                    <div className="text-2xl mb-1">{icon}</div>
                                    <div className="text-[8px] font-black text-white">{label}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Rarity Selection */}
                    <div className="mb-4">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider mb-2 block">
                            Rarity_Class
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {rarityOptions.map(({ rarity, label, color }) => (
                                <button
                                    key={rarity}
                                    onClick={() => setSelectedRarity(rarity)}
                                    className={`p-2 rounded-lg border-2 transition-all ${selectedRarity === rarity
                                        ? 'border-orange-500 bg-orange-500/20'
                                        : 'border-stone-700 bg-stone-900/40 hover:border-stone-600'
                                        }`}
                                >
                                    <div className={`text-[10px] font-black ${color}`}>{label}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Transaction Component */}
                    <Transaction
                        chainId={8453}
                        calls={mintCalls}
                        onSuccess={() => {
                            refetch();
                        }}
                    >
                        <TransactionButton className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-3 px-6 rounded-lg shadow-[0_0_20px_rgba(249,115,22,0.4)] border border-white/20 transition-all uppercase tracking-widest text-xs" />
                        <TransactionStatus>
                            <TransactionStatusLabel />
                            <TransactionStatusAction />
                        </TransactionStatus>
                    </Transaction>
                </div>
            )}

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
