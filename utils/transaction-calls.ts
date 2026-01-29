import { ContractFunctionParameters } from 'viem';
import { CONTRACT_ADDRESS, LMT_TOKEN_ID } from './blockchain';

// Full ABIs for transaction calls
export const LUCKY_MILITIA_ABI = [
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
    {
        type: 'function',
        name: 'mintSkin',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'to', type: 'address' },
            { name: 'weaponType', type: 'string' },
            { name: 'rarity', type: 'string' },
            { name: 'powerBoost', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'balanceOf',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }, { name: 'id', type: 'uint256' }],
        outputs: [{ name: '', type: 'uint256' }],
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
        address: CONTRACT_ADDRESS,
        abi: LUCKY_MILITIA_ABI,
        functionName: 'recordKill',
        args: [playerAddress],
    };
}

/**
 * Create a transaction call to record a win
 */
export function createRecordWinCall(playerAddress: `0x${string}`): TransactionCall {
    return {
        address: CONTRACT_ADDRESS,
        abi: LUCKY_MILITIA_ABI,
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
        address: CONTRACT_ADDRESS,
        abi: LUCKY_MILITIA_ABI,
        functionName: 'updateStats',
        args: [operatorAddress, BigInt(kills), BigInt(wins), incrementGames],
    };
}

/**
 * Create a transaction call to mint a weapon skin
 */
export function createMintSkinCall(
    to: `0x${string}`,
    weaponType: 'pistol' | 'smg' | 'shotgun' | 'railgun',
    rarity: 'common' | 'rare' | 'legendary'
): TransactionCall {
    // Determine power boost based on rarity (example logic)
    const powerBoost = rarity === 'legendary' ? 50 : rarity === 'rare' ? 25 : 10;

    return {
        address: CONTRACT_ADDRESS,
        abi: LUCKY_MILITIA_ABI,
        functionName: 'mintSkin',
        args: [to, weaponType, rarity, BigInt(powerBoost)],
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

    // Note: We might want explicit kill recording too if the contract logic requires it separate from updateStats
    if (kills > 0) {
        // Optimally, recordKill handles bulk or we iterate. 
        // Current contract is per-kill. If we kill 5 ppl, do we call it 5 times? 
        // For efficiency, updateStats updates the count. recordKill mints rewards.
        // Let's assume recordKill is for per-kill reward minting event.
        // For batching, this might be gas-heavy. 
    }

    return calls;
}
