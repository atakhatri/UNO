"use client";

import { useState, useEffect, useCallback } from "react";
import {
    createDeck,
    shuffleDeck,
    drawCards,
    isCardPlayable,
    Card, // Keep this import from game-logic
} from "../game-logic"; // Correct path to game-logic
import type { Player, Color, Difficulty } from "./game-types";
import { difficultySettings } from "./game-types";
import type { AnimatedCard } from "../game/game-types"; // Import from the correct file

const ANIMATION_DURATION = 500; // ms

// --- Rest of the hook code remains the same ---
// ... (Keep the existing logic from your uploaded game-old/useUnoGame.ts) ...

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
        console.log("Reshuffling deck...");
        if (discardPile.length <= 1) {
            console.warn("Not enough cards in discard pile to reshuffle.");
            return []; // Return empty deck if can't reshuffle
        }
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
            if (currentPlayer?.id === 0) {
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
     * @returns The updated deck after drawing.
     */
    const drawCardFromDeck = useCallback(
        (playerIndex: number, count: number): Card[] => {
            let currentDeck = [...deck]; // Create mutable copy
            if (currentDeck.length < count) {
                const reshuffled = reshuffleDeck();
                if (reshuffled.length < count) {
                    console.error("Not enough cards to draw even after reshuffle!");
                    setGameMessage("Not enough cards left!");
                    // Maybe end game or handle differently
                    return []; // Return empty deck
                }
                currentDeck = reshuffled;
            }


            const { drawn, remaining } = drawCards(currentDeck, count);

            // Trigger animation (simplified)
            if (drawn.length > 0) {
                setAnimatedCard({
                    id: `${Date.now()}-draw`,
                    card: drawn[0],
                    type: "draw",
                });
            }


            setTimeout(() => {
                setPlayers((prevPlayers) =>
                    prevPlayers.map((p, i) =>
                        i === playerIndex ? { ...p, hand: [...p.hand, ...drawn] } : p
                    )
                );
                setDeck(remaining);
                setAnimatedCard(null);
            }, ANIMATION_DURATION);

            return remaining; // Return the updated deck state
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
            const nextPlayerIndex = getNextPlayerIndex(
                currentPlayerIndex,
                playDirection
            );


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
                        const newDirection = (playDirection * -1) as 1 | -1;
                        setPlayDirection(newDirection);
                        // End turn based on new direction
                        setCurrentPlayerIndex(
                            (currentPlayerIndex + newDirection + players.length) % players.length
                        );

                    }
                    break;
                case "wild":
                    if (!chosenColor) {
                        console.error("Chosen color missing for wild card effect");
                        endTurn(); // Just end turn if color somehow missing
                        break;
                    }
                    setGameMessage(`Color changed to ${chosenColor}!`);
                    // Update the card in the discard pile state *after* timeout
                    // We already pushed the black card, now replace it
                    setDiscardPile((prev) => [
                        ...prev.slice(0, -1),
                        { ...card, color: chosenColor },
                    ]);
                    endTurn();
                    break;
                case "wild-draw-four":
                    if (!chosenColor) {
                        console.error("Chosen color missing for wild-draw-four effect");
                        endTurn(); // Just end turn if color somehow missing
                        break;
                    }
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

    // Helper to get next player index easily
    const getNextPlayerIndex = (
        currentIndex: number,
        direction: 1 | -1,
        skip = 1
    ): number => {
        if (!players.length) return 0;
        return (
            (currentIndex + direction * skip + players.length) % players.length
        );
    };


    /**
     * Main function to play a card from a player's hand.
     * @param card - The card being played.
     * @param handIndex - The index of the card in the player's hand.
     */
    const playCard = useCallback(
        (card: Card, handIndex: number) => {
            if (winner || !isPlayerTurn) return; // Check if it's player's turn

            if (!isCardPlayable(card, topOfDiscard)) {
                setGameMessage("You can't play that card!");
                // Use timeout to clear the message
                setTimeout(() => setGameMessage(null), 1500);
                return;
            }

            const currentPlayer = players[currentPlayerIndex];
            let newHand = [...currentPlayer.hand];
            newHand.splice(handIndex, 1);
            let newDeck = [...deck]; // Copy deck for potential penalty draw


            // Check for UNO call penalty *before* animating
            let drewPenaltyCards = false;
            if (newHand.length === 1 && !playerCalledUno) {
                drewPenaltyCards = true;
                setGameMessage("Forgot to call UNO! Drawing 2 cards.");
                if (newDeck.length < 2) {
                    const reshuffled = reshuffleDeck();
                    if (reshuffled.length < 2) {
                        console.error("Not enough cards for penalty draw!");
                        // Handle this case - maybe can't apply penalty?
                    } else {
                        newDeck = reshuffled;
                    }
                }
                if (newDeck.length >= 2) { // Ensure deck has cards
                    const { drawn, remaining } = drawCards(newDeck, 2);
                    newHand.push(...drawn); // Add penalty cards
                    newDeck = remaining;
                }

            }

            // Update player state immediately before animation (for penalty cards)
            setPlayers((prevPlayers) =>
                prevPlayers.map((p, i) =>
                    i === currentPlayerIndex ? { ...p, hand: newHand } : p
                )
            );
            setDeck(newDeck); // Update deck if penalty cards were drawn

            // Reset playerCalledUno after play attempt (even if penalty)
            setPlayerCalledUno(false);


            setAnimatedCard({
                id: `${Date.now()}-${card.value}`,
                card: card,
                type: "play",
            });

            // Update discard pile after animation
            setTimeout(() => {
                setDiscardPile((prev) => [...prev, card]);
                setAnimatedCard(null);

                // Check for winner *after* animation completes
                if (newHand.length === 0 && !drewPenaltyCards) {
                    setWinner(currentPlayer);
                    setGameMessage(`${currentPlayer.name} Wins! 🎉`);
                    return;
                }

                // Handle effects or open color picker
                if (card.color === "black") {
                    setPlayedWildCard(card);
                    setIsColorPickerOpen(true); // Open picker, effect applied in selectColor
                } else if (!drewPenaltyCards) { // Only apply effect if no penalty draw happened
                    applyCardEffect(card);
                } else {
                    // If penalty was drawn, just end the turn without applying effect
                    endTurn();
                }

            }, ANIMATION_DURATION);
        },
        [
            winner,
            isPlayerTurn,
            players,
            currentPlayerIndex,
            topOfDiscard,
            playerCalledUno,
            deck,
            reshuffleDeck,
            applyCardEffect,
            endTurn // Added endTurn dependency
        ]
    );

    /**
     * The "public" function for the human player to draw a card.
     * This action ends the player's turn.
     */
    const drawCard = useCallback(() => {
        if (!isPlayerTurn || winner) return;

        let currentDeck = [...deck]; // Create mutable copy
        if (currentDeck.length === 0) {
            const reshuffled = reshuffleDeck();
            if (reshuffled.length === 0) {
                console.error("Cannot draw card, deck empty after reshuffle attempt.");
                setGameMessage("No cards left to draw!");
                return;
            }
            currentDeck = reshuffled;
        }
        const { drawn, remaining } = drawCards(currentDeck, 1);

        setAnimatedCard({
            id: `${Date.now()}-draw`,
            card: drawn[0],
            type: "draw",
        });

        setTimeout(() => {
            setPlayers((prevPlayers) =>
                prevPlayers.map((p, i) =>
                    i === 0 ? { ...p, hand: [...p.hand, ...drawn] } : p
                )
            );
            setDeck(remaining);
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
        if (!computerPlayer || !computerPlayer.isComputer) return; // Safety check


        // --- AI Logic ---
        let cardToPlay: Card | null = null;
        let playableCardIndex = -1;

        // Find playable cards
        const playableCards = computerPlayer.hand
            .map((card, index) => ({ card, index }))
            .filter(({ card }) => isCardPlayable(card, topOfDiscard));

        if (playableCards.length > 0) {
            // Prioritize color match, then value match, then wild
            const colorMatch = playableCards.find(
                ({ card }) => card.color === topOfDiscard?.color
            );
            const valueMatch = playableCards.find(
                ({ card }) => card.value === topOfDiscard?.value && card.color !== 'black'
            );
            const wildCard = playableCards.find(
                ({ card }) => card.color === "black"
            );

            if (colorMatch) {
                cardToPlay = colorMatch.card;
                playableCardIndex = colorMatch.index;
            } else if (valueMatch) {
                cardToPlay = valueMatch.card;
                playableCardIndex = valueMatch.index;
            } else if (wildCard) {
                cardToPlay = wildCard.card;
                playableCardIndex = wildCard.index;
            } else {
                // Should be covered by playableCards.length > 0, but as fallback:
                cardToPlay = playableCards[0].card;
                playableCardIndex = playableCards[0].index;
            }
        }


        // Play the chosen card or draw if none found
        if (cardToPlay && playableCardIndex !== -1) {
            const newHand = [...computerPlayer.hand];
            newHand.splice(playableCardIndex, 1);

            // "Call" UNO if applicable
            if (newHand.length === 1) {
                setGameMessage(`Player ${computerPlayer.id + 1} calls UNO!`);
            }


            setAnimatedCard({
                id: `${Date.now()}-${cardToPlay.value}`,
                card: cardToPlay,
                type: "play",
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
                    setGameMessage(`Player ${computerPlayer.id + 1} Wins!`);
                    return;
                }

                if (cardToPlay!.color === "black") {
                    // AI chooses the color it has the most of
                    const colorCounts: Record<string, number> = {
                        red: 0, green: 0, blue: 0, yellow: 0,
                    };
                    newHand.forEach((c) => { if (c.color !== "black") { colorCounts[c.color]++; } });
                    const chosenColor = Object.keys(colorCounts).reduce(
                        (a, b) => (colorCounts[a] > colorCounts[b] ? a : b), "red"
                    ) as Color;
                    applyCardEffect(cardToPlay!, chosenColor);
                } else {
                    applyCardEffect(cardToPlay!);
                }
            }, ANIMATION_DURATION);
        } else {
            // Computer has no playable card, must draw
            setGameMessage(`Player ${computerPlayer.id + 1} is drawing a card.`);
            drawCardFromDeck(currentPlayerIndex, 1);
            // We need to end the turn *after* the draw animation completes
            setTimeout(() => {
                endTurn();
            }, ANIMATION_DURATION + 50); // Add slight delay after animation
        }
    }, [
        winner,
        isPlayerTurn,
        players,
        currentPlayerIndex,
        topOfDiscard,
        drawCardFromDeck, // Use the updated draw function
        applyCardEffect,
        endTurn,
    ]);

    /**
     * Handles the human player clicking the "UNO!" button.
     */
    const callUno = () => {
        // Allow calling UNO if hand count will be 1 *after* playing a card
        // Or if it's currently 2 and they intend to play one.
        // Simplest check: allow if hand count is 2.
        if (players[0]?.hand.length === 2 && isPlayerTurn) {
            setGameMessage("UNO!");
            setPlayerCalledUno(true);
            // Clear message after a bit
            setTimeout(() => setGameMessage(null), 1500);
        } else {
            setGameMessage("You can only call UNO when you have 2 cards!");
            setTimeout(() => setGameMessage(null), 1500);
        }
    };

    /**
     * Handles the human player selecting a color after playing a wild card.
     * @param color - The selected color.
     */
    const selectColor = (color: Color) => {
        if (playedWildCard) {
            // The applyCardEffect needs the *original* black card reference
            // But we update the discard pile with the *colored* version inside applyCardEffect
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
            // Determine card count based on difficulty (example: player 0 gets fewer on hard)
            let cardCount = 7; // Default
            if (i === 0 && difficulty === 'hard') cardCount = 5;
            // if(i !== 0 && difficulty === 'easy') cardCount = 5; // Example: Make AI easier

            const { drawn, remaining } = drawCards(currentDeck, cardCount);
            newPlayers.push({
                id: i,
                uid: `player-${i}`, // Use simple ID for local game
                name: i === 0 ? "You" : `Player ${i + 1}`,
                hand: drawn,
                isComputer: i !== 0,
            });
            currentDeck = remaining;
        }

        // Start discard pile with a non-wild card
        let firstCard: Card;
        do {
            if (currentDeck.length === 0) {
                console.error("Ran out of cards setting up discard pile!");
                // Handle this edge case - maybe just use a default card?
                firstCard = { color: 'red', value: '1' }; // Fallback
                break;
            }
            const { drawn, remaining } = drawCards(currentDeck, 1);
            firstCard = drawn[0];
            currentDeck = remaining;
        } while (
            firstCard.color === "black"
        );

        setDiscardPile([firstCard]);
        setDeck(currentDeck);
        setPlayers(newPlayers);
        setCurrentPlayerIndex(0);
        setPlayDirection(1);
        setWinner(null);
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
        // Only trigger if it's computer's turn, game is playing, no winner, and no animation running
        if (
            gameMessage !== 'Game started!' && // Avoid triggering on initial load message
            players[currentPlayerIndex]?.isComputer &&
            !winner &&
            !animatedCard &&
            !isColorPickerOpen // Don't run if human needs to pick color
        ) {
            const timer = setTimeout(() => {
                computerTurnLogic();
            }, 1000 + Math.random() * 500); // Add slight random delay

            return () => clearTimeout(timer);
        }
    }, [currentPlayerIndex, winner, players, animatedCard, computerTurnLogic, isColorPickerOpen, gameMessage]);


    // Effect to auto-clear game messages
    useEffect(() => {
        if (gameMessage) {
            const timer = setTimeout(() => {
                // Avoid clearing critical messages like winner announcement or color choice prompt
                if (!winner && !isColorPickerOpen) {
                    // Keep UNO! message slightly longer
                    if (gameMessage !== 'UNO!') {
                        setGameMessage(null);
                    } else {
                        setTimeout(() => setGameMessage(null), 2500);
                    }
                }

            }, 2000); // Clear after 2 seconds generally
            return () => clearTimeout(timer);
        }
    }, [gameMessage, winner, isColorPickerOpen]);


    return {
        // Game State
        players,
        deck,
        discardPile,
        topOfDiscard,
        currentPlayerIndex,
        winner,
        isColorPickerOpen,
        playerCalledUno, // Whether player successfully called it this turn
        gameMessage,
        animatedCard,
        isPlayerTurn,

        // Game Handlers
        playCard,
        drawCard,
        callUno,
        selectColor,
        startGame,
        // setGameMessage, // Removed direct expose, handled internally
    };
}
