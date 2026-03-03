// c:\Users\atakh\OneDrive\Documents\GitHub\UNO\data\storeItems.ts
export type ItemType = 'card-back' | 'avatar' | 'frame';

export interface StoreItem {
    id: string;
    name: string;
    description: string;
    price: number;
    type: ItemType;
    imageUrl: string; // Path to the image asset
}

export const storeItems: StoreItem[] = [
    // Card Backs
    {
        id: 'card_back_classic',
        name: 'Classic UNO',
        description: 'The timeless UNO card back design.',
        price: 0,
        type: 'card-back',
        imageUrl: '/store/card-back/basic-uno.png',
    },
    {
        id: 'card_back_neon',
        name: 'Neon Nights',
        description: 'A glowing neon cyberpunk card back.',
        price: 5000,
        type: 'card-back',
        imageUrl: '/store/card-back/neon.png',
    },
    {
        id: 'card_back_dragon',
        name: 'Red Dragon',
        description: 'Legendary dragon scales design.',
        price: 15000,
        type: 'card-back',
        imageUrl: '/store/card-back/dragon.png',
    },
    {
        id: 'card_back_frostbite',
        name: 'Frostbite',
        description: 'Freeze the opponents with cold blue hues.',
        price: 7500,
        type: 'card-back',
        imageUrl: '/store/card-back/frostbite.png',
    },

    // Avatars
    {
        id: 'avatar_robot',
        name: 'Mecha Bot',
        description: 'A futuristic robot avatar for your profile.',
        price: 2000,
        type: 'avatar',
        imageUrl: '/store/avatars/mecha_bot.png',
    },
    {
        id: 'avatar_wizard',
        name: 'Grand Wizard',
        description: 'Cast spells with this mystical avatar.',
        price: 2500,
        type: 'avatar',
        imageUrl: '/store/avatars/wizard.png',
    },

    // Frames
    {
        id: 'frame_flames',
        name: 'Ring of Fire',
        description: 'An animated fire frame.',
        price: 5000,
        type: 'frame',
        imageUrl: '/store/frames/flames.png',
    },
    {
        id: 'frame_gold',
        name: 'Golden Glory',
        description: 'A majestic golden frame.',
        price: 10000,
        type: 'frame',
        imageUrl: '/store/frames/gold.png',
    },
];
