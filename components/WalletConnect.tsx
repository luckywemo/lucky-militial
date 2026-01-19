
import React from 'react';
import { ConnectWallet, Wallet } from '@coinbase/onchainkit/wallet';
import {
    Address,
    Avatar,
    Name,
    Identity,
    EthBalance
} from '@coinbase/onchainkit/identity';
import { useAccount } from 'wagmi';

export default function WalletConnect() {
    const { isConnected, address } = useAccount();

    return (
        <div className="fixed top-4 right-4 z-[60] flex items-center gap-4">
            <Wallet>
                <ConnectWallet className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg shadow-[0_0_20px_rgba(249,115,22,0.4)] border border-white/20 transition-all uppercase tracking-widest text-[10px] lg:text-xs">
                    <Avatar className="h-6 w-6" />
                    <Name />
                </ConnectWallet>
            </Wallet>

            {isConnected && address && (
                <div className="hidden lg:flex flex-col items-end bg-black/60 backdrop-blur-md border border-stone-800 p-2 rounded-lg">
                    <EthBalance address={address} className="text-cyan-400 text-[10px] font-bold" />
                </div>
            )}
        </div>
    );
}
