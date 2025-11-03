import type { Card } from "../game-logic";
export interface Player {
    id?: number;
    uid: string;
    name: string;
    hand: Card[];
}

export type Color = "red" | "green" | "blue" | "yellow";

export interface AnimatedCard {
    id: string;
    card: Card;
    type: "play" | "draw";
}

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
    animatedCard: AnimatedCard | null;

    playerInUnoState: string | null;
    pendingUnoCallCheck: string | null;

}

export const cardBackDesigns = {
    default: "bg-red-600",
    blue: "bg-blue-800",
    green: "bg-green-700",
};
