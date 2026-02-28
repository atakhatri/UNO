export const calculateLevelUpReward = (level: number): number => {
    // 1-10 levels -> 250 coins
    // 11-20 levels -> 500 coins
    // 21-30 -> 750 coins
    // Formula: Math.ceil(level / 10) * 250
    if (level < 1) return 0;
    return Math.ceil(level / 10) * 250;
};

export const calculateWinReward = (xpEarned: number): number => {
    // "give coins according to exp earned"
    // Using a 1:1 ratio as a baseline
    return xpEarned;
};