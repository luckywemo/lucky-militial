
import { http, createConfig } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { coinbaseWallet, metaMask } from 'wagmi/connectors';

export const config = createConfig({
    chains: [base, baseSepolia],
    connectors: [
        coinbaseWallet({ appName: 'Lucky Militia' }),
        metaMask()
    ],
    transports: {
        [base.id]: http(),
        [baseSepolia.id]: http(),
    },
});
