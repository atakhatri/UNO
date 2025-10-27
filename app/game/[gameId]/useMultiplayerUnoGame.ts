"use client";

import { useState, useEffect } from "react";
import { GameState, Player, Card } from "../game-types";
import {
    createDeck,
    shuffleDeck,
    drawCards,
    isCardPlayable,
} from "../../game-logic";
import { db, getUserId, getGameDocRef } from "../../lib/firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";

/**
 * This is the main hook that manages the multiplayer game state.
 * It listens for changes in Firestore and provides functions to update the game.
 */
export function useMultiplayerUnoGame(gameId: string) {
    const [game, setGame] = useState<GameState | null>(null);
    // ▼▼▼ THIS IS THE FIX ▼▼▼
    // We initialize userId as 'null'. The useEffect below will set it
    // once Firebase auth is ready.
    const [userId, setUserId] = useState<string | null>(null);
    // ▲▲▲ THIS IS THE FIX ▲▲▲
    const [error, setError] = useState<string | null>(null);

    // Get and set the current user ID
    useEffect(() => {
        const fetchUser = async () => {
            try {
                // getUserId() waits for auth to be ready and returns the uid
                const uid = await getUserId();
                setUserId(uid);
            } catch (err) {
                console.error("Auth error:", err);
                setError("Failed to get user ID.");
            }
        };
        fetchUser();
    }, []);

    // Set up the real-time listener for the game document
    useEffect(() => {
        // We can't listen to a game doc if we don't know the gameId
        if (!gameId) return;

        const gameDocRef = getGameDocRef(gameId);

        const unsubscribe = onSnapshot(
            gameDocRef,
            (doc) => {
                if (doc.exists()) {
                    const gameData = doc.data() as GameState;
                    setGame(gameData);
                    setError(null);
                } else {
                    setError("Game not found. It may have been deleted.");
                    setGame(null);
                }
            },
            (err) => {
                console.error("Firestore snapshot error:", err);
                setError("Failed to listen to game updates.");
            }
        );

        // Cleanup: remove the listener when the component unmounts
        return () => unsubscribe();
    }, [gameId]);

    // --- Game Actions ---
    // These functions are called by the UI. They calculate the new
    // game state and then update the *entire* game doc in Firestore.

    /**
     * Called by the host to start the game.
     */
    const startGame = async () => {
        if (!game || !game.players.every((p) => p.uid) || game.status !== "waiting")
            return;

        try {
            const settings =
                game.difficulty === "easy"
                    ? { playerCards: 5, computerCards: 7 } // Just an example, logic is per-player
                    : { playerCards: 7, computerCards: 7 };

            let currentDeck = shuffleDeck(createDeck());
            const newPlayers: Player[] = [];

            // Deal cards to each player
            for (const player of game.players) {
                const { drawn, remaining } = drawCards(currentDeck, 7); // 7 cards each
                newPlayers.push({
                    ...player,
                    hand: drawn,
                });
                currentDeck = remaining;
            }

            // Start discard pile
            let firstCard: Card;
            let remainingDeck: Card[];
            do {
                const { drawn, remaining } = drawCards(currentDeck, 1);
                firstCard = drawn[0];
                remainingDeck = remaining;
                currentDeck = remaining;
                // No wild cards to start
            } while (firstCard.color === "black");

            // Update the entire game doc in Firestore
            const gameDocRef = getGameDocRef(gameId);
            await updateDoc(gameDocRef, {
                status: "playing",
                players: newPlayers,
                deck: currentDeck,
                discardPile: [firstCard],
                currentPlayerIndex: 0,
                playDirection: 1,
            });
        } catch (err) {
            console.error("Error starting game:", err);
            setError("Failed to start the game.");
        }
    };

    /**
     * Called when the current player plays a card.
     */
    const playCard = async (card: Card, cardIndex: number) => {
        if (!game || !userId || game.status !== "playing") return;
        if (game.players[game.currentPlayerIndex].uid !== userId) {
            return setError("It's not your turn!");
        }

        const topOfDiscard = game.discardPile[game.discardPile.length - 1];
        if (!isCardPlayable(card, topOfDiscard)) {
            return setError("You can't play that card!");
        }

        // --- 1. Update local state immediately for responsiveness (optional but nice)
        // We'll skip this for now to keep the logic simpler.
        // The "source of truth" will be the next Firestore snapshot.

        // --- 2. Calculate the next game state
        try {
            const currentPlayer = game.players[game.currentPlayerIndex];
            const newHand = [...currentPlayer.hand];
            newHand.splice(cardIndex, 1);

            let newDiscardPile = [...game.discardPile, card];
            let newDeck = [...game.deck];
            let newPlayers = [...game.players];
            newPlayers[game.currentPlayerIndex] = { ...currentPlayer, hand: newHand };
            let newPlayDirection = game.playDirection;
            let newCurrentPlayerIndex = game.currentPlayerIndex;

            let winner: Player | null = null;
            if (newHand.length === 0) {
                winner = currentPlayer;
            }

            // --- 3. Handle Card Effects ---
            let nextPlayerIndex =
                (game.currentPlayerIndex + game.playDirection + game.players.length) %
                game.players.length;

            // TODO: Implement Wild card color picking
            // For now, we'll auto-pick a color or just pass the turn.
            // This is a major piece of logic to add next.
            if (card.color === "black") {
                // *** This is a placeholder! ***
                // You need to open a color picker modal and get this color.
                const chosenColor: Card["color"] = "blue"; // <-- Placeholder!
                card.color = chosenColor; // Mutate the card in the discard pile
                newDiscardPile[newDiscardPile.length - 1] = card;

                if (card.value === "wild-draw-four") {
                    const { drawn, remaining } = drawCards(newDeck, 4);
                    newDeck = remaining;
                    newPlayers[nextPlayerIndex] = {
                        ...newPlayers[nextPlayerIndex],
                        hand: [...newPlayers[nextPlayerIndex].hand, ...drawn],
                    };
                    newCurrentPlayerIndex =
                        (nextPlayerIndex + game.playDirection + game.players.length) %
                        game.players.length; // Skip next player
                } else {
                    // Regular wild
                    newCurrentPlayerIndex = nextPlayerIndex;
                }
            } else if (card.value === "draw-two") {
                const { drawn, remaining } = drawCards(newDeck, 2);
                newDeck = remaining;
                newPlayers[nextPlayerIndex] = {
                    ...newPlayers[nextPlayerIndex],
                    hand: [...newPlayers[nextPlayerIndex].hand, ...drawn],
                };
                newCurrentPlayerIndex =
                    (nextPlayerIndex + game.playDirection + game.players.length) %
                    game.players.length; // Skip next player
            } else if (card.value === "skip") {
                newCurrentPlayerIndex =
                    (nextPlayerIndex + game.playDirection + game.players.length) %
                    game.players.length; // Skip next player
            } else if (card.value === "reverse") {
                newPlayDirection = (game.playDirection * -1) as 1 | -1;
                newCurrentPlayerIndex =
                    (game.currentPlayerIndex + newPlayDirection + game.players.length) %
                    game.players.length;
            } else {
                // Normal number card
                newCurrentPlayerIndex = nextPlayerIndex;
            }

            // --- 4. Update Firestore ---
            const gameDocRef = getGameDocRef(gameId);
            await updateDoc(gameDocRef, {
                players: newPlayers,
                deck: newDeck,
                discardPile: newDiscardPile,
                currentPlayerIndex: newCurrentPlayerIndex,
                playDirection: newPlayDirection,
                status: winner ? "finished" : "playing",
                winner: winner ? winner.name : null,
            });
        } catch (err) {
            console.error("Error playing card:", err);
            setError("Failed to play card.");
        }
    };

    /**
     * Called when the current player draws a card.
     */
    const drawCard = async () => {
        if (!game || !userId || game.status !== "playing") return;
        if (game.players[game.currentPlayerIndex].uid !== userId) {
            return setError("It's not your turn!");
        }

        try {
            let currentDeck = [...game.deck];
            let currentDiscardPile = [...game.discardPile];

            // Reshuffle discard pile if deck is empty
            if (currentDeck.length === 0) {
                const topCard = currentDiscardPile.pop()!;
                currentDeck = shuffleDeck(currentDiscardPile);
                currentDiscardPile = [topCard];
            }

            const { drawn, remaining } = drawCards(currentDeck, 1);
            const newDeck = remaining;
            const drawnCard = drawn[0];

            const currentPlayer = game.players[game.currentPlayerIndex];
            const newHand = [...currentPlayer.hand, drawnCard];

            const newPlayers = [...game.players];
            newPlayers[game.currentPlayerIndex] = { ...currentPlayer, hand: newHand };

            // Pass the turn
            const newCurrentPlayerIndex =
                (game.currentPlayerIndex + game.playDirection + game.players.length) %
                game.players.length;

            const gameDocRef = getGameDocRef(gameId);
            await updateDoc(gameDocRef, {
                players: newPlayers,
                deck: newDeck,
                discardPile: currentDiscardPile, // In case it was reshuffled
                currentPlayerIndex: newCurrentPlayerIndex,
            });
        } catch (err) {
            console.error("Error drawing card:", err);
            setError("Failed to draw card.");
        }
    };

    // Return the game state and functions to the component
    return {
        game,
        userId,
        error,
        actions: {
            startGame,
            playCard,
            drawCard,
        },
    };
}

