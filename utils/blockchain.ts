import { useWriteContract, useReadContract, useAccount } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';

// Unified Contract Address
export const CONTRACT_ADDRESS = (import.meta.env.VITE_HUB_ADDRESS || import.meta.env.VITE_REWARDS_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;

// Target network from environment variable
export const TARGET_CHAIN = import.meta.env.VITE_NETWORK === 'base' ? base : baseSepolia;

// Unified ABI for LuckyMilitia (ERC1155 + Game Logic)
const LUCKY_MILITIA_ABI = [
    // Game Logic
    { name: 'recordKill', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'player', type: 'address' }], outputs: [] },
    { name: 'recordWin', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'player', type: 'address' }], outputs: [] },
    { name: 'updateStats', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'operator', type: 'address' }, { name: 'kills', type: 'uint256' }, { name: 'wins', type: 'uint256' }, { name: 'incrementGames', type: 'bool' }], outputs: [] },
    // View Logic (Leaderboard)
    { name: 'getOperatorStats', type: 'function', stateMutability: 'view', inputs: [{ name: 'operator', type: 'address' }], outputs: [{ type: 'tuple', components: [{ name: 'kills', type: 'uint256' }, { name: 'wins', type: 'uint256' }, { name: 'gamesPlayed', type: 'uint256' }, { name: 'lastCombatTime', type: 'uint256' }] }] },
    { name: 'getOperatorCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
    // ERC1155 Logic (Currency & Skins)
    { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }, { name: 'id', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
    { name: 'mintSkin', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'weaponType', type: 'string' }, { name: 'rarity', type: 'string' }, { name: 'powerBoost', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
] as const;

export const LMT_TOKEN_ID = 0n;

/**
 * Hook to record actions on-chain
 */
export function useBlockchainStats() {
    const { address } = useAccount();
    const { writeContractAsync } = useWriteContract();

    const recordKill = async (playerAddress: string) => {
        if (!address) return;
        return writeContractAsync({
            address: CONTRACT_ADDRESS,
            abi: LUCKY_MILITIA_ABI,
            functionName: 'recordKill',
            args: [playerAddress as `0x${string}`],
            account: address,
            chain: TARGET_CHAIN,
        });
    };

    const recordWin = async (playerAddress: string) => {
        if (!address) return;
        return writeContractAsync({
            address: CONTRACT_ADDRESS,
            abi: LUCKY_MILITIA_ABI,
            functionName: 'recordWin',
            args: [playerAddress as `0x${string}`],
            account: address,
            chain: TARGET_CHAIN,
        });
    };

    const syncStats = async (kills: number, wins: number) => {
        if (!address) return;
        return writeContractAsync({
            address: CONTRACT_ADDRESS,
            abi: LUCKY_MILITIA_ABI,
            functionName: 'updateStats',
            args: [address as `0x${string}`, BigInt(kills), BigInt(wins), true],
            account: address,
            chain: TARGET_CHAIN,
        });
    };

    return { recordKill, recordWin, syncStats };
}

/**
 * Hook to read player statistics from the blockchain
 */
export function usePlayerBlockchainData(address?: string) {
    // Read Stats
    const statsQuery = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: LUCKY_MILITIA_ABI,
        functionName: 'getOperatorStats',
        args: address ? [address as `0x${string}`] : undefined,
        query: { enabled: !!address },
    });

    // Read LMT Balance (ID 0)
    const balanceQuery = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: LUCKY_MILITIA_ABI,
        functionName: 'balanceOf',
        args: address ? [address as `0x${string}`, LMT_TOKEN_ID] : undefined,
        query: { enabled: !!address },
    });

    return {
        stats: statsQuery.data,
        lmtBalance: balanceQuery.data,
        isLoading: statsQuery.isLoading || balanceQuery.isLoading
    };
}

/**
 * Hook to fetch all operator stats for the leaderboard
 */
export function useAllOperatorStats() {
    const { data: count } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: LUCKY_MILITIA_ABI,
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
