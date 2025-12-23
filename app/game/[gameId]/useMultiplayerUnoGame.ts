"use client";

import { useState, useEffect, useCallback } from "react";
import { GameState, Player, Color } from "../game-types";
import type { Card } from "../../game-logic";
import {
    createDeck,
    shuffleDeck,
    drawCards,
    isCardPlayable,
} from "../../game-logic";
import { db, getUserId, getGameDocRef } from "../../lib/firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";

export function useMultiplayerUnoGame(gameId: string) {
    const [game, setGame] = useState<GameState | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isAwaitingColorChoice, setIsAwaitingColorChoice] = useState(false);
    const [localUnoButtonPressed, setLocalUnoButtonPressed] = useState(false);

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

    useEffect(() => {
        if (!gameId) return;
        const gameDocRef = getGameDocRef(gameId);
        const unsubscribe = onSnapshot(
            gameDocRef,
            (doc) => {
                if (doc.exists()) {
                    const gameData = doc.data() as GameState;
                    setGame(gameData);
                    setError(null);

                    const isMyTurnNow =
                        gameData.status === "playing" &&
                        userId &&
                        gameData.players[gameData.currentPlayerIndex]?.uid === userId;

                    const topCard = (gameData.discardPile && gameData.discardPile.length > 0)
                        ? gameData.discardPile[gameData.discardPile.length - 1]
                        : null;

                    setIsAwaitingColorChoice(
                        Boolean(isMyTurnNow && topCard?.color === "black" && !gameData.chosenColor)
                    );

                    if (isMyTurnNow) {
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
    }, [gameId, userId]);

    useEffect(() => {
        if (!game || game.status !== 'playing' || !userId) return;

        if (game.pendingUnoCallCheck) {
            const playerToCheckUid = game.pendingUnoCallCheck;
            const isMyTurnNow = game.players[game.currentPlayerIndex]?.uid === userId;

            if (isMyTurnNow) {
                console.log(`Player ${userId} is now checking UNO status for ${playerToCheckUid}`);
                const playerToCheckIndex = game.players.findIndex(p => p.uid === playerToCheckUid);
                const playerToCheck = game.players[playerToCheckIndex];

                if (playerToCheck && playerToCheck.hand.length === 1) {
                    console.log(`Applying UNO penalty to ${playerToCheck.name} (UID: ${playerToCheckUid})`);
                    applyUnoPenalty(playerToCheckIndex);
                } else {
                    console.log(`Clearing UNO check for ${playerToCheckUid} - penalty not needed or already applied.`);
                    clearUnoCheck();
                }
            }
        }
    }, [game?.currentPlayerIndex, game?.pendingUnoCallCheck, game?.players, gameId, userId]);

    const handleReshuffle = (currentDiscardPile: Card[]): Card[] => {
        if (currentDiscardPile.length <= 1) return [];
        console.log("Reshuffling deck...");
        const topCard = currentDiscardPile[currentDiscardPile.length - 1];
        const restOfPile = currentDiscardPile.slice(0, -1);
        const newDeck = shuffleDeck(restOfPile);
        return newDeck;
    };

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
            if (reshuffled.length < count) {
                console.error(`Not enough cards to draw ${count} even after reshuffle!`);
                const remainingCards = reshuffled;
                deckToDrawFrom = [];
                discardToUse = discardToUse.length > 0 ? [discardToUse[discardToUse.length - 1]] : [];
                return { drawnCards: remainingCards, updatedDeck: deckToDrawFrom, updatedDiscard: discardToUse };

            }
            deckToDrawFrom = reshuffled;
            discardToUse = discardToUse.length > 0 ? [discardToUse[discardToUse.length - 1]] : [];
        }
        const { drawn, remaining } = drawCards(deckToDrawFrom, count);
        return { drawnCards: drawn, updatedDeck: remaining, updatedDiscard: discardToUse };
    };

    const applyUnoPenalty = async (playerIndex: number) => {
        if (!game || playerIndex < 0 || playerIndex >= game.players.length) return;

        try {
            const playerToPenalize = game.players[playerIndex];
            const gameDocRef = getGameDocRef(gameId);

            const { drawnCards, updatedDeck, updatedDiscard } = drawCardsForPlayer(
                playerIndex,
                2,
                game.deck || [],
                game.discardPile || []
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
                    discardPile: updatedDiscard,
                    pendingUnoCallCheck: null,
                    gameMessage: `${playerToPenalize.name} forgot to call UNO! Draws 2.`,
                    playerInUnoState: null,
                    chosenColor: game.chosenColor,
                });
            } else {
                await clearUnoCheck();
            }

        } catch (err) {
            console.error("Error applying UNO penalty:", err);
            await clearUnoCheck();
        }
    };

    const clearUnoCheck = async () => {
        if (!gameId) return;
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

    const startGame = async () => {
        if (!game || !userId || game.hostId !== userId || game.status !== "waiting" || game.players.length < 2) {
            setError("Cannot start game. Ensure you are the host, game is waiting, and >= 2 players.");
            return;
        }
        if (!game.players.every((p) => p.uid && p.name)) {
            setError("Some players are missing info.");
            return;
        }
        setError(null);

        try {
            let currentDeck = shuffleDeck(createDeck());
            const newPlayers: Player[] = [];
            let playerCounter = 0;

            for (const player of game.players) {
                const { drawn, remaining } = drawCards(currentDeck, 7);
                newPlayers.push({
                    ...player,
                    id: playerCounter++,
                    hand: drawn,
                });
                currentDeck = remaining;
            }

            let firstCard: Card | null = null;
            let discardPileSetup: Card[] = [];
            do {
                if (currentDeck.length === 0) {
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
                firstCard = drawn[0];
                currentDeck = remaining;
                if (firstCard.color !== "black") {
                    discardPileSetup = [firstCard];
                }
            } while (firstCard.color === "black");


            const gameDocRef = getGameDocRef(gameId);
            await updateDoc(gameDocRef, {
                status: "playing",
                players: newPlayers,
                deck: currentDeck,
                discardPile: discardPileSetup,
                currentPlayerIndex: 0,
                playDirection: 1,
                gameMessage: `${newPlayers[0].name}'s turn!`,
                chosenColor: null,
                winnerId: null,
                playerInUnoState: null,
                pendingUnoCallCheck: null,
            });
        } catch (err) {
            console.error("Error starting game:", err);
            setError("Failed to start the game.");
        }
    };

    const callUno = () => {
        const isPlayerTurn = game?.status === 'playing' && game.players[game.currentPlayerIndex]?.uid === userId;

        if (!game || !userId || !isPlayerTurn) return;

        const player = game.players.find(p => p.uid === userId);
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
            return;
        }

        const topOfDiscardCheck = (game.discardPile && game.discardPile.length > 0)
            ? game.discardPile[game.discardPile.length - 1]
            : null;

        const effectiveColor = game.chosenColor ?? topOfDiscardCheck?.color;

        const effectiveTopOfDiscard = topOfDiscardCheck
            ? { ...topOfDiscardCheck, color: effectiveColor ?? topOfDiscardCheck.color } : null;


        if (effectiveTopOfDiscard && !isCardPlayable(card, effectiveTopOfDiscard)) {
            setError("You can't play that card!");
            setTimeout(() => setError(null), 2000);
            return;
        }
        setError(null);


        try {
            const newHand = [...currentPlayer.hand];
            newHand.splice(cardIndex, 1);

            let updates: Partial<GameState> = {
                players: game.players.map((p) =>
                    p.uid === userId ? { ...p, hand: newHand } : p
                ),
                discardPile: [...(game.discardPile || []), card],
                deck: [...(game.deck || [])],
                chosenColor: null,
                gameMessage: "",
                pendingUnoCallCheck: null,
                playDirection: game.playDirection,
            };

            updates.animatedCard = {
                id: `${Date.now()}-${card.value}`,
                card: card,
                type: "play",
            };

            if (currentPlayer.hand.length === 2 && newHand.length === 1) {
                if (localUnoButtonPressed) {
                    console.log("UNO called successfully by", currentPlayer.name);
                    updates.playerInUnoState = userId;
                    updates.pendingUnoCallCheck = null;
                    updates.gameMessage = `${currentPlayer.name} calls UNO! `;
                } else {
                    console.log(currentPlayer.name, "did NOT call UNO!");
                    updates.playerInUnoState = null;
                    updates.pendingUnoCallCheck = userId;
                    updates.gameMessage = `${currentPlayer.name} has one card left! `;
                }
            } else if (newHand.length !== 1 && game.playerInUnoState === userId) {
                console.log(currentPlayer.name, "is no longer in UNO state.");
                updates.playerInUnoState = null;
            } else {
                updates.playerInUnoState = game.playerInUnoState;
            }
            setLocalUnoButtonPressed(false);


            if (newHand.length === 0) {
                updates.status = "finished";
                updates.winnerId = userId;
                updates.gameMessage += `${currentPlayer.name} Wins!`;
                updates.playerInUnoState = null;
                updates.pendingUnoCallCheck = null;
                const gameDocRef = getGameDocRef(gameId);
                await updateDoc(gameDocRef, updates);
                return;
            }

            let nextPlayerIndex = getNextPlayerIndex(
                game.currentPlayerIndex,
                game.playDirection
            );
            let currentPlayers = updates.players!;


            if (card.color === "black") {
                updates.currentPlayerIndex = game.currentPlayerIndex;
                updates.gameMessage += `Choose a color.`;
            } else {
                let drewCardsResult: { drawnCards: Card[], updatedDeck: Card[], updatedDiscard: Card[] } | null = null;
                switch (card.value) {
                    case "draw-two":
                        drewCardsResult = drawCardsForPlayer(nextPlayerIndex, 2, updates.deck!, updates.discardPile!);
                        updates.deck = drewCardsResult.updatedDeck;
                        updates.discardPile = drewCardsResult.updatedDiscard;
                        const playerToDrawIndex = currentPlayers.findIndex(p => p.id === game.players[nextPlayerIndex].id);
                        if (playerToDrawIndex !== -1) {
                            currentPlayers[playerToDrawIndex] = {
                                ...currentPlayers[playerToDrawIndex],
                                hand: [...currentPlayers[playerToDrawIndex].hand, ...drewCardsResult.drawnCards]
                            };
                            if (updates.playerInUnoState === currentPlayers[playerToDrawIndex].uid) {
                                updates.playerInUnoState = null;
                            }
                            updates.gameMessage += `${currentPlayers[playerToDrawIndex].name} draws 2! `;
                        }
                        nextPlayerIndex = getNextPlayerIndex(game.currentPlayerIndex, game.playDirection, 2);
                        break;
                    case "skip":
                        const skippedPlayerIndex = nextPlayerIndex;
                        updates.gameMessage += `${currentPlayers[skippedPlayerIndex]?.name ?? 'Next player'} was skipped! `;
                        nextPlayerIndex = getNextPlayerIndex(game.currentPlayerIndex, game.playDirection, 2);
                        break;
                    case "reverse":
                        updates.playDirection = (game.playDirection * -1) as 1 | -1;
                        nextPlayerIndex = getNextPlayerIndex(game.currentPlayerIndex, updates.playDirection);
                        updates.gameMessage += "Play reversed! ";
                        break;
                    default:
                        break;
                }
                updates.players = currentPlayers;
                updates.currentPlayerIndex = nextPlayerIndex;
                const nextPlayerName = currentPlayers[nextPlayerIndex]?.name;
                updates.gameMessage += nextPlayerName ? `${nextPlayerName}'s turn.` : '';

            }
            const gameDocRef = getGameDocRef(gameId);
            await updateDoc(gameDocRef, updates);

            setTimeout(() => {
                updateDoc(gameDocRef, { animatedCard: null });
            }, 400);

        } catch (err) {
            console.error("Error playing card:", err);
            setError("Failed to play card.");
            setLocalUnoButtonPressed(false);
        }
    };

    const selectColor = async (color: Color) => {
        if (!game || !userId || !isAwaitingColorChoice) return;
        setError(null);

        try {
            const currentPlayerIndex = game.currentPlayerIndex;
            const playedCard = (game.discardPile && game.discardPile.length > 0)
                ? game.discardPile[game.discardPile.length - 1]
                : null;


            if (playedCard?.color !== "black") {
                console.error("Tried to select color, but last card wasn't wild.");
                setIsAwaitingColorChoice(false);
                return;
            }

            let updates: Partial<GameState> = { chosenColor: null };
            let nextPlayerIndex = getNextPlayerIndex(currentPlayerIndex, game.playDirection);
            let newDeck = [...(game.deck || [])];
            let newDiscard = [...(game.discardPile || [])];
            let newPlayers = [...game.players];

            if (newDiscard.length > 0) {
                const lastIndex = newDiscard.length - 1;
                newDiscard[lastIndex] = { ...newDiscard[lastIndex], color: color };
            }

            if (playedCard.value === "wild-draw-four") {
                const drawFourResult = drawCardsForPlayer(nextPlayerIndex, 4, newDeck, newDiscard);
                newDeck = drawFourResult.updatedDeck;
                newDiscard = drawFourResult.updatedDiscard;
                const playerToDrawIndex = newPlayers.findIndex(p => p.id === game.players[nextPlayerIndex].id);
                if (playerToDrawIndex !== -1) {
                    newPlayers[playerToDrawIndex] = { ...newPlayers[playerToDrawIndex], hand: [...newPlayers[playerToDrawIndex].hand, ...drawFourResult.drawnCards] };
                    updates.players = newPlayers;
                    if (updates.playerInUnoState === newPlayers[playerToDrawIndex].uid) {
                        updates.playerInUnoState = null;
                    }
                    updates.gameMessage = `${newPlayers[playerToDrawIndex].name} draws 4! `;
                }
                nextPlayerIndex = getNextPlayerIndex(currentPlayerIndex, game.playDirection, 2);
            }

            updates.currentPlayerIndex = nextPlayerIndex;
            const nextPlayerName = newPlayers[nextPlayerIndex]?.name;
            updates.gameMessage = `Color is ${color}. ${nextPlayerName ? `${nextPlayerName}'s turn.` : ''}`;
            updates.deck = newDeck;
            updates.discardPile = newDiscard;

            const gameDocRef = getGameDocRef(gameId);
            await updateDoc(gameDocRef, updates);

        } catch (err) {
            console.error("Error selecting color:", err);
            setError("Failed to select color.");
        }
    };

    const drawCard = async () => {
        if (!game || !userId || game.status !== "playing" || isAwaitingColorChoice) return;
        const currentPlayer = game.players[game.currentPlayerIndex];
        if (currentPlayer?.uid !== userId) {
            return;
        }
        setError(null);

        try {
            const currentDeck = game.deck || [];
            const currentDiscardPile = game.discardPile || [];
            const drawResult = drawCardsForPlayer(game.currentPlayerIndex, 1, currentDeck, currentDiscardPile);

            if (drawResult.drawnCards.length === 0) {
                setError("Cannot draw card, deck may be empty after potential reshuffle.");
                return;
            }

            const drawnCard = drawResult.drawnCards[0];
            const newHand = [...currentPlayer.hand, drawnCard];

            const newPlayers = game.players.map((p) =>
                p.uid === userId ? { ...p, hand: newHand } : p
            );

            const newCurrentPlayerIndex = getNextPlayerIndex(
                game.currentPlayerIndex,
                game.playDirection
            );

            const updates: Partial<GameState> = {
                players: newPlayers,
                deck: drawResult.updatedDeck,
                discardPile: drawResult.updatedDiscard,
                currentPlayerIndex: newCurrentPlayerIndex,
                gameMessage: `${currentPlayer.name} drew a card. ${newPlayers[newCurrentPlayerIndex]?.name ?? ''}'s turn.`,
                chosenColor: game.chosenColor,
                pendingUnoCallCheck: null,
            };

            if (game.playerInUnoState === userId) {
                updates.playerInUnoState = null;
            }

            updates.animatedCard = {
                id: `${Date.now()}-draw`,
                card: drawnCard,
                type: "draw",
            };

            const gameDocRef = getGameDocRef(gameId);
            await updateDoc(gameDocRef, updates);
        } catch (err) {
            console.error("Error drawing card:", err);
            setError("Failed to draw card.");
        }
        setTimeout(() => {
            const gameDocRef = getGameDocRef(gameId);
            updateDoc(gameDocRef, { animatedCard: null });
        }, 400);
    };

    const leaveGame = async () => {
        if (!game || !userId) return;

        const leavingPlayerIndex = game.players.findIndex((p) => p.uid === userId);
        if (leavingPlayerIndex === -1) {
            console.error("Player trying to leave was not found in game.");
            return;
        }

        const updatedPlayers = game.players.filter((p) => p.uid !== userId);

        if (game.status === "waiting") {
            const gameDocRef = getGameDocRef(gameId);
            await updateDoc(gameDocRef, { players: updatedPlayers });
            return;
        }

        const updates: Partial<GameState> = { players: updatedPlayers };

        if (updatedPlayers.length < 2) {
            updates.status = "finished";
            updates.winnerId = updatedPlayers[0]?.uid ?? null;
            updates.gameMessage = `${updatedPlayers[0]?.name ?? "The last player"} wins!`;
        } else {
            let newCurrentPlayerIndex = game.currentPlayerIndex;

            if (leavingPlayerIndex === game.currentPlayerIndex) {

                newCurrentPlayerIndex = leavingPlayerIndex % updatedPlayers.length;
            }
            else if (leavingPlayerIndex < game.currentPlayerIndex) {
                newCurrentPlayerIndex = game.currentPlayerIndex - 1;
            }

            updates.currentPlayerIndex = newCurrentPlayerIndex;
            updates.gameMessage = `${game.players[leavingPlayerIndex].name} left the game.`;
        }

        try {
            const gameDocRef = getGameDocRef(gameId);
            await updateDoc(gameDocRef, updates);
        } catch (err) {
            console.error("Error updating game after player left:", err);
            setError("Failed to update game state after leaving.");
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
        leaveGame,
    };
}
