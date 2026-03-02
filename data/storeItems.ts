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
        id: 'card_back_neon',
        name: 'Neon Nights',
        description: 'A glowing neon cyberpunk card back.',
        price: 500,
        type: 'card-back',
        imageUrl: '/store/card-back/neon.png',
    },
    {
        id: 'card_back_dragon',
        name: 'Red Dragon',
        description: 'Legendary dragon scales design.',
        price: 1000,
        type: 'card-back',
        imageUrl: '/store/card-back/dragon.png',
    },

    // Avatars
    {
        id: 'avatar_robot',
        name: 'Mecha Bot',
        description: 'A futuristic robot avatar for your profile.',
        price: 300,
        type: 'avatar',
        imageUrl: '/store/avatars/mecha_bot.png',
    },
    {
        id: 'avatar_wizard',
        name: 'Grand Wizard',
        description: 'Cast spells with this mystical avatar.',
        price: 300,
        type: 'avatar',
        imageUrl: '/store/avatars/wizard.png',
    },

    // Frames
    {
        id: 'frame_flames',
        name: 'Ring of Fire',
        description: 'An animated fire frame.',
        price: 1200,
        type: 'frame',
        imageUrl: '/store/frames/flames.png',
    },
];
