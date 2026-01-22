import { sdk } from '@farcaster/miniapp-sdk';

/**
 * Farcaster MiniApp SDK utilities
 * Provides context detection, authentication, and social features
 */

/**
 * Check if the app is running inside a Farcaster client
 */
export const isInFarcaster = (): boolean => {
    try {
        return sdk.context !== null && sdk.context !== undefined;
    } catch {
        return false;
    }
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
 * Get the current Farcaster user context
 */
export const getFarcasterUser = () => {
    if (!isInFarcaster()) return null;
    return sdk.context?.user || null;
};

/**
 * Get Farcaster user's display name
 */
export const getFarcasterDisplayName = (): string | null => {
    const user = getFarcasterUser();
    if (!user) return null;
    return user.displayName || user.username || null;
};

/**
 * Get Farcaster user's username
 */
export const getFarcasterUsername = (): string | null => {
    const user = getFarcasterUser();
    if (!user) return null;
    return user.username || null;
};

/**
 * Get Farcaster user's FID (Farcaster ID)
 */
export const getFarcasterFid = (): number | null => {
    const user = getFarcasterUser();
    if (!user) return null;
    return user.fid || null;
};

/**
 * Get Farcaster user's profile picture URL
 */
export const getFarcasterPfpUrl = (): string | null => {
    const user = getFarcasterUser();
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
        await sdk.actions.openComposer({
            text: options.text,
            embeds: options.embeds,
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
export const getFarcasterContext = () => {
    if (!isInFarcaster()) return null;
    return sdk.context;
};

/**
 * Get Farcaster user's custody address (the address that owns the FID)
 */
export const getFarcasterCustodyAddress = (): string | null => {
    return sdk.context?.user?.custodyAddress || null;
};

/**
 * Get Farcaster user's verified addresses (wallets linked to the Farcaster account)
 */
export const getFarcasterVerifiedAddresses = (): string[] => {
    return sdk.context?.user?.verifiedAddresses?.ethAddresses || [];
};

/**
 * Check if user has specific Farcaster capabilities
 */
export const hasFarcasterCapability = (capability: string): boolean => {
    if (!isInFarcaster()) return false;
    // Add capability checks as needed
    return true;
};
