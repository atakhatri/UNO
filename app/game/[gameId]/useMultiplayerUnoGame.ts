"use client";

import { useState, useEffect, useCallback } from "react";
// Correct path assuming game-types is inside app/game/
import { GameState, Player, Card, Color } from "../game-types";
import {
    createDeck,
    shuffleDeck,
    drawCards,
    isCardPlayable,
} from "../../game-logic"; // Correct path to game-logic
import { db, getUserId, getGameDocRef } from "../../lib/firebase"; // Correct path to firebase
import { doc, onSnapshot, updateDoc } from "firebase/firestore";

/**
 * Main hook for multiplayer Uno game logic using Firestore.
 */
export function useMultiplayerUnoGame(gameId: string) {
    const [game, setGame] = useState<GameState | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isAwaitingColorChoice, setIsAwaitingColorChoice] = useState(false);
    // Tracks if the current player clicked the UNO button *before* playing their second-to-last card
    const [localUnoButtonPressed, setLocalUnoButtonPressed] = useState(false);

    // Get and set the current user ID
    useEffect(() => {
        const fetchUser = async () => {
            try {
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
        if (!gameId) return;
        const gameDocRef = getGameDocRef(gameId);
        const unsubscribe = onSnapshot(
            gameDocRef,
            (doc) => {
                if (doc.exists()) {
                    const gameData = doc.data() as GameState;
                    setGame(gameData);
                    setError(null); // Clear error on successful fetch

                    const isMyTurnNow =
                        gameData.status === "playing" &&
                        userId &&
                        gameData.players[gameData.currentPlayerIndex]?.uid === userId;

                    // ▼▼▼ SAFE ACCESS TO topCard INSIDE SNAPSHOT ▼▼▼
                    const topCard = (gameData.discardPile && gameData.discardPile.length > 0)
                        ? gameData.discardPile[gameData.discardPile.length - 1]
                        : null;
                    // ▲▲▲ SAFE ACCESS TO topCard INSIDE SNAPSHOT ▲▲▲

                    // Check if *I* need to choose a color
                    setIsAwaitingColorChoice(
                        isMyTurnNow && topCard?.color === "black" && !gameData.chosenColor
                    );

                    // If it just became my turn, reset the local UNO button state
                    if (isMyTurnNow) {
                        // Check previous turn player index to see if it changed to current player
                        // This is slightly complex to get perfectly, a simple reset is often good enough
                        setLocalUnoButtonPressed(false);
                    }

                } else {
                    setError("Game not found. Check the ID or go back to Lobby.");
                    setGame(null);
                }
            },
            (err) => {
                console.error("Firestore snapshot error:", err);
                setError("Failed to listen to game updates.");
            }
        );
        return () => unsubscribe();
    }, [gameId, userId]); // Re-run if gameId or userId changes


    // --- UNO Penalty Check ---
    // Runs when game state updates, checks if a penalty needs applying from PREVIOUS turn
    useEffect(() => {
        if (!game || game.status !== 'playing' || !userId) return;

        // Is there a player flagged for an UNO check?
        if (game.pendingUnoCallCheck) {
            const playerToCheckUid = game.pendingUnoCallCheck;
            // Check only needs to happen once. Let the current player handle it.
            const isMyTurnNow = game.players[game.currentPlayerIndex]?.uid === userId;

            if (isMyTurnNow) {
                console.log(`Player ${userId} is now checking UNO status for ${playerToCheckUid}`);
                const playerToCheckIndex = game.players.findIndex(p => p.uid === playerToCheckUid);
                const playerToCheck = game.players[playerToCheckIndex];

                // If the player still exists and *still* has exactly 1 card (meaning they didn't win or draw)
                if (playerToCheck && playerToCheck.hand.length === 1) {
                    console.log(`Applying UNO penalty to ${playerToCheck.name} (UID: ${playerToCheckUid})`);
                    // Apply penalty (this is an async Firestore update)
                    applyUnoPenalty(playerToCheckIndex);
                } else {
                    // Player played their last card, drew more, or someone else penalized them already.
                    // Clear the check flag.
                    console.log(`Clearing UNO check for ${playerToCheckUid} - penalty not needed or already applied.`);
                    clearUnoCheck(); // Async Firestore update
                }
            }
        }
        // Intentionally not including applyUnoPenalty/clearUnoCheck in deps to avoid loops
    }, [game?.currentPlayerIndex, game?.pendingUnoCallCheck, game?.players, gameId, userId]);


    // --- Helper Functions ---

    /** Reshuffles discard pile into deck. Returns the new deck. */
    const handleReshuffle = (currentDiscardPile: Card[]): Card[] => {
        if (currentDiscardPile.length <= 1) return [];
        console.log("Reshuffling deck...");
        const topCard = currentDiscardPile[currentDiscardPile.length - 1];
        const restOfPile = currentDiscardPile.slice(0, -1);
        const newDeck = shuffleDeck(restOfPile);
        return newDeck;
    };

    /** Calculates the index of the next player. */
    const getNextPlayerIndex = (
        currentIndex: number,
        direction: 1 | -1,
        skip: number = 1
    ): number => {
        if (!game || game.players.length === 0) return 0;
        return (
            (currentIndex + direction * skip + game.players.length) %
            game.players.length
        );
    };

    /** Helper to draw cards for a specific player and return updates for Firestore. */
    const drawCardsForPlayer = (
        playerIndex: number,
        count: number,
        currentDeck: Card[],
        currentDiscardPile: Card[]
    ): { drawnCards: Card[], updatedDeck: Card[], updatedDiscard: Card[] } => {
        let deckToDrawFrom = [...currentDeck];
        let discardToUse = [...currentDiscardPile];
        if (deckToDrawFrom.length < count) {
            const reshuffled = handleReshuffle(discardToUse);
            // If still not enough cards after reshuffle
            if (reshuffled.length < count) {
                console.error(`Not enough cards to draw ${count} even after reshuffle!`);
                // Draw whatever is left
                const remainingCards = reshuffled;
                deckToDrawFrom = []; // Deck is now empty
                discardToUse = discardToUse.length > 0 ? [discardToUse[discardToUse.length - 1]] : []; // Keep only top card if exists
                return { drawnCards: remainingCards, updatedDeck: deckToDrawFrom, updatedDiscard: discardToUse };

            }
            deckToDrawFrom = reshuffled;
            discardToUse = discardToUse.length > 0 ? [discardToUse[discardToUse.length - 1]] : []; // Keep only top card if exists
        }
        const { drawn, remaining } = drawCards(deckToDrawFrom, count);
        return { drawnCards: drawn, updatedDeck: remaining, updatedDiscard: discardToUse };
    };

    /** Applies the draw-two penalty for failing to call UNO. Updates Firestore directly. */
    const applyUnoPenalty = async (playerIndex: number) => {
        if (!game || playerIndex < 0 || playerIndex >= game.players.length) return;

        try {
            const playerToPenalize = game.players[playerIndex];
            // Ensure we read the *latest* game state before calculating penalty
            const gameDocRef = getGameDocRef(gameId);
            // Note: We might re-read the doc here, or trust the 'game' state if updates are fast.
            // For simplicity, let's trust the current 'game' state from the snapshot listener.

            const { drawnCards, updatedDeck, updatedDiscard } = drawCardsForPlayer(
                playerIndex,
                2, // UNO penalty is 2 cards
                game.deck || [], // Ensure deck is an array
                game.discardPile || [] // Ensure discardPile is an array
            );

            if (drawnCards.length > 0) {
                const updatedPlayers = game.players.map((p, index) =>
                    index === playerIndex
                        ? { ...p, hand: [...p.hand, ...drawnCards] }
                        : p
                );

                await updateDoc(gameDocRef, {
                    players: updatedPlayers,
                    deck: updatedDeck,
                    discardPile: updatedDiscard, // Update in case of reshuffle
                    pendingUnoCallCheck: null, // Penalty applied, clear the check
                    gameMessage: `${playerToPenalize.name} forgot to call UNO! Draws 2.`,
                    playerInUnoState: null, // No longer in UNO state after drawing
                });
            } else {
                // Couldn't draw penalty (e.g., deck empty, discard empty)
                await clearUnoCheck(); // Still clear the check
            }

        } catch (err) {
            console.error("Error applying UNO penalty:", err);
            // Don't set component error, just log it. Attempt to clear the check anyway.
            await clearUnoCheck();
        }
    };

    /** Clears the pending UNO check flag in Firestore. */
    const clearUnoCheck = async () => {
        if (!gameId) return; // Need gameId
        try {
            const gameDocRef = getGameDocRef(gameId);
            await updateDoc(gameDocRef, {
                pendingUnoCallCheck: null,
            });
            console.log("Cleared pending UNO check in Firestore");
        } catch (err) {
            console.error("Error clearing pending UNO check:", err);
        }
    };


    // --- Game Actions ---

    const startGame = async () => {
        if (!game || !userId || game.hostId !== userId || game.status !== "waiting" || game.players.length < 2) {
            setError("Cannot start game. Ensure you are the host, game is waiting, and >= 2 players.");
            return;
        }
        if (!game.players.every((p) => p.uid && p.name)) {
            setError("Some players are missing info.");
            return;
        }
        setError(null); // Clear previous errors

        try {
            let currentDeck = shuffleDeck(createDeck());
            const newPlayers: Player[] = [];
            let playerCounter = 0;

            // Assign IDs and deal hands
            for (const player of game.players) {
                const { drawn, remaining } = drawCards(currentDeck, 7); // Deal 7 cards
                newPlayers.push({
                    ...player,
                    id: playerCounter++, // Assign sequential ID based on order
                    hand: drawn,
                });
                currentDeck = remaining;
            }

            // Start discard pile
            let firstCard: Card | null = null; // Initialize as null
            let discardPileSetup = []; // Start empty
            do {
                if (currentDeck.length === 0) {
                    // Attempt reshuffle only if discardPileSetup has cards (unlikely here but safe)
                    if (discardPileSetup.length > 1) {
                        currentDeck = handleReshuffle(discardPileSetup);
                        discardPileSetup = discardPileSetup.length > 0 ? [discardPileSetup[discardPileSetup.length - 1]] : [];
                        if (currentDeck.length === 0) {
                            setError("Not enough cards to start the game even after reshuffle.");
                            return;
                        }
                    } else {
                        setError("Not enough cards to start the game.");
                        return;
                    }
                }
                const { drawn, remaining } = drawCards(currentDeck, 1);
                firstCard = drawn[0]; // Now firstCard is guaranteed to be a Card
                currentDeck = remaining;
                // Don't add black cards to discard immediately, redraw
                if (firstCard.color !== "black") {
                    discardPileSetup = [firstCard];
                }
            } while (firstCard.color === "black"); // Ensure first card isn't black


            const gameDocRef = getGameDocRef(gameId);
            await updateDoc(gameDocRef, {
                status: "playing",
                players: newPlayers, // Players now have IDs and hands
                deck: currentDeck,
                discardPile: discardPileSetup, // Start with the first non-black card
                currentPlayerIndex: 0, // Host starts
                playDirection: 1,
                gameMessage: `${newPlayers[0].name}'s turn!`,
                chosenColor: null,
                winnerId: null,
                playerInUnoState: null,
                pendingUnoCallCheck: null,
                difficulty: game.difficulty, // Make sure difficulty is persisted
            });
        } catch (err) {
            console.error("Error starting game:", err);
            setError("Failed to start the game.");
        }
    };

    /** Action triggered by the UI UNO button click. */
    const callUno = () => {
        // ▼▼▼ FIX: Calculate isPlayerTurn here ▼▼▼
        const isPlayerTurn = game?.status === 'playing' && game.players[game.currentPlayerIndex]?.uid === userId;
        // ▲▲▲ FIX: Calculate isPlayerTurn here ▲▲▲

        if (!game || !userId || !isPlayerTurn) return; // Use the calculated value

        const player = game.players.find(p => p.uid === userId);
        // Allow calling if hand will be 1 AFTER playing a card (current hand is 2)
        if (player && player.hand.length === 2) {
            setLocalUnoButtonPressed(true);
            console.log("UNO button pressed locally for this turn.");
        } else {
            console.warn("Cannot call UNO right now (Hand size not 2 or not your turn).");
        }
    };

    const playCard = async (card: Card, cardIndex: number) => {
        if (!game || !userId || game.status !== "playing" || isAwaitingColorChoice) return;
        const currentPlayer = game.players[game.currentPlayerIndex];
        if (currentPlayer?.uid !== userId) {
            // setError("It's not your turn!"); // Keep error UI for user feedback
            // Return silently to avoid repeated errors for background updates
            return;
        }

        // Safely access topOfDiscard for playability check
        const topOfDiscardCheck = (game.discardPile && game.discardPile.length > 0)
            ? game.discardPile[game.discardPile.length - 1]
            : null;

        // Determine the effective color considering chosenColor for wild cards
        const effectiveColor = game.chosenColor ?? topOfDiscardCheck?.color;

        // Create an "effective" top card to check against
        const effectiveTopOfDiscard = topOfDiscardCheck
            ? { ...topOfDiscardCheck, color: effectiveColor ?? topOfDiscardCheck.color } // Fallback to original color if chosenColor is somehow null
            : null;


        // If there's an effective top card, check playability against it
        // Also allow playing if discard pile is empty (shouldn't happen after start, but safe)
        if (effectiveTopOfDiscard && !isCardPlayable(card, effectiveTopOfDiscard)) {
            setError("You can't play that card!");
            setTimeout(() => setError(null), 2000);
            return;
        }
        setError(null);


        try {
            const newHand = [...currentPlayer.hand];
            newHand.splice(cardIndex, 1);

            // Prepare updates object for Firestore
            let updates: Partial<GameState> = {
                players: game.players.map((p) =>
                    p.uid === userId ? { ...p, hand: newHand } : p
                ),
                // Ensure discardPile is always an array before spreading
                discardPile: [...(game.discardPile || []), card],
                // Ensure deck is always an array
                deck: [...(game.deck || [])],
                chosenColor: null, // Reset chosen color on successful play
                gameMessage: "",
                pendingUnoCallCheck: null, // Reset pending check on successful play
                playDirection: game.playDirection, // Preserve current direction unless changed
            };


            // --- UNO Logic ---
            if (currentPlayer.hand.length === 2 && newHand.length === 1) { // Went from 2 to 1 card
                if (localUnoButtonPressed) {
                    console.log("UNO called successfully by", currentPlayer.name);
                    updates.playerInUnoState = userId; // Mark this player
                    updates.pendingUnoCallCheck = null; // No check needed
                    updates.gameMessage = `${currentPlayer.name} calls UNO! `; // Add space for next message part
                } else {
                    console.log(currentPlayer.name, "did NOT call UNO!");
                    updates.playerInUnoState = null; // Not officially in UNO state yet
                    updates.pendingUnoCallCheck = userId; // Flag for check next turn
                    updates.gameMessage = `${currentPlayer.name} has one card left! `;
                }
            } else if (newHand.length !== 1 && game.playerInUnoState === userId) {
                // Player was in UNO state but no longer has 1 card
                console.log(currentPlayer.name, "is no longer in UNO state.");
                updates.playerInUnoState = null;
            } else {
                // If player wasn't in UNO state, keep the existing value (might be another player)
                // If another player was in UNO state, don't clear it here.
                updates.playerInUnoState = game.playerInUnoState;
            }
            // Reset local button flag after processing for this turn
            setLocalUnoButtonPressed(false);


            // Check for winner
            if (newHand.length === 0) {
                updates.status = "finished";
                updates.winnerId = userId;
                updates.gameMessage += `${currentPlayer.name} Wins!`;
                updates.playerInUnoState = null; // Clear UNO state on win
                updates.pendingUnoCallCheck = null;
                const gameDocRef = getGameDocRef(gameId);
                await updateDoc(gameDocRef, updates);
                return; // Game over
            }

            // --- Handle Card Effects ---
            let nextPlayerIndex = getNextPlayerIndex(
                game.currentPlayerIndex,
                game.playDirection // Use current direction initially
            );
            // Ensure updates.players exists for modifying hands
            // Use the potentially updated players from the map operation above
            let currentPlayers = updates.players!; // Assert non-null as we just set it


            if (card.color === "black") {
                // Don't change turn yet, wait for color selection
                updates.currentPlayerIndex = game.currentPlayerIndex;
                updates.gameMessage += `Choose a color.`;
            } else {
                let drewCardsResult: { drawnCards: Card[], updatedDeck: Card[], updatedDiscard: Card[] } | null = null;
                // Apply effect and determine next player index
                switch (card.value) {
                    case "draw-two":
                        // Ensure deck and discard are arrays before passing
                        drewCardsResult = drawCardsForPlayer(nextPlayerIndex, 2, updates.deck!, updates.discardPile!);
                        updates.deck = drewCardsResult.updatedDeck;
                        updates.discardPile = drewCardsResult.updatedDiscard;
                        // Find the player index in the *current* list being updated
                        const playerToDrawIndex = currentPlayers.findIndex(p => p.id === game.players[nextPlayerIndex].id);
                        if (playerToDrawIndex !== -1) {
                            currentPlayers[playerToDrawIndex] = {
                                ...currentPlayers[playerToDrawIndex],
                                hand: [...currentPlayers[playerToDrawIndex].hand, ...drewCardsResult.drawnCards]
                            };
                            // If the penalized player was in UNO state, clear it
                            if (updates.playerInUnoState === currentPlayers[playerToDrawIndex].uid) {
                                updates.playerInUnoState = null;
                            }
                            updates.gameMessage += `${currentPlayers[playerToDrawIndex].name} draws 2! `;
                        }
                        nextPlayerIndex = getNextPlayerIndex(game.currentPlayerIndex, game.playDirection, 2); // Skip
                        break;
                    case "skip":
                        const skippedPlayerIndex = nextPlayerIndex; // Index of the player to be skipped
                        updates.gameMessage += `${currentPlayers[skippedPlayerIndex]?.name ?? 'Next player'} was skipped! `;
                        nextPlayerIndex = getNextPlayerIndex(game.currentPlayerIndex, game.playDirection, 2); // Skip
                        break;
                    case "reverse":
                        updates.playDirection = (game.playDirection * -1) as 1 | -1;
                        // Calculate next player based on the *new* direction
                        nextPlayerIndex = getNextPlayerIndex(game.currentPlayerIndex, updates.playDirection);
                        updates.gameMessage += "Play reversed! ";
                        break;
                    default:
                        // Normal card, turn passes (nextPlayerIndex already calculated above)
                        break;
                }
                updates.players = currentPlayers; // Assign updated players back
                updates.currentPlayerIndex = nextPlayerIndex;
                // Make sure the player name exists before appending 's turn
                const nextPlayerName = currentPlayers[nextPlayerIndex]?.name;
                updates.gameMessage += nextPlayerName ? `${nextPlayerName}'s turn.` : '';

            }

            // Update Firestore
            const gameDocRef = getGameDocRef(gameId);
            await updateDoc(gameDocRef, updates);

        } catch (err) {
            console.error("Error playing card:", err);
            setError("Failed to play card.");
            setLocalUnoButtonPressed(false); // Reset on error
        }
    };

    const selectColor = async (color: Color) => {
        if (!game || !userId || !isAwaitingColorChoice) return;
        setError(null);

        try {
            const currentPlayerIndex = game.currentPlayerIndex; // Index before turn change
            // Safely access discard pile
            const playedCard = (game.discardPile && game.discardPile.length > 0)
                ? game.discardPile[game.discardPile.length - 1]
                : null;


            if (playedCard?.color !== "black") {
                console.error("Tried to select color, but last card wasn't wild.");
                setIsAwaitingColorChoice(false); // Correct state locally
                return;
            }

            let updates: Partial<GameState> = { chosenColor: color };
            let nextPlayerIndex = getNextPlayerIndex(currentPlayerIndex, game.playDirection);
            let newDeck = [...(game.deck || [])];
            let newDiscard = [...(game.discardPile || [])];
            let newPlayers = [...game.players]; // Get current players

            // Apply Draw Four effect *after* color is chosen
            if (playedCard.value === "wild-draw-four") {
                const drawFourResult = drawCardsForPlayer(nextPlayerIndex, 4, newDeck, newDiscard);
                newDeck = drawFourResult.updatedDeck;
                newDiscard = drawFourResult.updatedDiscard;
                // Find the actual index in the current player list
                const playerToDrawIndex = newPlayers.findIndex(p => p.id === game.players[nextPlayerIndex].id);
                if (playerToDrawIndex !== -1) {
                    newPlayers[playerToDrawIndex] = { ...newPlayers[playerToDrawIndex], hand: [...newPlayers[playerToDrawIndex].hand, ...drawFourResult.drawnCards] };
                    updates.players = newPlayers; // Update players array in updates
                    // If the penalized player was in UNO state, clear it
                    if (updates.playerInUnoState === newPlayers[playerToDrawIndex].uid) {
                        updates.playerInUnoState = null;
                    }
                    updates.gameMessage = `${newPlayers[playerToDrawIndex].name} draws 4! `;
                }
                nextPlayerIndex = getNextPlayerIndex(currentPlayerIndex, game.playDirection, 2); // Skip next player
            }

            updates.currentPlayerIndex = nextPlayerIndex;
            const nextPlayerName = newPlayers[nextPlayerIndex]?.name;
            updates.gameMessage = `Color is ${color}. ${nextPlayerName ? `${nextPlayerName}'s turn.` : ''}`;
            updates.deck = newDeck;
            updates.discardPile = newDiscard;

            const gameDocRef = getGameDocRef(gameId);
            await updateDoc(gameDocRef, updates);
            // isAwaitingColorChoice will be set to false by the snapshot listener update

        } catch (err) {
            console.error("Error selecting color:", err);
            setError("Failed to select color.");
        }
    };

    const drawCard = async () => {
        if (!game || !userId || game.status !== "playing" || isAwaitingColorChoice) return;
        const currentPlayer = game.players[game.currentPlayerIndex];
        if (currentPlayer?.uid !== userId) {
            // setError("It's not your turn!"); // Keep error UI
            return; // Return silently
        }
        setError(null);

        try {
            // Ensure deck and discardPile are arrays before passing
            const currentDeck = game.deck || [];
            const currentDiscardPile = game.discardPile || [];
            const drawResult = drawCardsForPlayer(game.currentPlayerIndex, 1, currentDeck, currentDiscardPile);

            if (drawResult.drawnCards.length === 0) {
                setError("Cannot draw card, deck may be empty after potential reshuffle.");
                // Maybe try reshuffle explicitly here if needed? For now, just block.
                return;
            }

            const drawnCard = drawResult.drawnCards[0];
            const newHand = [...currentPlayer.hand, drawnCard];

            const newPlayers = game.players.map((p) =>
                p.uid === userId ? { ...p, hand: newHand } : p
            );

            // Pass the turn
            const newCurrentPlayerIndex = getNextPlayerIndex(
                game.currentPlayerIndex,
                game.playDirection
            );

            const updates: Partial<GameState> = {
                players: newPlayers,
                deck: drawResult.updatedDeck,
                discardPile: drawResult.updatedDiscard, // Update in case of reshuffle
                currentPlayerIndex: newCurrentPlayerIndex,
                gameMessage: `${currentPlayer.name} drew a card. ${newPlayers[newCurrentPlayerIndex]?.name ?? ''}'s turn.`,
                chosenColor: null, // Drawing resets chosen color
                pendingUnoCallCheck: null, // Drawing clears any pending check on self
            };

            // If drawing made player leave UNO state
            if (game.playerInUnoState === userId) {
                updates.playerInUnoState = null;
            }


            const gameDocRef = getGameDocRef(gameId);
            await updateDoc(gameDocRef, updates);
        } catch (err) {
            console.error("Error drawing card:", err);
            setError("Failed to draw card.");
        }
    };

    return {
        game,
        userId,
        error,
        isAwaitingColorChoice,
        startGame,
        playCard,
        drawCard,
        selectColor,
        callUno,
    };
}

