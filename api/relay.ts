
import { redis, K } from '../utils/redis';
import { createWalletClient, createPublicClient, http, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

/**
 * Server-side relay for Base contract writes.
 * 
 * Signs and broadcasts REAL transactions using the deployer key.
 * The deployer is the contract owner, so it passes the access control check.
 * 
 * WHY: Sequence embedded wallets (email login) are smart contract wallets.
 * The LuckyMilitiaStats contract checks `tx.origin == msg.sender` for auth,
 * which fails for AA wallets. This relay uses the deployer key (contract owner).
 */

const MILITIA_CONTRACT = (process.env.VITE_MILITIA_CONTRACT_ADDRESS || '0xa3e2975697a80485adfdef1d4a7322774d183f16') as `0x${string}`;
const EVM_PRIVATE_KEY = process.env.EVM_PRIVATE_KEY;
const BASE_RPC = process.env.VITE_BASE_MAINNET_RPC || 'https://mainnet.base.org';

// ABI for the two write functions
const MILITIA_ABI = [
  {
    name: 'registerPlayer',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
    inputs: [
      { name: 'player', type: 'address' as const },
      { name: 'username', type: 'string' as const },
    ],
    outputs: [],
  },
  {
    name: 'recordMatchResult',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
    inputs: [
      { name: 'player', type: 'address' as const },
      { name: 'kills', type: 'uint256' as const },
      { name: 'wins', type: 'uint256' as const },
      { name: 'mode', type: 'string' as const },
    ],
    outputs: [],
  },
] as const;

export const config = {
    runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  if (!EVM_PRIVATE_KEY) {
    console.error('[Relay] EVM_PRIVATE_KEY not configured');
    return new Response(JSON.stringify({ error: 'Server relay not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { action, player, username, kills, wins, mode } = body;

    if (!action || !player) {
      return new Response(JSON.stringify({ error: 'Missing action or player' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create viem clients with deployer key
    const account = privateKeyToAccount(`0x${EVM_PRIVATE_KEY.replace('0x', '')}` as `0x${string}`);
    
    const publicClient = createPublicClient({
      chain: base,
      transport: http(BASE_RPC),
    });

    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(BASE_RPC),
    });

    let hash: string;

    if (action === 'register') {
      if (!username) {
        return new Response(JSON.stringify({ error: 'Missing username' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      try {
        // Simulate first to catch reverts (e.g., ALREADY_REGISTERED)
        await publicClient.simulateContract({
          address: MILITIA_CONTRACT,
          abi: MILITIA_ABI,
          functionName: 'registerPlayer',
          args: [player as `0x${string}`, username],
          account,
        });

        // Send the real transaction
        hash = await walletClient.writeContract({
          address: MILITIA_CONTRACT,
          abi: MILITIA_ABI,
          functionName: 'registerPlayer',
          args: [player as `0x${string}`, username],
          gas: 200000n,
          chain: base, // Explicitly provide chain to satisfy TS
        });

        console.log(`[Relay] ✅ registerPlayer TX sent! Hash: ${hash}`);

      } catch (err: any) {
        const msg = err?.message || '';
        if (msg.includes('ALREADY_REGISTERED')) {
          console.log(`[Relay] Player ${player} already registered on-chain.`);
          return new Response(JSON.stringify({ 
            success: true, hash: null, 
            note: 'Already registered on-chain' 
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
        throw err;
      }

    } else if (action === 'recordMatch') {
      const k = kills || 0;
      const w = wins || 0;
      const m = mode || 'pve';

      try {
        // Simulate first
        await publicClient.simulateContract({
          address: MILITIA_CONTRACT,
          abi: MILITIA_ABI,
          functionName: 'recordMatchResult',
          args: [player as `0x${string}`, BigInt(k), BigInt(w), m],
          account,
        });

        // Send the real transaction
        hash = await walletClient.writeContract({
          address: MILITIA_CONTRACT,
          abi: MILITIA_ABI,
          functionName: 'recordMatchResult',
          args: [player as `0x${string}`, BigInt(k), BigInt(w), m],
          gas: 250000n,
          chain: base,
        });

        console.log(`[Relay] ✅ recordMatchResult TX sent! Hash: ${hash} | K:${k} W:${w} M:${m}`);

      } catch (err: any) {
        const msg = err?.message || '';
        if (msg.includes('PLAYER_NOT_REGISTERED')) {
          // Auto-register first, then record
          console.log(`[Relay] Player not registered, auto-registering...`);
          const regUsername = username || `OP_${player.slice(0, 6)}`;
          
          const regHash = await walletClient.writeContract({
            address: MILITIA_CONTRACT,
            abi: MILITIA_ABI,
            functionName: 'registerPlayer',
            args: [player as `0x${string}`, regUsername],
            gas: 200000n,
            chain: base,
          });
          console.log(`[Relay] Auto-registered: ${regHash}`);

          // Wait for registration to be mined
          await publicClient.waitForTransactionReceipt({ hash: regHash });

          // Now record the match
          hash = await walletClient.writeContract({
            address: MILITIA_CONTRACT,
            abi: MILITIA_ABI,
            functionName: 'recordMatchResult',
            args: [player as `0x${string}`, BigInt(k), BigInt(w), m],
            gas: 250000n,
            chain: base,
          });
          console.log(`[Relay] ✅ recordMatchResult TX sent after auto-register! Hash: ${hash}`);
        } else {
          throw err;
        }
      }

    } else {
      return new Response(JSON.stringify({ error: 'Unknown action' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Also update Redis for instant leaderboard
    const now = new Date();
    const ymd = now.toISOString().split('T')[0].replace(/-/g, '');

    if (action === 'register' && username) {
      const pipeline = redis.pipeline();
      const periods = ['alltime', `daily:${ymd}`, `monthly:${ymd.substring(0, 6)}`];
      for (const p of periods) {
        pipeline.zadd(K.LB_SCORE(p), { nx: true }, 0, player);
        pipeline.hset(K.STATS_HASH(p, player), { username, registered: Date.now() });
      }
      await pipeline.exec();
    }

    return new Response(JSON.stringify({ 
      success: true, 
      hash,
      explorer: `https://basescan.org/tx/${hash}`,
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e: any) {
    console.error('[Relay] Error:', e?.message || e);
    return new Response(JSON.stringify({ error: e?.message || 'Relay failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
