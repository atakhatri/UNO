import type { Card as CardData } from "../game-logic";

// Re-exporting the Card type from game-logic
export type Card = CardData;

/**
 * Represents a player in the game.
 * UID links to their Firebase Auth user.
 */
export interface Player {
    id: number; // Player order (0, 1, 2, 3)
    uid: string; // Firebase Auth User ID
    name: string; // Display name
    hand: Card[];
}

/**
 * Defines the playable colors for wild cards.
 */
export type Color = "red" | "green" | "blue" | "yellow";

/**
 * Defines the properties for an animated card transition.
 */
export interface AnimatedCard {
    card: Card;
    from: "deck" | "player" | "opponent";
    to: "player" | "discard" | "opponent";
    playerId?: number;
}

/**
 * Defines the entire shared state of a game.
 * This is what will be stored in a single Firestore document.
 */
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
    chosenColor: Color | null; // Tracks the chosen color for a Wild card
    gameMessage: string | null;
}

// These are unchanged but still useful
export const difficultySettings = {
    easy: { playerCards: 7 },
    medium: { playerCards: 7 },
    hard: { playerCards: 5 },
};
export type Difficulty = keyof typeof difficultySettings;

export const cardBackDesigns = {
    default: "bg-red-600",
    blue: "bg-blue-800",
    green: "bg-green-700",
};

export const difficultyDisplay = {
    easy: { label: "Easy", bg: "bg-green-600" },
    medium: { label: "Medium", bg: "bg-yellow-500" },
    hard: { label: "Hard", bg: "bg-red-600" },
};

