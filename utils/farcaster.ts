import { sdk } from '@farcaster/miniapp-sdk';

/**
 * Farcaster MiniApp SDK utilities
 * Provides context detection, authentication, and social features
 */

/**
 * Check if the app is running inside a Farcaster client
 */
export const isInFarcaster = (): boolean => {
    // Basic check for environment, more reliable checks can be done via sdk.context resolution
    return typeof window !== 'undefined' && (
        !!(window as any).ReactNativeWebView ||
        window.location.search.includes('farcaster') ||
        !!sdk.context
    );
};

/**
 * Initialize Farcaster SDK and signal app is ready
 * IMPORTANT: Must be called after app loads to hide splash screen
 */
export const initializeFarcaster = async (): Promise<void> => {
    if (isInFarcaster()) {
        try {
            await sdk.actions.ready();
            console.log('[Farcaster] SDK initialized successfully');
        } catch (error) {
            console.error('[Farcaster] Failed to initialize:', error);
        }
    }
};

/**
 * Get the current Farcaster user context (async as it's a promise in SDK v0.2+)
 */
export const getFarcasterUser = async () => {
    if (!isInFarcaster()) return null;
    try {
        const context = await sdk.context;
        return context?.user || null;
    } catch {
        return null;
    }
};

/**
 * Get Farcaster user's display name
 */
export const getFarcasterDisplayName = async (): Promise<string | null> => {
    // 1. Check for mock name in URL
    if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const mockName = params.get('fname') || params.get('name');
        if (mockName) return mockName;
    }

    const user = await getFarcasterUser();
    if (!user) return null;
    return user.displayName || user.username || null;
};

/**
 * Get Farcaster user's username
 */
export const getFarcasterUsername = async (): Promise<string | null> => {
    const user = await getFarcasterUser();
    if (!user) return null;
    return user.username || null;
};

/**
 * Get Farcaster user's FID (Farcaster ID)
 */
export const getFarcasterFid = async (): Promise<number | null> => {
    // 1. Check for mock FID in URL (for development testing)
    if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const mockFid = params.get('fid');
        if (mockFid) return parseInt(mockFid, 10);
    }

    const user = await getFarcasterUser();
    if (!user) return null;
    return user.fid || null;
};

/**
 * Get Farcaster user's profile picture URL
 */
export const getFarcasterPfpUrl = async (): Promise<string | null> => {
    const user = await getFarcasterUser();
    if (!user) return null;
    return user.pfpUrl || null;
};

/**
 * Share content to Farcaster feed
 * Opens the cast composer with pre-filled content
 */
export const shareToFarcaster = async (options: {
    text: string;
    embeds?: string[];
}): Promise<void> => {
    if (!isInFarcaster()) {
        console.warn('[Farcaster] Cannot share: not in Farcaster context');
        return;
    }

    try {
        const embeds = options.embeds || [];
        await sdk.actions.composeCast({
            text: options.text,
            embeds: embeds.length === 0 ? [] : embeds.length === 1 ? [embeds[0]] : [embeds[0], embeds[1]] as [string, string],
        });
        console.log('[Farcaster] Composer opened successfully');
    } catch (error) {
        console.error('[Farcaster] Failed to open composer:', error);
    }
};

/**
 * Share game achievement to Farcaster
 */
export const shareAchievement = async (achievement: {
    title: string;
    description: string;
    gameUrl?: string;
}): Promise<void> => {
    const text = `🎮 ${achievement.title}\n\n${achievement.description}\n\nPlay Lucky Militia on Base!`;
    const embeds = achievement.gameUrl ? [achievement.gameUrl] : [];

    await shareToFarcaster({ text, embeds });
};

/**
 * Share mission completion
 */
export const shareMissionComplete = async (missionName: string, kills: number): Promise<void> => {
    await shareAchievement({
        title: `Mission Complete: ${missionName}`,
        description: `Eliminated ${kills} targets in tactical combat!`,
        gameUrl: window.location.origin,
    });
};

/**
 * Share multiplayer victory
 */
export const shareMultiplayerVictory = async (mode: string, score: number): Promise<void> => {
    await shareAchievement({
        title: `Victory in ${mode}!`,
        description: `Dominated the battlefield with ${score} points!`,
        gameUrl: window.location.origin,
    });
};

/**
 * Invite friends to multiplayer room
 */
export const inviteToMultiplayer = async (roomCode: string): Promise<void> => {
    const text = `🎖️ Join my Lucky Militia squad!\n\nRoom Code: ${roomCode}\n\nLet's dominate the battlefield together!`;

    await shareToFarcaster({
        text,
        embeds: [window.location.origin],
    });
};

/**
 * Share leaderboard position
 */
export const shareLeaderboardRank = async (rank: number, kills: number, wins: number): Promise<void> => {
    await shareAchievement({
        title: `Ranked #${rank} on the Leaderboard!`,
        description: `${kills} kills • ${wins} wins\n\nCan you beat my score?`,
        gameUrl: window.location.origin,
    });
};

/**
 * Get Farcaster context information
 */
export const getFarcasterContext = async () => {
    if (!isInFarcaster()) return null;
    return await sdk.context;
};

/**
 * Get Farcaster user's custody address (using the injected EIP-1193 provider)
 */
export const getFarcasterCustodyAddress = async (): Promise<string | null> => {
    if (!isInFarcaster()) return null;
    try {
        const provider = sdk.wallet?.ethProvider;
        if (!provider) return null;

        const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[];
        return accounts && accounts.length > 0 ? accounts[0] : null;
    } catch (error) {
        console.error('[Farcaster] Failed to get custody address:', error);
        return null;
    }
};

/**
 * Get Farcaster user's verified addresses (wallets linked to the Farcaster account)
 */
export const getFarcasterVerifiedAddresses = async (): Promise<string[]> => {
    // Verified addresses might not be directly available in the basic user context
    // We can fetch them via a backend API using the FID if needed, 
    // but for "direct connection", the custody address from ethProvider is best.
    return [];
};

/**
 * Check if user has specific Farcaster capabilities
 */
export const hasFarcasterCapability = (capability: string): boolean => {
    if (!isInFarcaster()) return false;
    // Add capability checks as needed
    return true;
};
