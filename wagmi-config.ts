
import { http, createConfig } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { coinbaseWallet, walletConnect, injected } from 'wagmi/connectors';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';

export const config = createConfig({
    chains: [base, baseSepolia],
    connectors: [
        farcasterMiniApp(),
        coinbaseWallet({
            appName: 'Lucky Militia',
            preference: 'smartWalletOnly', // Forces embedded Smart Wallet to keep user in-frame
            version: '4',
        }),
        /*
        walletConnect({
            projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo',
            metadata: {
                name: 'Lucky Militia',
                description: 'Tactical combat game on Base',
                url: 'https://luckymilitia.com',
                icons: ['https://luckymilitia.com/icon.png']
            },
            showQrModal: true
        }),
        */
        injected({
            target: 'metaMask'
        }),
        injected({
            target() {
                return {
                    id: 'injected',
                    name: 'Browser Wallet',
                    provider: typeof window !== 'undefined' ? window.ethereum : undefined
                }
            }
        })
    ],
    transports: {
        [base.id]: http(),
        [baseSepolia.id]: http(),
    },
    multiInjectedProviderDiscovery: false,
});
