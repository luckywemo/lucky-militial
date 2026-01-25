import { useWriteContract, useReadContract, useAccount } from 'wagmi';
import { parseEther } from 'viem';
import { base } from 'wagmi/chains';

// IMPORTANT: Replace these with your deployed contract addresses on Base
export const CONTRACT_ADDRESSES = {
    REWARDS: '0x4D206ee1514ADB5a43c695e8674a99F722Fa4957',
    LEADERBOARD: '0x4D206ee1514ADB5a43c695e8674a99F722Fa4957',
    SKINS: '0x4D206ee1514ADB5a43c695e8674a99F722Fa4957',
};

// Simplified ABIs for the core functions we need
const REWARDS_ABI = [
    { name: 'recordKill', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'player', type: 'address' }], outputs: [] },
    { name: 'recordWin', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'player', type: 'address' }], outputs: [] },
    { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const;

const LEADERBOARD_ABI = [
    { name: 'updateStats', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'operator', type: 'address' }, { name: 'kills', type: 'uint256' }, { name: 'wins', type: 'uint256' }, { name: 'incrementGames', type: 'bool' }], outputs: [] },
    { name: 'getOperatorStats', type: 'function', stateMutability: 'view', inputs: [{ name: 'operator', type: 'address' }], outputs: [{ type: 'tuple', components: [{ name: 'kills', type: 'uint256' }, { name: 'wins', type: 'uint256' }, { name: 'gamesPlayed', type: 'uint256' }, { name: 'lastCombatTime', type: 'uint256' }] }] },
    { name: 'getOperatorCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
    { name: 'operators', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [{ type: 'address' }] },
] as const;

/**
 * Hook to record a kill on-chain (requires contract owner signature or authorized relayer)
 * Note: In a production game, these are usually called by a backend/relayer to prevent cheating.
 */
export function useBlockchainStats() {
    const { address } = useAccount();
    const { writeContractAsync } = useWriteContract();

    const recordKill = async (playerAddress: string) => {
        if (!address) return;
        return writeContractAsync({
            address: CONTRACT_ADDRESSES.REWARDS as `0x${string}`,
            abi: REWARDS_ABI,
            functionName: 'recordKill',
            args: [playerAddress as `0x${string}`],
            account: address,
            chain: base,
        });
    };

    const recordWin = async (playerAddress: string) => {
        if (!address) return;
        return writeContractAsync({
            address: CONTRACT_ADDRESSES.REWARDS as `0x${string}`,
            abi: REWARDS_ABI,
            functionName: 'recordWin',
            args: [playerAddress as `0x${string}`],
            account: address,
            chain: base,
        });
    };

    const syncStats = async (kills: number, wins: number) => {
        if (!address) return;
        return writeContractAsync({
            address: CONTRACT_ADDRESSES.LEADERBOARD as `0x${string}`,
            abi: LEADERBOARD_ABI,
            functionName: 'updateStats',
            args: [address as `0x${string}`, BigInt(kills), BigInt(wins), true],
            account: address,
            chain: base,
        });
    };

    return { recordKill, recordWin, syncStats };
}

/**
 * Hook to read player statistics from the blockchain
 */
export function usePlayerBlockchainData(address?: string) {
    return useReadContract({
        address: CONTRACT_ADDRESSES.LEADERBOARD as `0x${string}`,
        abi: LEADERBOARD_ABI,
        functionName: 'getOperatorStats',
        args: address ? [address as `0x${string}`] : undefined,
        query: {
            enabled: !!address,
        },
    });
}

/**
 * Hook to fetch all operator stats for the leaderboard
 */
export function useAllOperatorStats() {
    const { data: count } = useReadContract({
        address: CONTRACT_ADDRESSES.LEADERBOARD as `0x${string}`,
        abi: LEADERBOARD_ABI,
        functionName: 'getOperatorCount',
    });

    // In a production app, we would use an indexer or multicall.
    // Here we'll simplify and fetch the first few for the MVP leaderboard.
    const operatorIndices = Array.from({ length: Number(count || 0) }, (_, i) => BigInt(i));

    return {
        count: Number(count || 0),
        indices: operatorIndices
    };
}
