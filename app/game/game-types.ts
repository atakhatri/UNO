import type { Card as CardData } from "../game-logic";

// Re-exporting the Card type from game-logic, but it's good to have all types in one place
export type Card = CardData;

/**
 * Represents a player in the game.
 */
export interface Player {
    id: number;
    hand: Card[];
    isComputer: boolean;
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
    playerId?: number; // For drawing cards to a specific player
}

/**
 * Configuration for game difficulty, affecting starting hand sizes.
 */
export const difficultySettings = {
    easy: { playerCards: 7, computerCards: 7 },
    medium: { playerCards: 7, computerCards: 7 },
    hard: { playerCards: 5, computerCards: 7 }, // Player starts with fewer cards
};

export type Difficulty = keyof typeof difficultySettings;

/**
 * Tailwind classes for different card back designs.
 */
export const cardBackDesigns = {
    default: "bg-red-600",
    blue: "bg-blue-800",
    green: "bg-green-700",
};

/**
 * Display properties for difficulty levels in the UI.
 */
export const difficultyDisplay = {
    easy: { label: "Easy", bg: "bg-green-600" },
    medium: { label: "Medium", bg: "bg-yellow-500" },
    hard: { label: "Hard", bg: "bg-red-600" },
};
