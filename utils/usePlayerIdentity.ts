import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';
import { useName } from '@coinbase/onchainkit/identity';

/**
 * Hook to get player display name with priority:
 * 1. Basename (e.g., player.base.eth)
 * 2. ENS (e.g., player.eth)
 * 3. Farcaster username (future integration)
 * 4. Random operator ID
 */
export function usePlayerIdentity() {
    const { address } = useAccount();
    const { data: nameData, isLoading } = useName({ address: address as `0x${string}` });
    const [fallbackId] = useState(() => `OPERATOR_${Math.floor(Math.random() * 9999)}`);

    const displayName = nameData || fallbackId;

    return {
        displayName,
        isLoading,
        hasIdentity: !!nameData,
        address,
    };
}
