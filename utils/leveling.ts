
import { formatUnits } from 'viem';

export interface LevelStats {
    kills: number;
    wins: number;
    gamesPlayed: number;
}

export interface PlayerLevelData {
    xp: number;
    level: number;
    rank: string;
    nextLevelXp: number;
    progressPercent: number;
}

const XP_PER_KILL = 100;
const XP_PER_WIN = 500;
const XP_PER_GAME = 50;

export const RANKS = [
    { minLevel: 1, title: 'RECRUIT', color: 'text-stone-400' },
    { minLevel: 5, title: 'OPERATOR', color: 'text-cyan-400' },
    { minLevel: 10, title: 'VETERAN', color: 'text-orange-500' },
    { minLevel: 20, title: 'ELITE', color: 'text-purple-500' },
    { minLevel: 50, title: 'LEGEND', color: 'text-yellow-500' },
];

export function calculateXP(stats: LevelStats): number {
    return (
        (Number(stats.kills) * XP_PER_KILL) +
        (Number(stats.wins) * XP_PER_WIN) +
        (Number(stats.gamesPlayed) * XP_PER_GAME)
    );
}

export function calculateLevelData(stats: LevelStats): PlayerLevelData {
    const xp = calculateXP(stats);

    // Formula: Level = sqrt(XP / 500) + 1
    // This means:
    // Lvl 1: 0 XP
    // Lvl 2: 500 XP
    // Lvl 3: 2000 XP
    // Lvl 4: 4500 XP
    const level = Math.floor(Math.sqrt(xp / 500)) + 1;

    // Calculate XP required for next level
    // Inverse: XP = (Level - 1)^2 * 500
    const currentLevelBaseXp = Math.pow(level - 1, 2) * 500;
    const nextLevelBaseXp = Math.pow(level, 2) * 500;
    const xpNeededForNext = nextLevelBaseXp - currentLevelBaseXp;
    const xpProgress = xp - currentLevelBaseXp;

    const progressPercent = Math.min(100, Math.max(0, (xpProgress / xpNeededForNext) * 100));

    // Determine Rank
    let rank = RANKS[0]; // Default
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (level >= RANKS[i].minLevel) {
            rank = RANKS[i];
            break;
        }
    }

    return {
        xp,
        level,
        rank: rank.title,
        nextLevelXp: nextLevelBaseXp,
        progressPercent
    };
}

export function getRankColor(level: number): string {
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (level >= RANKS[i].minLevel) {
            return RANKS[i].color;
        }
    }
    return RANKS[0].color;
}
