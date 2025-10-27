"use client";

import { useState, useEffect, useCallback } from "react";
import {
    auth,
    getGameDocRef,
    onSnapshot,
    getUserId,
    updateDoc,
    setDoc,
} from "@/app/lib/firebase";
import {
    createDeck,
    shuffleDeck,
    drawCards,
    isCardPlayable,
} from "@/app/game-logic";
import type { GameState, Player, Card, Color } from "../game-types";

// This hook manages the *entire* game state by subscribing to Firestore
export function useMultiplayerUnoGame(gameId: string) {
    const [game, setGame] = useState<GameState | null>(null);
    const [userId, setUserId] = useState<string | null>(auth.currentUser?.uid || null);
    const [error, setError] = useState<string | null>(null);

    // Get and set the current user ID
    useEffect(() => {
        getUserId().then(setUserId);
    }, []);

    // Subscribe to the game document in Firestore
    useEffect(() => {
        if (!gameId) return;
        console.log(`Subscribing to game: ${gameId}`);
        const gameDocRef = getGameDocRef(gameId);

        const unsubscribe = onSnapshot(
            gameDocRef,
            (doc) => {
                if (doc.exists()) {
                    const gameData = doc.data() as GameState;
                    console.log("Received game state update:", gameData);
                    setGame(gameData);
                } else {
                    setError("Game not found.");
                    console.error("Game document does not exist:", gameId);
                }
            },
            (err) => {
                console.error("Firestore snapshot error:", err);
                setError("Error connecting to game.");
            }
        );

        // Clean up subscription on unmount
        return () => unsubscribe();
    }, [gameId]);

    // --- Game Actions ---
    // These functions compute the *next* state and write it to Firestore.
    // The local state will then update via the `onSnapshot` listener.

    /**
     * Reshuffles the discard pile back into the deck
     */
    const reshuffleDeck = (
        currentDeck: Card[],
        currentDiscardPile: Card[]
    ): Card[] => {
        console.log("Reshuffling deck...");
        const topCard = currentDiscardPile[currentDiscardPile.length - 1];
        const restOfPile = currentDiscardPile.slice(0, -1);
        const newDeck = shuffleDeck(restOfPile);

        // Update the game state with the new deck and cleared discard pile
        // This is a partial update, so we use `updateDoc`
        const gameDocRef = getGameDocRef(gameId);
        updateDoc(gameDocRef, {
            deck: newDeck,
            discardPile: [topCard],
            gameMessage: "Deck was reshuffled!",
        });

        return newDeck;
    };

    /**
     * Draws cards for a specific player and updates the game state
     */
    const drawCardsForPlayer = async (
        playerIndex: number,
        count: number,
        currentState: GameState
    ) => {
        let { deck, players } = currentState;

        if (deck.length < count) {
            deck = reshuffleDeck(deck, currentState.discardPile);
        }

        const { drawn, remaining } = drawCards(deck, count);
        const updatedHand = [...players[playerIndex].hand, ...drawn];
        const updatedPlayers = players.map((p, i) =>
            i === playerIndex ? { ...p, hand: updatedHand } : p
        );

        return {
            deck: remaining,
            players: updatedPlayers,
        };
    };

    /**
     * Starts the game (callable only by the host)
     */
    const startGame = async () => {
        if (!game || !userId || game.hostId !== userId) return;

        if (game.status === "waiting") {
            console.log("Host is starting the game...");
            const gameDocRef = getGameDocRef(gameId);
            await updateDoc(gameDocRef, {
                status: "playing",
                gameMessage: "The game has started!",
            });
        }
    };

    /**
     * Handles a player playing a card
     */
    const playCard = async (card: Card, handIndex: number) => {
        if (!game || !userId || game.status !== "playing") return;

        const currentPlayer = game.players[game.currentPlayerIndex];
        if (currentPlayer.uid !== userId) {
            // Not this player's turn
            return;
        }

        const topOfDiscard = game.discardPile[game.discardPile.length - 1];
        const playableColor = game.chosenColor || topOfDiscard.color;

        // Modify isCardPlayable check for wild cards
        const effectiveTopOfDiscard = { ...topOfDiscard, color: playableColor };
        if (!isCardPlayable(card, effectiveTopOfDiscard)) {
            console.log("Invalid card played");
            // Optionally set a temporary local message
            return;
        }

        console.log(`Player ${userId} is playing card:`, card);

        // This is the core logic. We compute the *entire* next state.
        let nextState: Partial<GameState> = {};
        const newHand = [...currentPlayer.hand];
        newHand.splice(handIndex, 1);

        const newPlayers = game.players.map((p) =>
            p.uid === userId ? { ...p, hand: newHand } : p
        );

        nextState.players = newPlayers;
        nextState.discardPile = [...game.discardPile, card];

        // Handle winning condition
        if (newHand.length === 0) {
            nextState.status = "finished";
            nextState.winnerId = userId;
            nextState.gameMessage = `${currentPlayer.name} has won!`;
            const gameDocRef = getGameDocRef(gameId);
            await updateDoc(gameDocRef, nextState);
            return;
        }

        // Handle UNO call
        if (newHand.length === 1) {
            // In a real game, you'd check if they *failed* to call UNO.
            // For simplicity, we just announce it.
            nextState.gameMessage = `${currentPlayer.name} shouts UNO!`;
        } else {
            nextState.gameMessage = `${currentPlayer.name} played a ${card.color} ${card.value}.`;
        }

        // Handle card effects
        let skip = 1;
        let nextPlayerIndex = (game.currentPlayerIndex + game.playDirection * skip + game.players.length) % game.players.length;

        if (card.color === "black") {
            // Don't end turn yet, wait for color choice
            nextState.chosenColor = null; // Mark that we need a color
        } else {
            nextState.chosenColor = null; // Reset chosen color

            switch (card.value) {
                case "draw-two":
                    const drawTwoResult = await drawCardsForPlayer(nextPlayerIndex, 2, { ...game, ...nextState });
                    nextState.players = drawTwoResult.players;
                    nextState.deck = drawTwoResult.deck;
                    skip = 2; // Skip the player who drew
                    nextState.gameMessage = `${currentPlayer.name} played a Draw Two! ${game.players[nextPlayerIndex].name} draws 2.`;
                    break;
                case "skip":
                    skip = 2; // Skip the next player
                    nextState.gameMessage = `${currentPlayer.name} skipped ${game.players[nextPlayerIndex].name}!`;
                    break;
                case "reverse":
                    if (game.players.length === 2) {
                        skip = 2; // Acts like a skip
                    } else {
                        nextState.playDirection = (game.playDirection * -1) as 1 | -1;
                    }
                    nextState.gameMessage = `${currentPlayer.name} reversed the direction!`;
                    break;
            }

            nextState.currentPlayerIndex = (game.currentPlayerIndex + nextState.playDirection! * skip + game.players.length) % game.players.length;
        }

        const gameDocRef = getGameDocRef(gameId);
        await updateDoc(gameDocRef, nextState);
    };

    /**
     * Handles the current player drawing a card from the deck
     */
    const drawCard = async () => {
        if (!game || !userId || game.status !== "playing") return;
        const currentPlayer = game.players[game.currentPlayerIndex];
        if (currentPlayer.uid !== userId) return; // Not your turn

        console.log(`Player ${userId} is drawing a card...`);

        const drawResult = await drawCardsForPlayer(game.currentPlayerIndex, 1, game);

        const nextState: Partial<GameState> = {
            ...drawResult,
            currentPlayerIndex: (game.currentPlayerIndex + game.playDirection + game.players.length) % game.players.length,
            gameMessage: `${currentPlayer.name} drew a card.`,
        };

        const gameDocRef = getGameDocRef(gameId);
        await updateDoc(gameDocRef, nextState);
    };

    /**
     * Handles setting the color after playing a Wild card
     */
    const selectColor = async (color: Color) => {
        if (!game || !userId || game.status !== "playing") return;
        const currentPlayer = game.players[game.currentPlayerIndex];
        if (currentPlayer.uid !== userId) return; // Not your turn

        const topOfDiscard = game.discardPile[game.discardPile.length - 1];
        if (topOfDiscard.color !== "black") return; // Not a wild card

        console.log(`Player ${userId} selected color: ${color}`);

        let nextState: Partial<GameState> = {
            chosenColor: color,
            gameMessage: `${currentPlayer.name} chose ${color}.`
        };
        let skip = 1;
        let nextPlayerIndex = (game.currentPlayerIndex + game.playDirection * skip + game.players.length) % game.players.length;

        if (topOfDiscard.value === "wild-draw-four") {
            const drawFourResult = await drawCardsForPlayer(nextPlayerIndex, 4, game);
            nextState.players = drawFourResult.players;
            nextState.deck = drawFourResult.deck;
            skip = 2; // Skip the player who drew
            nextState.gameMessage = `${currentPlayer.name} played a Wild Draw Four! ${color} is chosen. ${game.players[nextPlayerIndex].name} draws 4.`;
        }

        nextState.currentPlayerIndex = (game.currentPlayerIndex + game.playDirection * skip + game.players.length) % game.players.length;

        const gameDocRef = getGameDocRef(gameId);
        await updateDoc(gameDocRef, nextState);
    };

    // Expose game state and actions
    return {
        game,
        userId,
        error,
        startGame,
        playCard,
        drawCard,
        selectColor,
    };
}
