import { ContractFunctionParameters } from 'viem';
import { CONTRACT_ADDRESSES } from './blockchain';

// Full ABIs for transaction calls
export const REWARDS_ABI = [
    {
        type: 'function',
        name: 'recordKill',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'player', type: 'address' }],
        outputs: [],
    },
    {
        type: 'function',
        name: 'recordWin',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'player', type: 'address' }],
        outputs: [],
    },
] as const;

export const LEADERBOARD_ABI = [
    {
        type: 'function',
        name: 'updateStats',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'operator', type: 'address' },
            { name: 'kills', type: 'uint256' },
            { name: 'wins', type: 'uint256' },
            { name: 'incrementGames', type: 'bool' },
        ],
        outputs: [],
    },
] as const;

export const SKINS_ABI = [
    {
        type: 'function',
        name: 'mintSkin',
        stateMutability: 'payable',
        inputs: [
            { name: 'weaponType', type: 'string' },
            { name: 'rarity', type: 'string' },
        ],
        outputs: [{ name: 'tokenId', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'tokensOfOwner',
        stateMutability: 'view',
        inputs: [{ name: 'owner', type: 'address' }],
        outputs: [{ name: '', type: 'uint256[]' }],
    },
    {
        type: 'function',
        name: 'getSkinMetadata',
        stateMutability: 'view',
        inputs: [{ name: 'tokenId', type: 'uint256' }],
        outputs: [
            {
                name: '',
                type: 'tuple',
                components: [
                    { name: 'weaponType', type: 'string' },
                    { name: 'rarity', type: 'string' },
                    { name: 'powerBoost', type: 'uint256' },
                ],
            },
        ],
    },
] as const;

/**
 * Transaction call builders for OnchainKit Transaction component
 * These return the format expected by OnchainKit's Transaction component
 */

export interface TransactionCall {
    address: `0x${string}`;
    abi: any;
    functionName: string;
    args?: any[];
    value?: bigint;
}

/**
 * Create a transaction call to record a kill
 */
export function createRecordKillCall(playerAddress: `0x${string}`): TransactionCall {
    return {
        address: CONTRACT_ADDRESSES.REWARDS as `0x${string}`,
        abi: REWARDS_ABI,
        functionName: 'recordKill',
        args: [playerAddress],
    };
}

/**
 * Create a transaction call to record a win
 */
export function createRecordWinCall(playerAddress: `0x${string}`): TransactionCall {
    return {
        address: CONTRACT_ADDRESSES.REWARDS as `0x${string}`,
        abi: REWARDS_ABI,
        functionName: 'recordWin',
        args: [playerAddress],
    };
}

/**
 * Create a transaction call to sync leaderboard stats
 */
export function createSyncStatsCall(
    operatorAddress: `0x${string}`,
    kills: number,
    wins: number,
    incrementGames: boolean = true
): TransactionCall {
    return {
        address: CONTRACT_ADDRESSES.LEADERBOARD as `0x${string}`,
        abi: LEADERBOARD_ABI,
        functionName: 'updateStats',
        args: [operatorAddress, BigInt(kills), BigInt(wins), incrementGames],
    };
}

/**
 * Create a transaction call to mint a weapon skin
 */
export function createMintSkinCall(
    weaponType: 'pistol' | 'smg' | 'shotgun' | 'railgun',
    rarity: 'common' | 'rare' | 'legendary'
): TransactionCall {
    return {
        address: CONTRACT_ADDRESSES.SKINS as `0x${string}`,
        abi: SKINS_ABI,
        functionName: 'mintSkin',
        args: [weaponType, rarity],
        // Add value if minting requires payment
        // value: parseEther('0.001'),
    };
}

/**
 * Batch transaction calls - useful for recording multiple actions at once
 */
export function createBatchGameResultCalls(
    playerAddress: `0x${string}`,
    kills: number,
    didWin: boolean
): TransactionCall[] {
    const calls: TransactionCall[] = [];

    // Add sync stats call
    calls.push(createSyncStatsCall(playerAddress, kills, didWin ? 1 : 0, true));

    // Add record win call if player won
    if (didWin) {
        calls.push(createRecordWinCall(playerAddress));
    }

    return calls;
}
