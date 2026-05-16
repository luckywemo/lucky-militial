export function usePlayerIdentity(address?: string | null, playerName?: string) {
  return {
    name: playerName || (address ? `OP_${address.slice(0, 4)}` : "OPERATOR"),
    isVerified: !!address
  };
}
