export interface LevelDef {
    level: number;
    requiredXp: number;
}

export const MAX_LEVEL = 100;

const calculateXpForLevel = (level: number): number => {
    if (level <= 1) return 0;
    // Using a power curve for XP. Starts slower, gets much harder.
    // XP for level 10 is ~2,145. For level 100 is ~600k.
    const base = 150;
    const exponent = 1.2;
    return Math.floor(base * Math.pow(level - 1, exponent));
};

export const LEVEL_DEFINITIONS: LevelDef[] = Array.from({ length: MAX_LEVEL }, (_, i) => {
    const level = i + 1;
    return {
        level: level,
        requiredXp: calculateXpForLevel(level),
    };
});

export const getCurrentLevel = (xp: number): number => {
    if (xp <= 0) return 1;
    // Find the highest level the user has unlocked
    const currentLevel = LEVEL_DEFINITIONS.slice().reverse().find(def => xp >= def.requiredXp);
    return currentLevel ? currentLevel.level : 1;
};