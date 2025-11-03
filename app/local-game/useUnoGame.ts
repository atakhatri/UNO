"use client";

import { useState, useEffect, useCallback } from "react";
import {
    createDeck,
    shuffleDeck,
    drawCards,
    isCardPlayable,
    Card,
} from "../game-logic";
import type { Player, Color } from "./game-types";
import type { AnimatedCard } from "../game/game-types";

const ANIMATION_DURATION = 500;

export function useUnoGame(numPlayers: number) {
    const [players, setPlayers] = useState<Player[]>([]);
    const [deck, setDeck] = useState<Card[]>([]);
    const [discardPile, setDiscardPile] = useState<Card[]>([]);
    const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
    const [playDirection, setPlayDirection] = useState<1 | -1>(1);
    const [winner, setWinner] = useState<Player | null>(null);

    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const [playedWildCard, setPlayedWildCard] = useState<Card | null>(null);
    const [playerCalledUno, setPlayerCalledUno] = useState(false);

    const [gameMessage, setGameMessage] = useState<string | null>(null);
    const [animatedCard, setAnimatedCard] = useState<AnimatedCard | null>(null);

    const isPlayerTurn = players[currentPlayerIndex]?.isComputer === false;
    const topOfDiscard = discardPile[discardPile.length - 1];

    const reshuffleDeck = useCallback(() => {
        console.log("Reshuffling deck...");
        if (discardPile.length <= 1) {
            console.warn("Not enough cards in discard pile to reshuffle.");
            return [];
        }
        const topCard = discardPile[discardPile.length - 1];
        const restOfPile = discardPile.slice(0, -1);
        const newDeck = shuffleDeck(restOfPile);

        setDeck(newDeck);
        setDiscardPile([topCard]);
        setGameMessage("Deck reshuffled!");
        return newDeck;
    }, [discardPile]);

    const endTurn = useCallback(
        (skip = 1) => {

            const currentPlayer = players[currentPlayerIndex];
            if (currentPlayer?.hand.length === 1) {
                if (currentPlayer.id === 0 && !playerCalledUno) {
                    setGameMessage("You forgot to call UNO! Draw 2.");
                } else if (currentPlayer.isComputer) {
                    setGameMessage(`Player ${currentPlayer.id + 1} calls UNO!`);
                }
            }

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

    const drawCardFromDeck = useCallback(
        (playerIndex: number, count: number): Card[] => {
            let currentDeck = [...deck];
            if (currentDeck.length < count) {
                const reshuffled = reshuffleDeck();
                if (reshuffled.length < count) {
                    console.error("Not enough cards to draw even after reshuffle!");
                    setGameMessage("Not enough cards left!");
                    return [];
                }
                currentDeck = reshuffled;
            }


            const { drawn, remaining } = drawCards(currentDeck, count);

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

            return remaining;
        },
        [deck, reshuffleDeck]
    );

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
                    endTurn(2);
                    break;
                case "skip":
                    setGameMessage("Skip!");
                    endTurn(2);
                    break;
                case "reverse":
                    setGameMessage("Reverse!");
                    if (players.length === 2) {
                        endTurn(2);
                    } else {
                        const newDirection = (playDirection * -1) as 1 | -1;
                        setPlayDirection(newDirection);
                        setCurrentPlayerIndex(
                            (currentPlayerIndex + newDirection + players.length) % players.length
                        );

                    }
                    break;
                case "wild":
                    if (!chosenColor) {
                        console.error("Chosen color missing for wild card effect");
                        endTurn();
                        break;
                    }
                    setGameMessage(`Color changed to ${chosenColor}!`);

                    setDiscardPile((prev) => [
                        ...prev.slice(0, -1),
                        { ...card, color: chosenColor },
                    ]);
                    endTurn();
                    break;
                case "wild-draw-four":
                    if (!chosenColor) {
                        console.error("Chosen color missing for wild-draw-four effect");
                        endTurn();
                        break;
                    }
                    setGameMessage(`Wild Draw Four! Color is ${chosenColor}!`);
                    setDiscardPile((prev) => [
                        ...prev.slice(0, -1),
                        { ...card, color: chosenColor },
                    ]);
                    drawCardFromDeck(nextPlayerIndex, 4);
                    endTurn(2);
                    break;
                default:
                    endTurn();
            }
        },
        [currentPlayerIndex, drawCardFromDeck, endTurn, playDirection, players.length]
    );

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

    const playCard = useCallback(
        (card: Card, handIndex: number) => {
            if (winner || !isPlayerTurn) return;

            if (!isCardPlayable(card, topOfDiscard)) {
                setGameMessage("You can't play that card!");
                setTimeout(() => setGameMessage(null), 1500);
                return;
            }

            const currentPlayer = players[currentPlayerIndex];
            let newHand = [...currentPlayer.hand];
            newHand.splice(handIndex, 1);
            let newDeck = [...deck];


            let drewPenaltyCards = false;
            if (newHand.length === 1 && !playerCalledUno) {
                drewPenaltyCards = true;
                setGameMessage("Forgot to call UNO! Drawing 2 cards.");
                if (newDeck.length < 2) {
                    const reshuffled = reshuffleDeck();
                    if (reshuffled.length < 2) {
                        console.error("Not enough cards for penalty draw!");
                    } else {
                        newDeck = reshuffled;
                    }
                }
                if (newDeck.length >= 2) {
                    const { drawn, remaining } = drawCards(newDeck, 2);
                    newHand.push(...drawn);
                    newDeck = remaining;
                }

            }

            setPlayers((prevPlayers) =>
                prevPlayers.map((p, i) =>
                    i === currentPlayerIndex ? { ...p, hand: newHand } : p
                )
            );
            setDeck(newDeck);

            setPlayerCalledUno(false);


            setAnimatedCard({
                id: `${Date.now()}-${card.value}`,
                card: card,
                type: "play",
            });

            setTimeout(() => {
                setDiscardPile((prev) => [...prev, card]);
                setAnimatedCard(null);

                if (newHand.length === 0 && !drewPenaltyCards) {
                    setWinner(currentPlayer);
                    setGameMessage(`${currentPlayer.name} Wins! 🎉`);
                    return;
                }

                if (card.color === "black") {
                    setPlayedWildCard(card);
                    setIsColorPickerOpen(true);
                } else if (!drewPenaltyCards) {
                    applyCardEffect(card);
                } else {
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
            endTurn
        ]
    );

    const drawCard = useCallback(() => {
        if (!isPlayerTurn || winner) return;

        let currentDeck = [...deck];
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
            endTurn();
        }, ANIMATION_DURATION);
    }, [isPlayerTurn, winner, deck, reshuffleDeck, endTurn]);

    const computerTurnLogic = useCallback(() => {
        if (winner || isPlayerTurn) return;

        const computerPlayer = players[currentPlayerIndex];
        if (!computerPlayer || !computerPlayer.isComputer) return;

        let cardToPlay: Card | null = null;
        let playableCardIndex = -1;

        const playableCards = computerPlayer.hand
            .map((card, index) => ({ card, index }))
            .filter(({ card }) => isCardPlayable(card, topOfDiscard));

        if (playableCards.length > 0) {
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
                cardToPlay = playableCards[0].card;
                playableCardIndex = playableCards[0].index;
            }
        }


        if (cardToPlay && playableCardIndex !== -1) {
            const newHand = [...computerPlayer.hand];
            newHand.splice(playableCardIndex, 1);

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
            setGameMessage(`Player ${computerPlayer.id + 1} is drawing a card.`);
            drawCardFromDeck(currentPlayerIndex, 1);
            setTimeout(() => {
                endTurn();
            }, ANIMATION_DURATION + 50);
        }
    }, [
        winner,
        isPlayerTurn,
        players,
        currentPlayerIndex,
        topOfDiscard,
        drawCardFromDeck,
        applyCardEffect,
        endTurn,
    ]);

    const callUno = () => {
        if (players[0]?.hand.length === 2 && isPlayerTurn) {
            setGameMessage("UNO!");
            setPlayerCalledUno(true);
            setTimeout(() => setGameMessage(null), 1500);
        } else {
            setGameMessage("You can only call UNO when you have 2 cards!");
            setTimeout(() => setGameMessage(null), 1500);
        }
    };

    const selectColor = (color: Color) => {
        if (playedWildCard) {
            applyCardEffect(playedWildCard, color);
            setIsColorPickerOpen(false);
            setPlayedWildCard(null);
        }
    };
    const startGame = useCallback(() => {
        let currentDeck = shuffleDeck(createDeck());

        const newPlayers: Player[] = [];
        for (let i = 0; i < numPlayers; i++) {
            const cardCount = 7;

            const { drawn, remaining } = drawCards(currentDeck, cardCount);
            newPlayers.push({
                id: i,
                uid: `player-${i}`,
                name: i === 0 ? "You" : `Player ${i + 1}`,
                hand: drawn,
                isComputer: i !== 0,
            });
            currentDeck = remaining;
        }

        let firstCard: Card;
        do {
            if (currentDeck.length === 0) {
                console.error("Ran out of cards setting up discard pile!");
                firstCard = { color: 'red', value: '1' };
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
    }, [numPlayers]);

    useEffect(() => {
        startGame();
    }, [startGame]);

    useEffect(() => {
        if (
            gameMessage !== 'Game started!' &&
            players[currentPlayerIndex]?.isComputer &&
            !winner &&
            !animatedCard &&
            !isColorPickerOpen
        ) {
            const timer = setTimeout(() => {
                computerTurnLogic();
            }, 1000 + Math.random() * 500);

            return () => clearTimeout(timer);
        }
    }, [currentPlayerIndex, winner, players, animatedCard, computerTurnLogic, isColorPickerOpen, gameMessage]);

    useEffect(() => {
        if (gameMessage) {
            const timer = setTimeout(() => {
                if (!winner && !isColorPickerOpen) {
                    if (gameMessage !== 'UNO!') {
                        setGameMessage(null);
                    } else {
                        setTimeout(() => setGameMessage(null), 2500);
                    }
                }

            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [gameMessage, winner, isColorPickerOpen]);


    return {
        players,
        deck,
        discardPile,
        topOfDiscard,
        currentPlayerIndex,
        winner,
        isColorPickerOpen,
        playerCalledUno,
        gameMessage,
        animatedCard,
        isPlayerTurn,
        playCard,
        drawCard,
        callUno,
        selectColor,
        startGame,
    };
}
