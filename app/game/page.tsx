"use client";

import { FaCog, FaTimes } from "react-icons/fa";
import { CardComponent } from "../Card";
import {
  Card,
  createDeck,
  drawCards,
  isCardPlayable,
  shuffleDeck,
} from "../game-logic";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

interface AnimatedCard {
  card: Card;
  from: "deck" | "player" | "opponent";
  to: "player" | "discard" | "opponent";
  playerId?: number; // For drawing cards to a specific player
}

interface Player {
  id: number;
  hand: Card[];
  isComputer: boolean;
}

const difficultySettings = {
  easy: { playerCards: 5, computerCards: 7 },
  medium: { playerCards: 7, computerCards: 7 },
  hard: { playerCards: 7, computerCards: 9 },
};

const cardBackDesigns = {
  default: "bg-red-600",
  blue: "bg-blue-800",
  green: "bg-green-700",
};

const difficultyDisplay = {
  easy: { label: "Easy", bg: "bg-green-600" },
  medium: { label: "Medium", bg: "bg-yellow-500" },
  hard: { label: "Hard", bg: "bg-red-600" },
};

function Game() {
  const playerHandRef = useRef<HTMLDivElement>(null);
  const discardPileRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const difficulty =
    searchParams.get("difficulty") as keyof typeof difficultySettings || // prettier-ignore
    "medium";
  const numPlayers = parseInt(searchParams.get("players") || "2", 10);

  const [players, setPlayers] = useState<Player[]>([]);
  const [deck, setDeck] = useState<Card[]>([]);
  const [discardPile, setDiscardPile] = useState<Card[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [playDirection, setPlayDirection] = useState<1 | -1>(1); // 1 for clockwise, -1 for counter-clockwise
  const [winner, setWinner] = useState<Player | null>(null);

  const isPlayerTurn =
    players.length > 0 &&
    players[currentPlayerIndex] &&
    !players[currentPlayerIndex]?.isComputer;
  const [turnNumber, setTurnNumber] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [playedWildCard, setPlayedWildCard] = useState<Card | null>(null);
  const [isUnoState, setIsUnoState] = useState(false); // Player has one card left
  const [playerCalledUno, setPlayerCalledUno] = useState(false);
  const [gameMessage, setGameMessage] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [cardBack, setCardBack] =
    useState<keyof typeof cardBackDesigns>("default");
  const [animatedCard, setAnimatedCard] = useState<AnimatedCard | null>(null);

  type Color = "red" | "green" | "blue" | "yellow";

  useEffect(() => {
    startGame();
  }, [difficulty, numPlayers]);

  useEffect(() => {
    if (players[currentPlayerIndex]?.isComputer && !winner) {
      const timer = setTimeout(() => {
        computerTurn();
      }, 1000); // 1-second delay for the computer to "think"

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayerIndex, winner, players]);

  useEffect(() => {
    if (winner) return;

    // This effect handles the turn timer.
    // It's separated from the turn-change effect to avoid conflicts.
    const timerId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [winner]); // This timer should run continuously

  useEffect(() => {
    // When the turn changes, reset the timer.
    setTimeLeft(45);
  }, [currentPlayerIndex, turnNumber]);

  useEffect(() => {
    // When time runs out, switch the turn.
    if (timeLeft <= 0 && !winner) {
      setGameMessage("Time's up!");
      endTurn();
    }
  }, [timeLeft, winner, turnNumber]);

  useEffect(() => {
    if (gameMessage) {
      const timer = setTimeout(() => {
        setGameMessage(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [gameMessage]);

  const startGame = () => {
    const settings =
      difficultySettings[difficulty] || difficultySettings.medium;
    const newDeck = shuffleDeck(createDeck());
    let currentDeck = newDeck;

    const newPlayers: Player[] = [];
    for (let i = 0; i < numPlayers; i++) {
      const { drawn, remaining } = drawCards(
        currentDeck,
        i === 0 ? settings.playerCards : settings.computerCards
      );
      newPlayers.push({
        id: i,
        hand: drawn,
        isComputer: i !== 0, // Player 0 is human
      });
      currentDeck = remaining;
    }
    const deckAfterComputerDraw = currentDeck;

    // Start discard pile
    let firstCard: Card;
    let remainingDeck: Card[];
    do {
      const { drawn, remaining } = drawCards(deckAfterComputerDraw, 1);
      firstCard = drawn[0];
      remainingDeck = remaining;
    } while (
      firstCard.value === "wild" ||
      firstCard.value === "wild-draw-four"
    ); // For simplicity, don't start with a wild card

    setDiscardPile([firstCard]);
    setDeck(remainingDeck);
    setPlayers(newPlayers);
    setCurrentPlayerIndex(0);
    setPlayDirection(1);
    setWinner(null);
    setTurnNumber(1);
    setIsUnoState(false);
  };

  const endTurn = (skip = 1) => {
    setCurrentPlayerIndex((prev) => {
      const nextIndex =
        (prev + playDirection * skip + players.length) % players.length;
      return nextIndex;
    });
  };

  const handleDrawCard = (
    playerToDraw = currentPlayerIndex,
    isEffect = false
  ) => {
    // Block manual draw on computer's turn, but allow card effects
    if (!isPlayerTurn && !isEffect) return;
    if (winner) return;

    let currentDeck = deck;
    if (currentDeck.length === 0) {
      // Reshuffle discard pile into deck
      const newDeck = shuffleDeck(discardPile.slice(0, -1));
      setDeck(newDeck);
      currentDeck = newDeck;
      setDiscardPile((prev) => [prev[prev.length - 1]]);
    }

    const { drawn, remaining } = drawCards(currentDeck, 1);

    setAnimatedCard({
      card: drawn[0],
      from: "deck",
      to: playerToDraw === 0 ? "player" : "opponent",
      playerId: playerToDraw,
    });

    setTimeout(() => {
      setPlayers((prevPlayers) =>
        prevPlayers.map((p, i) =>
          i === playerToDraw ? { ...p, hand: [...p.hand, ...drawn] } : p
        )
      );
      setDeck(remaining);
      setIsUnoState(false); // Drawing a card negates UNO state
      setAnimatedCard(null);
      if (playerToDraw === currentPlayerIndex) {
        endTurn(); // Pass turn after drawing
      }
    }, 500);
  };

  const applyCardEffect = (card: Card, chosenColor?: Color) => {
    // This function will be called after a card is played
    switch (card.value) {
      case "draw-two": {
        const nextPlayerIndex =
          (currentPlayerIndex + playDirection + players.length) %
          players.length;
        handleDrawCard(nextPlayerIndex, true);
        handleDrawCard(nextPlayerIndex, true);
        // The turn is also skipped
        endTurn(2); // Skip next player
        setGameMessage("Draw Two!");
        break;
      }
      case "skip":
        endTurn(2); // Skip next player
        setGameMessage("Skip!");
        break;
      case "reverse":
        if (players.length === 2) {
          endTurn(2); // Acts like a skip in a 2-player game
        } else {
          setPlayDirection((prev) => (prev * -1) as 1 | -1);
          endTurn();
        }
        setGameMessage("Reverse!");
        break;
      case "wild": {
        const newCard = { ...card, color: chosenColor! };
        setDiscardPile((prev) => [...prev.slice(0, -1), newCard]);
        endTurn();
        break;
      }
      case "wild-draw-four": {
        const newCard = { ...card, color: chosenColor! };
        setDiscardPile((prev) => [...prev.slice(0, -1), newCard]);

        const nextPlayerIndex =
          (currentPlayerIndex + playDirection + players.length) %
          players.length;
        handleDrawCard(nextPlayerIndex, true);
        handleDrawCard(nextPlayerIndex, true);
        handleDrawCard(nextPlayerIndex, true);
        handleDrawCard(nextPlayerIndex, true);
        // The turn is also skipped
        endTurn(2);
        setGameMessage("Wild Draw Four!");
        break;
      }
      default:
        // No special effect, just switch turns
        endTurn();
    }
  };

  const handlePlayCard = (card: Card, index: number) => {
    if (!isPlayerTurn || winner) return;

    const topOfDiscard = discardPile[discardPile.length - 1];

    if (isCardPlayable(card, topOfDiscard)) {
      const currentPlayer = players[currentPlayerIndex];
      const newHand = [...currentPlayer.hand];
      newHand.splice(index, 1);

      setAnimatedCard({ card, from: "player", to: "discard" });

      setTimeout(() => {
        const newDiscardPile = [...discardPile, card];
        setPlayers((prevPlayers) =>
          prevPlayers.map((p, i) =>
            i === currentPlayerIndex ? { ...p, hand: newHand } : p
          )
        );
        setDiscardPile(newDiscardPile);
        setAnimatedCard(null);

        if (newHand.length === 0) {
          setWinner(currentPlayer);
          return;
        }

        // Check for UNO call penalty
        if (newHand.length === 1) {
          if (!playerCalledUno) {
            alert("You forgot to call UNO! You draw 2 cards.");
            const { drawn, remaining } = drawCards(deck, 2);
            // Add penalty cards to the hand that will be set
            newHand.push(...drawn);
            setDeck(remaining);
          }
        }
        // Reset UNO state after the play is complete
        setPlayerCalledUno(false);

        if (card.color === "black") {
          setPlayedWildCard(card);
          setIsColorPickerOpen(true);
        } else {
          // Apply card effect and switch turns accordingly
          applyCardEffect(card);
        }
      }, 500);
    } else {
      alert("You can't play that card!");
    }
  };

  const computerTurn = () => {
    if (winner) return;
    const computerPlayer = players[currentPlayerIndex];

    const topOfDiscard = discardPile[discardPile.length - 1];

    // --- Smarter AI Logic ---
    let cardToPlay: Card | null = null;
    let playableCardIndex = -1;

    // 1. Find all playable cards
    const playableCards = computerPlayer.hand
      .map((card, index) => ({ card, index }))
      .filter(({ card }) => isCardPlayable(card, topOfDiscard));

    if (playableCards.length > 0) {
      // 2. Prioritize matching color to get rid of cards
      const colorMatch = playableCards.find(
        ({ card }) => card.color === topOfDiscard.color
      );
      if (colorMatch) {
        cardToPlay = colorMatch.card;
        playableCardIndex = colorMatch.index;
      } else {
        // 3. If no color match, find a value match (but not a wild)
        const valueMatch = playableCards.find(
          ({ card }) =>
            card.value === topOfDiscard.value && card.color !== "black"
        );
        if (valueMatch) {
          cardToPlay = valueMatch.card;
          playableCardIndex = valueMatch.index;
        } else {
          // 4. As a last resort, play a wild card
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

    // If a playable card was found with the above logic
    if (cardToPlay && playableCardIndex !== -1) {
      const newHand = [...computerPlayer.hand];
      newHand.splice(playableCardIndex, 1);

      setAnimatedCard({ card: cardToPlay, from: "opponent", to: "discard" });

      setTimeout(() => {
        const newDiscardPile = [...discardPile, cardToPlay];
        setPlayers((prevPlayers) =>
          prevPlayers.map((p, i) =>
            i === currentPlayerIndex ? { ...p, hand: newHand } : p
          )
        );
        setDiscardPile(newDiscardPile);

        if (newHand.length === 0) {
          setWinner(computerPlayer);
          return;
        }
        if (newHand.length === 1) {
          // Computer "calls" UNO instantly
          console.log("Computer calls UNO!");
        }

        if (cardToPlay.color === "black") {
          // Smarter AI: choose the color it has the most of in its remaining hand
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
          // Find the color with the highest count. If no colored cards, default to a random one.
          let chosenColor = Object.keys(colorCounts).reduce(
            (a, b) => (colorCounts[a] > colorCounts[b] ? a : b),
            "red" // Default fallback
          ) as Color;

          console.log(`Computer chose ${chosenColor}`);
          applyCardEffect(cardToPlay, chosenColor);
        } else {
          // Apply card effect and switch turns accordingly
          applyCardEffect(cardToPlay);
        }
        setAnimatedCard(null);
      }, 500);
    } else {
      // Computer has no playable card, so it must draw.
      console.log("Computer is drawing a card.");
      let currentDeck = deck;
      if (currentDeck.length === 0) {
        const newDeck = shuffleDeck(discardPile.slice(0, -1));
        setDeck(newDeck);
        currentDeck = newDeck;
        setDiscardPile((prev) => [prev[prev.length - 1]]);
      }

      const { drawn, remaining } = drawCards(currentDeck, 1);
      const drawnCard = drawn[0];

      setAnimatedCard({
        card: drawnCard,
        from: "deck",
        to: "opponent",
        playerId: currentPlayerIndex,
      });
      setTimeout(() => {
        setPlayers((prevPlayers) =>
          prevPlayers.map((p, i) =>
            i === currentPlayerIndex
              ? { ...p, hand: [...p.hand, drawnCard] }
              : p
          )
        );
        setDeck(remaining);
        setAnimatedCard(null);
      }, 500);

      // Optional: AI can play the card if it's playable immediately after drawing.
      // For this implementation, we'll keep it simple: drawing ends the turn.

      // Pass turn to player
      endTurn();
    }
  };

  const handleColorSelect = (color: Color) => {
    if (playedWildCard) {
      applyCardEffect(playedWildCard, color);
      setIsColorPickerOpen(false);
      setPlayedWildCard(null);
    }
  };

  const handleUnoCall = () => {
    if (players[0]?.hand.length === 2) {
      setPlayerCalledUno(true);
    }
  };

  const topOfDiscard = discardPile[discardPile.length - 1];
  const player = players[0];
  const opponents = players.slice(1);
  if (!player) return null; // Still loading

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between p-8 bg-gradient-to-br from-gray-900 to-gray-800 text-white overflow-hidden">
      {/* Settings Button & Difficulty */}
      <div className="absolute top-4 right-4 z-30">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          aria-label="Open settings"
        >
          <FaCog size="1.5rem" />
        </button>
      </div>

      {/* Opponents' Hands */}
      <div className="w-full flex justify-around">
        {opponents.map((opponent) => (
          <div key={opponent.id} className="flex flex-col items-center">
            <h2 className="text-xl font-bold mb-2 text-center text-white/50">
              Player {opponent.id + 1} ({opponent.hand.length})
            </h2>
            {/* Overlapping cards for medium screens and up */}
            <div className="hidden md:relative md:flex justify-center h-28 items-center">
              {opponent.hand.map((_, index) => (
                <div
                  key={index}
                  className={`absolute w-16 h-24 ${cardBackDesigns[cardBack]} rounded-md border-2 border-black shadow-md`}
                  style={{
                    transform: `translateX(${
                      (index - opponent.hand.length / 2) * 20
                    }px)`,
                  }}
                ></div>
              ))}
            </div>
            {/* Single card "deck view" for mobile */}
            <div
              className={`md:hidden w-16 h-24 ${cardBackDesigns[cardBack]} rounded-md flex items-center justify-center border-2 border-black shadow-md`}
            ></div>
          </div>
        ))}
      </div>

      {/* Game Table */}
      <div className="flex items-end justify-center gap-8 my-8">
        {/* Deck */}
        <div className="flex flex-col items-center" ref={deckRef}>
          <p className="mb-2 font-semibold">Deck</p>
          <div
            className={`w-20 h-28 ${cardBackDesigns[cardBack]} rounded-lg border-2 border-black cursor-pointer hover:scale-105 transition-transform flex items-center justify-center`}
            onClick={() => handleDrawCard()}
          ></div>
        </div>

        {/* Timer and Turn Info */}
        <div className="flex flex-col items-center text-center pb-4">
          <div className="text-5xl font-mono font-bold">{timeLeft}s</div>
          <div className="text-xl font-semibold">
            {isPlayerTurn
              ? "Your Turn"
              : `Player ${currentPlayerIndex + 1}'s Turn`}
          </div>
        </div>

        {/* Discard Pile */}
        <div className="flex flex-col items-center" ref={discardPileRef}>
          <p className="mb-2 font-semibold">Discard Pile</p>
          {topOfDiscard && (
            <CardComponent
              card={topOfDiscard}
              className="animate-pop-in" // Animation for newly played card
            />
          )}
        </div>
      </div>

      {/* Player's Hand */}
      <div className="w-full">
        <h2 className="text-2xl font-bold mb-4 text-center">
          Your Hand ({player.hand.length})
        </h2>
        <div
          className="relative flex justify-center items-center"
          ref={playerHandRef}
        >
          {player.hand.length === 2 && !playerCalledUno && (
            <button
              onClick={handleUnoCall}
              className="absolute -top-16 z-10 px-8 py-4 bg-yellow-400 text-black font-bold text-2xl rounded-full shadow-lg animate-pulse hover:scale-110 transition-transform"
            >
              UNO!
            </button>
          )}
          <div className="flex justify-center gap-2 flex-wrap min-h-32 items-center">
            {player.hand.map((card, index) => (
              <CardComponent
                key={`${card.color}-${card.value}-${index}`}
                card={card}
                onClick={() => handlePlayCard(card, index)}
                className="animate-fade-in-up" // Animation for newly drawn card
              />
            ))}
          </div>
        </div>
      </div>

      {winner && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white/10 border border-white/20 rounded-xl p-8 text-center shadow-2xl">
            <h2 className="text-4xl font-bold mb-4">
              {winner.id === 0
                ? "You Won! 🎉"
                : `Player ${winner.id + 1} Won 😞`}
            </h2>
            <div className="flex gap-4 justify-center">
              <button
                onClick={startGame}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-xl font-semibold"
              >
                Play Again
              </button>
              <button
                onClick={() => router.push("/")}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg text-xl font-semibold"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {gameMessage && (
        <div className="absolute top-1/2 left-1/2 -translate-y-1/2 z-50 ml-48">
          <div className="bg-black/60 backdrop-blur-md text-white font-bold text-4xl px-8 py-6 rounded-2xl shadow-2xl animate-pop-in">
            {gameMessage}
          </div>
        </div>
      )}

      {animatedCard && (
        <div
          id="animated-card-container"
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
        >
          <CardComponent
            card={animatedCard.card}
            className={`absolute transition-all duration-500 ease-in-out z-50
              ${
                animatedCard.from === "deck" && animatedCard.to === "player"
                  ? "animate-deck-draw"
                  : ""
              }
              ${
                animatedCard.from === "deck" && animatedCard.to === "opponent"
                  ? "animate-opponent-draw"
                  : ""
              }
              ${animatedCard.from === "player" ? "animate-player-play" : ""}
              ${
                animatedCard.from === "opponent" ? "animate-opponent-play" : ""
              }`}
          />
        </div>
      )}

      {isSettingsOpen && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-2">
          <div className="bg-gray-800 border border-white/20 rounded-xl p-6 text-white shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Settings</h2>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-2 rounded-full hover:bg-white/10"
                aria-label="Close settings"
              >
                <FaTimes size="1.25rem" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Difficulty Display */}
              <div>
                <h3 className="font-semibold mb-2">Difficulty</h3>
                <div
                  className={`w-full text-center p-2 rounded-lg font-bold text-white ${difficultyDisplay[difficulty].bg}`}
                >
                  {difficultyDisplay[difficulty].label}
                </div>
              </div>

              {/* Card Back Design */}
              <div>
                <h3 className="font-semibold mb-3">Card Back Design</h3>
                <div className="grid grid-cols-3 gap-4">
                  {(
                    Object.keys(
                      cardBackDesigns
                    ) as (keyof typeof cardBackDesigns)[]
                  ).map((design) => (
                    <button
                      key={design}
                      onClick={() => setCardBack(design)}
                      className={`relative h-24 rounded-lg border-2 transition-all ${
                        cardBack === design
                          ? "border-blue-500 scale-105"
                          : "border-transparent hover:border-white/50"
                      }`}
                    >
                      <div
                        className={`w-full h-full ${cardBackDesigns[design]} rounded-md flex items-center justify-center border-2 border-black`}
                      >
                        <span className="text-white font-bold text-lg">
                          UNO
                        </span>
                      </div>
                      <p className="text-sm mt-2 capitalize font-medium">
                        {design}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Exit Game Button */}
              <div className=" pt-4">
                <button
                  onClick={() => router.push("/")}
                  className="w-full px-6 py-3 bg-red-600/80 hover:bg-red-700/80 rounded-lg text-lg font-semibold"
                >
                  Exit Game
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isColorPickerOpen && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 border border-white/20 rounded-xl p-8 text-center shadow-2xl">
            <h2 className="text-3xl font-bold mb-6">Choose a color</h2>
            <div className="flex gap-4">
              <button
                onClick={() => handleColorSelect("red")}
                className="w-24 h-24 rounded-full bg-red-500 hover:scale-110 transition-transform"
              ></button>
              <button
                onClick={() => handleColorSelect("green")}
                className="w-24 h-24 rounded-full bg-green-500 hover:scale-110 transition-transform"
              ></button>
              <button
                onClick={() => handleColorSelect("blue")}
                className="w-24 h-24 rounded-full bg-blue-500 hover:scale-110 transition-transform"
              ></button>
              <button
                onClick={() => handleColorSelect("yellow")}
                className="w-24 h-24 rounded-full bg-yellow-400 hover:scale-110 transition-transform"
              ></button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Game />
    </Suspense>
  );
}
