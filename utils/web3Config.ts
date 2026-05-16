import { createConfig } from '@0xsequence/kit';
import { base } from 'wagmi/chains';

export const sequenceAccessKey = import.meta.env.VITE_SEQUENCE_ACCESS_KEY || '';

// Base Mainnet chain ID = 8453
const BASE_MAINNET_CHAIN_ID = 8453;

// Sequence Kit createConfig returns { wagmiConfig, kitConfig }
const sequenceKit = createConfig('universal', {
  projectAccessKey: sequenceAccessKey,
  appName: 'Lucky Militia',
  chainIds: [BASE_MAINNET_CHAIN_ID],
  defaultTheme: 'dark',
});

// Wagmi config for WagmiProvider
export const config = sequenceKit.wagmiConfig;

// Kit config for KitProvider
export const kitConfig = sequenceKit.kitConfig;

// Contract address on Base Mainnet
export const MILITIA_CONTRACT_ADDRESS = import.meta.env.VITE_MILITIA_CONTRACT_ADDRESS || '0xa3e2975697a80485adfdef1d4a7322774d183f16';

// Active chain for contract calls
export const activeChain = base;

// Export active chain ID for legacy components
export const ACTIVE_CHAIN_ID = BASE_MAINNET_CHAIN_ID;
