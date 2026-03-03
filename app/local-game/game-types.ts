import type { Card as CardData } from "../game-logic";

export type Card = CardData;
export interface Player {
    id: number;
    uid: string;
    name: string;
    hand: Card[];
    isComputer?: boolean;
}
export type Color = "red" | "green" | "blue" | "yellow";

export interface GameState {
    gameId: string;
    hostId: string;
    players: Player[];
    deck: Card[];
    discardPile: Card[];
    currentPlayerIndex: number;
    playDirection: 1 | -1;
    status: "waiting" | "playing" | "finished";
    winnerId: string | null;
    chosenColor: Color | null;
    gameMessage: string | null;
    playerInUnoState: string | null;
    pendingUnoCallCheck: string | null;

}

export const cardBackDesigns = {
    default: { type: 'color' as const, value: 'bg-red-600' },
    blue: { type: 'color' as const, value: 'bg-blue-800' },
    green: { type: 'color' as const, value: 'bg-green-700' },
    neon: { type: 'image' as const, value: '/store/card-back/neon.png' },
    dragon: { type: 'image' as const, value: '/store/card-back/dragon.png' },
    frostbite: { type: 'image' as const, value: '/store/card-back/frostbite.png' },
    classic: { type: 'image' as const, value: '/store/card-back/basic-uno.png' },
};
