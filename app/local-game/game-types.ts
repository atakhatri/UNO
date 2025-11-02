import type { Card as CardData } from "../game-logic";

// Re-exporting the Card type from game-logic
export type Card = CardData;

/**
 * Represents a player in the game.
 * UID links to their Firebase Auth user.
 */
export interface Player {
    id: number; // Player order (0, 1, 2, 3) - Assigned when game starts
    uid: string; // Firebase Auth User ID
    name: string; // Display name
    hand: Card[];
    isComputer?: boolean; // Flag for AI players in local games
}

/**
 * Defines the playable colors for wild cards.
 */
export type Color = "red" | "green" | "blue" | "yellow";

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

    // --- NEW UNO State Fields ---
    /** UID of the player currently holding only one card. */
    playerInUnoState: string | null;
    /** UID of the player who just went down to one card this turn, requiring check on next turn start. */
    pendingUnoCallCheck: string | null;

}

export const cardBackDesigns = {
    default: "bg-red-600",
    blue: "bg-blue-800",
    green: "bg-green-700",
};
