import {
    Crown, Zap, RotateCcw, Copy, Users, Ban, Flame, Image as ImageIcon,
    AlertCircle, Bomb, Swords, Palette, Slash, Shield, Hammer, Octagon, Frown,
    BanIcon
} from 'lucide-react';
import { increment, updateDoc } from 'firebase/firestore';
import { getUserDocRef } from './firebase';

export interface AchievementDef {
    id: string;
    title: string;
    description: string;
    tier: 'bronze' | 'silver' | 'gold' | 'prestigious';
    icon: any; // Lucide icon component
    maxProgress: number; // e.g., 10 wins
    points: number;
    image?: string; // Optional custom PNG path
    coins: number;
}

export const ACHIEVEMENTS_LIST: AchievementDef[] = [
    // --- WINNING ---
    {
        id: 'conq-1',
        title: 'Conqueror I',
        description: 'Win 10 matches.',
        tier: 'bronze',
        icon: Crown,
        maxProgress: 10,
        points: 50,
        coins: 100,

    },
    {
        id: 'conq-2',
        title: 'Conqueror II',
        description: 'Win 50 matches.',
        tier: 'silver',
        icon: Crown,
        maxProgress: 50,
        points: 250,
        coins: 500,
    },
    {
        id: 'conq-3',
        title: 'Conqueror III',
        description: 'Win 100 matches.',
        tier: 'gold',
        icon: Crown,
        maxProgress: 100,
        points: 500,
        coins: 1000,

    },

    // --- ACTIONS ---
    {
        id: 'wild-1',
        title: 'Wild Card',
        description: 'Play a Wild Draw 4 as your last card.',
        tier: 'gold',
        icon: Zap,
        maxProgress: 1,
        points: 500,
        coins: 1000,

    },
    {
        id: 'no-u',
        title: 'No U',
        description: 'Reverse a Draw 2 back to the sender.',
        tier: 'silver',
        icon: RotateCcw,
        maxProgress: 1,
        points: 250,
        coins: 500,

    },
    {
        id: 'denial',
        title: 'Not Today',
        description: 'Skip a player who has UNO.',
        tier: 'silver',
        icon: Ban,
        maxProgress: 5,
        points: 250,
        coins: 500,
    },

    // --- SOCIAL / FUN ---
    {
        id: 'social-1',
        title: 'Party Time',
        description: 'Play a game with 4 friends.',
        tier: 'bronze',
        icon: Users,
        maxProgress: 1,
        points: 50,
        coins: 100,
    },
    {
        id: 'streak-1',
        title: 'On Fire',
        description: 'Win 3 games in a row.',
        tier: 'silver',
        icon: Flame,
        maxProgress: 3,
        points: 250,
        coins: 500,
    },
    {
        id: 'streak-2',
        title: 'Streak II',
        description: 'Win 5 games in a row.',
        tier: 'gold',
        icon: Flame,
        maxProgress: 5,
        points: 500,
        coins: 1000,
    },

    // --- NEW ADDITIONS ---
    {
        id: 'dumbass-1',
        title: 'Dumbass',
        description: 'Forgot to call UNO 25 times.',
        tier: 'silver',
        icon: AlertCircle,
        maxProgress: 25,
        points: 250,
        coins: 500,

    },
    // +4 Bomber
    {
        id: 'bomber-1',
        title: '+4 Bomber I',
        description: 'Used 50 +4s.',
        tier: 'bronze',
        icon: Bomb,
        maxProgress: 50,
        points: 50,
        coins: 100,
    },
    {
        id: 'bomber-2',
        title: '+4 Bomber II',
        description: 'Used 100 +4s.',
        tier: 'silver',
        icon: Bomb,
        maxProgress: 100,
        points: 250,
        coins: 500,
    },
    {
        id: 'bomber-3',
        title: '+4 Bomber III',
        description: 'Used 200 +4s.',
        tier: 'gold',
        icon: Bomb,
        maxProgress: 200,
        points: 500,
        coins: 1000,

    },
    // +2 Assaulter
    {
        id: 'assaulter-1',
        title: '+2 Assaulter I',
        description: 'Used 50 +2s.',
        tier: 'bronze',
        icon: Swords,
        maxProgress: 50,
        points: 50,
        coins: 100,
    },
    {
        id: 'assaulter-2',
        title: '+2 Assaulter II',
        description: 'Used 100 +2s.',
        tier: 'silver',
        icon: Swords,
        maxProgress: 100,
        points: 250,
        coins: 500,
    },
    {
        id: 'assaulter-3',
        title: '+2 Assaulter III',
        description: 'Used 200 +2s.',
        tier: 'gold',
        icon: Swords,
        maxProgress: 200,
        points: 500,
        coins: 1000,
    },
    // The Lizard (Wilds)
    {
        id: 'lizard-1',
        title: 'The Lizard I',
        description: 'Used Wild Cards 50 times.',
        tier: 'bronze',
        icon: Palette,
        maxProgress: 50,
        points: 50,
        coins: 100,
    },
    {
        id: 'lizard-2',
        title: 'The Lizard II',
        description: 'Used Wild Cards 100 times.',
        tier: 'silver',
        icon: Palette,
        maxProgress: 100,
        points: 250,
        coins: 500,
    },
    {
        id: 'lizard-3',
        title: 'The Lizard III',
        description: 'Used Wild Cards 200 times.',
        tier: 'gold',
        icon: Palette,
        maxProgress: 200,
        points: 500,
        coins: 1000,
    },
    // The Jammer (Skips)
    {
        id: 'jammer-1',
        title: 'The Jammer I',
        description: 'Used Skips 50 times.',
        tier: 'bronze',
        icon: Ban,
        maxProgress: 50,
        points: 50,
        coins: 100,
    },
    {
        id: 'jammer-2',
        title: 'The Jammer II',
        description: 'Used Skips 100 times.',
        tier: 'silver',
        icon: Ban,
        maxProgress: 100,
        points: 250,
        coins: 500,
    },
    {
        id: 'jammer-3',
        title: 'The Jammer III',
        description: 'Used Skips 200 times.',
        tier: 'gold',
        icon: Ban,
        maxProgress: 200,
        points: 500,
        coins: 1000,
    },
    // Quick Turner (Reverse)
    {
        id: 'turner-1',
        title: 'Quick Turner I',
        description: 'Used Reverse 50 times.',
        tier: 'bronze',
        icon: RotateCcw,
        maxProgress: 50,
        points: 50,
        coins: 100,
    },
    {
        id: 'turner-2',
        title: 'Quick Turner II',
        description: 'Used Reverse 100 times.',
        tier: 'silver',
        icon: RotateCcw,
        maxProgress: 100,
        points: 250,
        coins: 500,
    },
    {
        id: 'turner-3',
        title: 'Quick Turner III',
        description: 'Used Reverse 200 times.',
        tier: 'gold',
        icon: RotateCcw,
        maxProgress: 200,
        points: 500,
        coins: 1000,
    },

    // --- PRESTIGIOUS ---
    {
        id: 'pacifist',
        title: 'The Pacifist',
        description: 'Won a game without using any special card.',
        tier: 'prestigious',
        icon: Shield,
        maxProgress: 1,
        points: 1000,
        coins: 2000,
    },
    {
        id: 'brutalist',
        title: 'The Brutalist',
        description: 'Used 10 +4s in one game.',
        tier: 'prestigious',
        icon: Hammer,
        maxProgress: 1,
        points: 1000,
        coins: 2000,
    },
    {
        id: 'full-stop',
        title: 'Full Stop',
        description: 'Used 3 skips in a row in one game.',
        tier: 'prestigious',
        icon: Octagon,
        maxProgress: 1,
        points: 1000,
        coins: 2000,
    },
    {
        id: 'unlucky',
        title: 'Unlucky',
        description: 'Called UNO 5 times in one game but still lost.',
        tier: 'prestigious',
        icon: Frown,
        maxProgress: 1,
        points: 1000,
        coins: 2000,
    },
    {
        id: 'streak-3',
        title: 'Streak III',
        description: 'Won 10 games in a row.',
        tier: 'prestigious',
        icon: Flame,
        maxProgress: 10,
        points: 1000,
        coins: 2000,
    }
];

// Helper to calculate progress percentage
export const getProgress = (current: number, max: number) => {
    return Math.min(Math.round((current / max) * 100), 100);
};

// --- NEW: Update Achievement Progress ---
export const updateAchievement = async (userId: string, achievementId: string, amount: number = 1) => {
    if (!userId) return;

    try {
        const userRef = getUserDocRef(userId);
        // We use dot notation to update a specific key in the map "achievements.conq-1"
        // increment(amount) ensures atomic updates (e.g. 5 + 1 = 6) safely
        await updateDoc(userRef, {
            [`achievements.${achievementId}`]: increment(amount)
        });
        console.log(`Achievement ${achievementId} updated for ${userId}`);
    } catch (error) {
        console.error("Error updating achievement:", error);
        // Fallback: If document doesn't exist or map field is missing, setDoc with merge might be safer, 
        // but typically the user doc exists after login.
    }
};

// --- NEW: Reset Streaks on Loss ---
export const resetStreaks = async (userId: string) => {
    if (!userId) return;
    try {
        const userRef = getUserDocRef(userId);
        await updateDoc(userRef, {
            'achievements.streak-1': 0,
            'achievements.streak-2': 0,
            'achievements.streak-3': 0
        });
    } catch (error) {
        console.error("Error resetting streaks:", error);
    }
};