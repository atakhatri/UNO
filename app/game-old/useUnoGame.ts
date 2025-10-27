"use client";

import { useState, useEffect, useCallback } from "react";
import {
    createDeck,
    shuffleDeck,
    drawCards,
    isCardPlayable,
} from "../game-logic";
import type {
    Player,
    Card,
    Color,
    Difficulty,
    AnimatedCard,
} from "./game-types";
import { difficultySettings } from "./game-types";

const ANIMATION_DURATION = 500; // ms

/**
 * This custom hook encapsulates all the core logic and state for the Uno game.
 * The UI component (`page.tsx`) will consume this hook to get state and interact with the game.
 *
 * @param numPlayers - The total number of players (including human).
 * @param difficulty - The selected game difficulty.
 * @returns An object containing game state and functions to dispatch game actions.
 */
export function useUnoGame(numPlayers: number, difficulty: Difficulty) {
    const [players, setPlayers] = useState<Player[]>([]);
    const [deck, setDeck] = useState<Card[]>([]);
    const [discardPile, setDiscardPile] = useState<Card[]>([]);
    const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
    const [playDirection, setPlayDirection] = useState<1 | -1>(1);
    const [winner, setWinner] = useState<Player | null>(null);

    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const [playedWildCard, setPlayedWildCard] = useState<Card | null>(null);
    const [isUnoState, setIsUnoState] = useState(false); // Player 0 has one card left
    const [playerCalledUno, setPlayerCalledUno] = useState(false); // Player 0 called UNO

    const [gameMessage, setGameMessage] = useState<string | null>(null);
    const [animatedCard, setAnimatedCard] = useState<AnimatedCard | null>(null);

    const isPlayerTurn = players[currentPlayerIndex]?.isComputer === false;
    const topOfDiscard = discardPile[discardPile.length - 1];

    /**
     * Reshuffles the discard pile (except the top card) into a new deck.
     * This is a helper function used when the deck runs out.
     */
    const reshuffleDeck = useCallback(() => {
        const topCard = discardPile[discardPile.length - 1];
        const restOfPile = discardPile.slice(0, -1);
        const newDeck = shuffleDeck(restOfPile);

        setDeck(newDeck);
        setDiscardPile([topCard]);
        setGameMessage("Deck reshuffled!");
        return newDeck;
    }, [discardPile]);

    /**
     * Advances the turn to the next player.
     * @param skip - The number of players to skip (default is 1).
     */
    const endTurn = useCallback(
        (skip = 1) => {
            // Check if the current player *should* have called UNO
            const currentPlayer = players[currentPlayerIndex];
            if (currentPlayer?.hand.length === 1) {
                if (currentPlayer.id === 0 && !playerCalledUno) {
                    // Human player forgot to call UNO!
                    setGameMessage("You forgot to call UNO! Draw 2.");
                    // We need to draw cards *before* ending the turn.
                    // This logic is complex to handle here, so it's handled in `playCard` instead.
                } else if (currentPlayer.isComputer) {
                    // Computer "calls" UNO
                    setGameMessage(`Player ${currentPlayer.id + 1} calls UNO!`);
                }
            }

            // Reset UNO call state for the *next* player's turn
            if (currentPlayer.id === 0) {
                setPlayerCalledUno(false);
            }

            const nextIndex =
                (currentPlayerIndex + playDirection * skip + players.length) %
                players.length;
            setCurrentPlayerIndex(nextIndex);
        },
        [currentPlayerIndex, playDirection, players, playerCalledUno]
    );

    /**
     * Handles the logic for a player (or computer) drawing a card from the deck.
     * @param playerIndex - The index of the player who will draw.
     * @param count - The number of cards to draw.
     */
    const drawCardFromDeck = useCallback(
        (playerIndex: number, count: number) => {
            let currentDeck = deck;
            if (currentDeck.length < count) {
                currentDeck = reshuffleDeck();
            }

            const { drawn, remaining } = drawCards(currentDeck, count);

            // Trigger animation for each card drawn (simplified to one animation)
            setAnimatedCard({
                card: drawn[0], // Show animation for the first card
                from: "deck",
                to: playerIndex === 0 ? "player" : "opponent",
                playerId: playerIndex,
            });

            setTimeout(() => {
                setPlayers((prevPlayers) =>
                    prevPlayers.map((p, i) =>
                        i === playerIndex ? { ...p, hand: [...p.hand, ...drawn] } : p
                    )
                );
                setDeck(remaining);
                if (playerIndex === 0) {
                    setIsUnoState(false); // Drawing a card negates UNO state
                }
                setAnimatedCard(null);

                // If the draw was NOT from a card effect (e.g., manual draw), end the turn.
                // This is now handled by the `drawCard` function exposed to the UI.
            }, ANIMATION_DURATION);
        },
        [deck, reshuffleDeck]
    );

    /**
     * Applies the special effect of a played card (e.g., Draw Two, Skip, Wild).
     * @param card - The card whose effect is being applied.
     * @param chosenColor - The color chosen for a Wild or Wild Draw Four card.
     */
    const applyCardEffect = useCallback(
        (card: Card, chosenColor?: Color) => {
            const nextPlayerIndex =
                (currentPlayerIndex + playDirection + players.length) % players.length;

            switch (card.value) {
                case "draw-two":
                    setGameMessage("Draw Two!");
                    drawCardFromDeck(nextPlayerIndex, 2);
                    endTurn(2); // Skip next player
                    break;
                case "skip":
                    setGameMessage("Skip!");
                    endTurn(2); // Skip next player
                    break;
                case "reverse":
                    setGameMessage("Reverse!");
                    if (players.length === 2) {
                        endTurn(2); // Acts like a skip in a 2-player game
                    } else {
                        setPlayDirection((prev) => (prev * -1) as 1 | -1);
                        endTurn();
                    }
                    break;
                case "wild":
                    if (!chosenColor) break; // Should not happen
                    setGameMessage(`Color changed to ${chosenColor}!`);
                    setDiscardPile((prev) => [
                        ...prev.slice(0, -1),
                        { ...card, color: chosenColor },
                    ]);
                    endTurn();
                    break;
                case "wild-draw-four":
                    if (!chosenColor) break; // Should not happen
                    setGameMessage(`Wild Draw Four! Color is ${chosenColor}!`);
                    setDiscardPile((prev) => [
                        ...prev.slice(0, -1),
                        { ...card, color: chosenColor },
                    ]);
                    drawCardFromDeck(nextPlayerIndex, 4);
                    endTurn(2); // Skip next player
                    break;
                default:
                    endTurn(); // No special effect
            }
        },
        [currentPlayerIndex, drawCardFromDeck, endTurn, playDirection, players.length]
    );

    /**
     * Main function to play a card from a player's hand.
     * @param card - The card being played.
     * @param handIndex - The index of the card in the player's hand.
     */
    const playCard = useCallback(
        (card: Card, handIndex: number) => {
            if (winner) return;
            if (players[currentPlayerIndex]?.isComputer) return; // Block human play on computer turn

            if (!isCardPlayable(card, topOfDiscard)) {
                setGameMessage("You can't play that card!");
                return;
            }

            const currentPlayer = players[currentPlayerIndex];
            const newHand = [...currentPlayer.hand];
            newHand.splice(handIndex, 1);

            // Check for UNO call penalty
            if (newHand.length === 1 && !playerCalledUno) {
                setGameMessage("Forgot to call UNO! Drawing 2 cards.");
                let currentDeck = deck;
                if (currentDeck.length < 2) {
                    currentDeck = reshuffleDeck();
                }
                const { drawn, remaining } = drawCards(currentDeck, 2);
                newHand.push(...drawn); // Add penalty cards
                setDeck(remaining);
            }

            // Reset UNO state after play is complete
            setPlayerCalledUno(false);
            if (newHand.length !== 1) {
                setIsUnoState(false);
            }

            setAnimatedCard({
                card,
                from: "player",
                to: "discard",
                playerId: currentPlayer.id,
            });

            setTimeout(() => {
                setPlayers((prevPlayers) =>
                    prevPlayers.map((p, i) =>
                        i === currentPlayerIndex ? { ...p, hand: newHand } : p
                    )
                );
                setDiscardPile((prev) => [...prev, card]);
                setAnimatedCard(null);

                if (newHand.length === 0) {
                    setWinner(currentPlayer);
                    return;
                }

                if (card.color === "black") {
                    setPlayedWildCard(card);
                    setIsColorPickerOpen(true);
                } else {
                    applyCardEffect(card);
                }
            }, ANIMATION_DURATION);
        },
        [
            winner,
            players,
            currentPlayerIndex,
            topOfDiscard,
            playerCalledUno,
            deck,
            reshuffleDeck,
            applyCardEffect,
        ]
    );

    /**
     * The "public" function for the human player to draw a card.
     * This action ends the player's turn.
     */
    const drawCard = useCallback(() => {
        if (!isPlayerTurn || winner) return;

        let currentDeck = deck;
        if (currentDeck.length === 0) {
            currentDeck = reshuffleDeck();
        }
        const { drawn, remaining } = drawCards(currentDeck, 1);

        setAnimatedCard({
            card: drawn[0],
            from: "deck",
            to: "player",
            playerId: 0,
        });

        setTimeout(() => {
            setPlayers((prevPlayers) =>
                prevPlayers.map((p, i) =>
                    i === 0 ? { ...p, hand: [...p.hand, ...drawn] } : p
                )
            );
            setDeck(remaining);
            setIsUnoState(false); // Drawing a card negates UNO state
            setAnimatedCard(null);
            setGameMessage("You drew a card.");
            endTurn(); // Pass turn after drawing
        }, ANIMATION_DURATION);
    }, [isPlayerTurn, winner, deck, reshuffleDeck, endTurn]);

    /**
     * Handles the computer player's turn logic.
     */
    const computerTurnLogic = useCallback(() => {
        if (winner || isPlayerTurn) return;

        const computerPlayer = players[currentPlayerIndex];

        // --- Smarter AI Logic ---
        let cardToPlay: Card | null = null;
        let playableCardIndex = -1;

        // 1. Find all playable cards
        const playableCards = computerPlayer.hand
            .map((card, index) => ({ card, index }))
            .filter(({ card }) => isCardPlayable(card, topOfDiscard));

        if (playableCards.length > 0) {
            // Simple strategy: play the first playable card
            // (Original logic was good, let's keep it)
            const colorMatch = playableCards.find(
                ({ card }) => card.color === topOfDiscard.color
            );
            if (colorMatch) {
                cardToPlay = colorMatch.card;
                playableCardIndex = colorMatch.index;
            } else {
                const valueMatch = playableCards.find(
                    ({ card }) =>
                        card.value === topOfDiscard.value && card.color !== "black"
                );
                if (valueMatch) {
                    cardToPlay = valueMatch.card;
                    playableCardIndex = valueMatch.index;
                } else {
                    const wildCard = playableCards.find(
                        ({ card }) => card.color === "black"
                    );
                    if (wildCard) {
                        cardToPlay = wildCard.card;
                        playableCardIndex = wildCard.index;
                    }
                }
            }
        }

        // If a playable card was found
        if (cardToPlay && playableCardIndex !== -1) {
            const newHand = [...computerPlayer.hand];
            newHand.splice(playableCardIndex, 1);

            setAnimatedCard({
                card: cardToPlay,
                from: "opponent",
                to: "discard",
                playerId: computerPlayer.id,
            });

            setTimeout(() => {
                setPlayers((prevPlayers) =>
                    prevPlayers.map((p, i) =>
                        i === currentPlayerIndex ? { ...p, hand: newHand } : p
                    )
                );
                setDiscardPile((prev) => [...prev, cardToPlay!]);
                setAnimatedCard(null);

                if (newHand.length === 0) {
                    setWinner(computerPlayer);
                    return;
                }

                if (cardToPlay!.color === "black") {
                    // AI chooses the color it has the most of
                    const colorCounts: Record<string, number> = {
                        red: 0,
                        green: 0,
                        blue: 0,
                        yellow: 0,
                    };
                    newHand.forEach((c) => {
                        if (c.color !== "black") {
                            colorCounts[c.color]++;
                        }
                    });
                    const chosenColor = Object.keys(colorCounts).reduce(
                        (a, b) => (colorCounts[a] > colorCounts[b] ? a : b),
                        "red"
                    ) as Color;
                    applyCardEffect(cardToPlay!, chosenColor);
                } else {
                    applyCardEffect(cardToPlay!);
                }
            }, ANIMATION_DURATION);
        } else {
            // Computer has no playable card, must draw
            setGameMessage(`Player ${computerPlayer.id + 1} is drawing a card.`);
            let currentDeck = deck;
            if (currentDeck.length === 0) {
                currentDeck = reshuffleDeck();
            }
            const { drawn, remaining } = drawCards(currentDeck, 1);

            setAnimatedCard({
                card: drawn[0],
                from: "deck",
                to: "opponent",
                playerId: computerPlayer.id,
            });

            setTimeout(() => {
                setPlayers((prevPlayers) =>
                    prevPlayers.map((p, i) =>
                        i === currentPlayerIndex
                            ? { ...p, hand: [...p.hand, ...drawn] }
                            : p
                    )
                );
                setDeck(remaining);
                setAnimatedCard(null);
                endTurn(); // End turn after drawing
            }, ANIMATION_DURATION);
        }
    }, [
        winner,
        isPlayerTurn,
        players,
        currentPlayerIndex,
        topOfDiscard,
        deck,
        reshuffleDeck,
        applyCardEffect,
        endTurn,
    ]);

    /**
     * Handles the human player clicking the "UNO!" button.
     */
    const callUno = () => {
        if (players[0]?.hand.length === 2) {
            setGameMessage("UNO!");
            setPlayerCalledUno(true);
            setIsUnoState(true);
        }
    };

    /**
     * Handles the human player selecting a color after playing a wild card.
     * @param color - The selected color.
     */
    const selectColor = (color: Color) => {
        if (playedWildCard) {
            applyCardEffect(playedWildCard, color);
            setIsColorPickerOpen(false);
            setPlayedWildCard(null);
        }
    };

    /**
     * Initializes or resets the game to its starting state.
     */
    const startGame = useCallback(() => {
        const settings =
            difficultySettings[difficulty] || difficultySettings.medium;
        let currentDeck = shuffleDeck(createDeck());

        const newPlayers: Player[] = [];
        for (let i = 0; i < numPlayers; i++) {
            const { drawn, remaining } = drawCards(
                currentDeck,
                i === 0 ? settings.playerCards : settings.computerCards
            );
            newPlayers.push({
                id: i,
                hand: drawn,
                isComputer: i !== 0,
            });
            currentDeck = remaining;
        }

        // Start discard pile with a non-wild card
        let firstCard: Card;
        do {
            const { drawn, remaining } = drawCards(currentDeck, 1);
            firstCard = drawn[0];
            currentDeck = remaining;
        } while (
            firstCard.value === "wild" ||
            firstCard.value === "wild-draw-four"
        );

        setDiscardPile([firstCard]);
        setDeck(currentDeck);
        setPlayers(newPlayers);
        setCurrentPlayerIndex(0);
        setPlayDirection(1);
        setWinner(null);
        setIsUnoState(false);
        setPlayerCalledUno(false);
        setIsColorPickerOpen(false);
        setPlayedWildCard(null);
        setGameMessage("Game started!");
    }, [difficulty, numPlayers]);

    // Effect to start the game on hook initialization
    useEffect(() => {
        startGame();
    }, [startGame]);

    // Effect to trigger the computer's turn
    useEffect(() => {
        if (players[currentPlayerIndex]?.isComputer && !winner && !animatedCard) {
            const timer = setTimeout(() => {
                computerTurnLogic();
            }, 1000); // 1-second delay for the computer to "think"

            return () => clearTimeout(timer);
        }
    }, [currentPlayerIndex, winner, players, animatedCard, computerTurnLogic]);

    return {
        // Game State
        players,
        deck,
        discardPile,
        topOfDiscard,
        currentPlayerIndex,
        winner,
        isColorPickerOpen,
        isUnoState,
        playerCalledUno,
        gameMessage,
        animatedCard,
        isPlayerTurn,

        // Game Handlers
        playCard,
        drawCard,
        callUno,
        selectColor,
        startGame,
        setGameMessage,
    };
}
