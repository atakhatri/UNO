document.addEventListener("DOMContentLoaded", () => {
  const colors = ["red", "yellow", "green", "blue"];
  const values = [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "skip",
    "reverse",
    "draw2",
  ];
  const wildValues = ["wild", "wild_draw4"];

  let deck = [];
  let players = []; // Array of player objects { id, hand, isHuman }
  let discardPile = [];
  let currentPlayerIndex = 0;
  let gameDirection = 1; // 1 for clockwise, -1 for counter-clockwise
  let chosenColor = null; // For wild cards
  let isAwaitingColorChoice = false;
  let turnTimerId = null;
  let hasPlayerCalledUno = false;
  let gameDifficulty = "normal"; // Default difficulty
  const TURN_DURATION = 45;

  const playerHandElement = document.getElementById("player-hand");
  const opponentHandsContainer = document.getElementById(
    "opponent-hands-container"
  );
  const discardPileElement = document.getElementById("discard-pile");
  const deckElement = document.getElementById("deck");
  const gameOverElement = document.getElementById("game-over");
  const winnerMessageElement = document.getElementById("winner-message");
  const playAgainBtn = document.getElementById("play-again-btn");
  const turnIndicatorElement = document.getElementById("turn-indicator");
  const colorPickerElement = document.getElementById("color-picker");
  const startScreenElement = document.getElementById("start-screen");
  const timerDisplayElement = document.getElementById("timer-display");
  const quitBtn = document.getElementById("quit-btn");
  const difficultyLevelElement = document.getElementById("difficulty-level");
  const difficultyDisplayElement =
    document.getElementById("difficulty-display");
  const unoButton = document.getElementById("uno-btn");
  const gameMessageElement = document.getElementById("game-message");

  function createDeck() {
    let newDeck = [];
    // Create standard cards
    for (const color of colors) {
      for (const value of values) {
        newDeck.push({ color, value });
        if (value !== "0") {
          // Each color has two of each card from 1-9, skip, reverse, draw2
          newDeck.push({ color, value });
        }
      }
    }
    // Create wild cards
    for (let i = 0; i < 4; i++) {
      newDeck.push({ color: "black", value: wildValues[0] });
      newDeck.push({ color: "black", value: wildValues[1] });
    }
    return newDeck;
  }

  function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  function dealCards() {
    let numCardsToDeal;
    if (gameDifficulty === "easy") numCardsToDeal = 5;
    else if (gameDifficulty === "hard") numCardsToDeal = 9;
    else numCardsToDeal = 7; // Normal

    players.forEach((player) => {
      // Reset hand before dealing
      player.hand = [];
      for (let i = 0; i < numCardsToDeal; i++) {
        player.hand.push(deck.pop());
      }
    });
  }

  function drawCards(playerIndex, numCards) {
    for (let i = 0; i < numCards; i++) {
      if (deck.length === 0) {
        reshuffleDiscardPile();
      }
      if (deck.length > 0) {
        const hand = players[playerIndex].hand;
        hand.push(deck.pop());
      } else {
        console.log("Deck is empty, cannot draw.");
        break; // Stop if deck is still empty after trying to reshuffle
      }
    }
  }

  function renderCard(card) {
    const cardDiv = document.createElement("div");
    cardDiv.classList.add("card", card.color);
    cardDiv.dataset.value = card.value;
    cardDiv.dataset.color = card.color;
    cardDiv.textContent = card.value.replace("_", " ");
    return cardDiv;
  }

  function renderHands() {
    playerHandElement.innerHTML = "";
    opponentHandsContainer.innerHTML = "";

    let suggestedCard = null;
    if (players[currentPlayerIndex]?.isHuman) {
      suggestedCard = findBestMoveForPlayer();
    }

    players.forEach((player, index) => {
      if (player.isHuman) {
        // Render the human player's hand at the bottom
        player.hand.forEach((card) => {
          const cardDiv = renderCard(card);

          // If this card is the suggested move, add the class
          if (
            suggestedCard &&
            card.color === suggestedCard.color &&
            card.value === suggestedCard.value
          ) {
            cardDiv.classList.add("suggested-card");
            // To avoid applying it to duplicates, we nullify it after first use
            suggestedCard = null;
          }

          if (currentPlayerIndex === index && !isAwaitingColorChoice) {
            cardDiv.addEventListener("click", () => onCardClick(card));
          }
          playerHandElement.appendChild(cardDiv);
        });
      }
    });

    // Render opponents in their designated positions
    const opponents = players.filter((p) => !p.isHuman);
    opponents.forEach((opponent, i) => {
      const handDiv = document.createElement("div");
      handDiv.classList.add("opponent-hand");
      handDiv.classList.add(`opponent-color-${i + 1}`); // Add unique color class
      handDiv.id = `player-${opponent.id}-hand`; // Add ID for animation source

      // Highlight the opponent if it's their turn
      if (opponent.id === currentPlayerIndex) {
        handDiv.classList.add("active-opponent");
      }

      // Assign position class based on number of players and opponent index
      if (players.length === 2) {
        // Player 2 is top
        handDiv.classList.add("opponent-top");
      } else if (players.length === 3) {
        // Player 2 left, Player 3 right
        handDiv.classList.add(i === 0 ? "opponent-left" : "opponent-right");
      } else if (players.length === 4) {
        // Player 2 left, 3 top, 4 right
        if (i === 0) handDiv.classList.add("opponent-left");
        if (i === 1) handDiv.classList.add("opponent-top");
        if (i === 2) handDiv.classList.add("opponent-right");
      }

      const label = document.createElement("div");
      label.classList.add("hand-label");
      label.textContent = `Player ${opponent.id + 1}`;

      const cardDisplay = document.createElement("div");
      cardDisplay.classList.add("card-display");

      // Create the stacked card effect
      const stackCount = Math.min(opponent.hand.length, 4);
      for (let j = 0; j < stackCount; j++) {
        const stackItem = document.createElement("div");
        stackItem.classList.add("card-stack-item");
        stackItem.style.transform = `translate(${j * 2}px, ${j * 2}px)`;
        cardDisplay.appendChild(stackItem);
      }

      const cardCount = document.createElement("div");
      cardCount.classList.add("card-count");
      cardCount.textContent = opponent.hand.length;

      cardDisplay.appendChild(cardCount);
      handDiv.appendChild(label);
      handDiv.appendChild(cardDisplay);

      opponentHandsContainer.appendChild(handDiv);
    });

    if (!discardPile.length) return; // Don't render discard pile if it's empty
    const topDiscard = discardPile[discardPile.length - 1];
    // Use chosenColor for the class if it's set (from a wild card)
    discardPileElement.className = `card ${topDiscard.color}`;
    discardPileElement.textContent = topDiscard.value.replace("_", " ");
    discardPileElement.dataset.value = topDiscard.value;
    discardPileElement.dataset.color = topDiscard.color;

    // Update turn indicator
    if (currentPlayerIndex < 0) return; // Game is over
    const currentPlayer = players[currentPlayerIndex];
    if (currentPlayer.isHuman) {
      turnIndicatorElement.textContent = "Your Turn";
      turnIndicatorElement.className = "player-turn";
    } else {
      turnIndicatorElement.textContent = `Player ${
        currentPlayerIndex + 1
      }'s Turn`;
      turnIndicatorElement.className = "computer-turn";
    }

    // --- UNO Button Logic ---
    const humanPlayer = players.find((p) => p.isHuman);
    if (
      humanPlayer &&
      humanPlayer.id === currentPlayerIndex &&
      humanPlayer.hand.length === 2 &&
      !isAwaitingColorChoice
    ) {
      unoButton.classList.remove("hidden");
    } else {
      unoButton.classList.add("hidden");
      unoButton.classList.remove("called"); // Reset visual state
      hasPlayerCalledUno = false; // Reset logical state
    }
  }

  function isValidMove(card, topDiscard) {
    const activeColor = chosenColor || topDiscard.color;
    return (
      card.color === activeColor ||
      card.value === topDiscard.value ||
      card.color === "black"
    );
  }

  function findBestMoveForPlayer() {
    const hand = players[currentPlayerIndex].hand;
    const topDiscard = discardPile[discardPile.length - 1];

    const validMoves = hand.filter((card) => isValidMove(card, topDiscard));
    if (validMoves.length === 0) return null;

    // Use the same logic as the computer AI to find the best move
    const colorMatch = validMoves.find(
      (card) => card.color === (chosenColor || topDiscard.color)
    );
    const valueMatch = validMoves.find(
      (card) => card.value === topDiscard.value
    );
    const wildCard = validMoves.find((card) => card.color === "black");

    return colorMatch || valueMatch || wildCard || validMoves[0];
  }

  function onCardClick(card) {
    stopTurnTimer();
    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer.isHuman) return;
    const topDiscard = discardPile[discardPile.length - 1];

    if (isValidMove(card, topDiscard)) {
      playCard(card, currentPlayerIndex);
    } else {
      alert("Invalid move!");
    }
  }

  function playCard(card, playerIndex) {
    const player = players[playerIndex];

    // Check for UNO call penalty
    if (player.isHuman && player.hand.length === 2 && !hasPlayerCalledUno) {
      showGameMessage("Forgot to call UNO! You draw 2 cards.", 2500);
      drawCards(playerIndex, 2);
      // We still let the card be played, but the penalty is applied.
      // Re-render hands to show the drawn cards before the animation.
      renderHands();
    }

    stopTurnTimer();
    // Find the source element for the animation
    let sourceElement;
    if (player.isHuman) {
      // Find the specific card element in the player's hand
      const cardSelector = `.card[data-color="${card.color}"][data-value="${card.value}"]`;
      sourceElement = Array.from(playerHandElement.children).find((el) =>
        el.matches(cardSelector)
      );
    } else {
      // Use the opponent's hand display as the source
      sourceElement = document.querySelector(
        `#player-${player.id}-hand .card-display`
      );
    }

    animateCardPlay(card, sourceElement, () => {
      // This callback runs after the animation is complete
      discardPile.push(card);
      player.hand = player.hand.filter((c) => c !== card);

      if (checkGameOver()) {
        renderHands(); // Render final state
        return;
      }

      chosenColor = null; // Reset chosen color after the card is officially in the discard pile
      handleSpecialCard(card);
    });

    // Immediately re-render hands to show the card leaving the hand
    renderHands();
  }

  function animateCardPlay(card, sourceElement, onAnimationEnd) {
    const cardClone = renderCard(card);
    cardClone.classList.add("animated-card");

    const sourceRect = sourceElement.getBoundingClientRect();
    const discardRect = discardPileElement.getBoundingClientRect();

    // Calculate center points for a more accurate animation
    const sourceCenterX = sourceRect.left + sourceRect.width / 2;
    const sourceCenterY = sourceRect.top + sourceRect.height / 2;
    const discardCenterX = discardRect.left + discardRect.width / 2;
    const discardCenterY = discardRect.top + discardRect.height / 2;

    // Set initial position of the clone
    cardClone.style.top = `${sourceCenterY - sourceRect.height / 2}px`;
    cardClone.style.left = `${sourceCenterX - sourceRect.width / 2}px`;

    document.body.appendChild(cardClone);

    // Animate to the discard pile's position
    requestAnimationFrame(() => {
      cardClone.style.top = `${discardCenterY - discardRect.height / 2}px`;
      cardClone.style.left = `${discardCenterX - discardRect.width / 2}px`;
      cardClone.style.transform = "scale(1)";
    });

    cardClone.addEventListener(
      "transitionend",
      () => {
        cardClone.remove();
        onAnimationEnd();
      },
      { once: true }
    );
  }
  function handleSpecialCard(card) {
    let skipTurn = false;
    const nextPlayerIndex =
      (currentPlayerIndex + gameDirection + players.length) % players.length;
    const player = players[currentPlayerIndex];
    const playerName = player.isHuman ? "You" : `Player ${player.id + 1}`;
    let message = "";

    switch (card.value) {
      case "draw2":
        drawCards(nextPlayerIndex, 2);
        skipTurn = true;
        message = `${playerName} played a Draw 2. Player ${
          nextPlayerIndex + 1
        } draws 2 and is skipped.`;
        break;
      case "skip":
        skipTurn = true;
        message = `${playerName} played a Skip. Player ${
          nextPlayerIndex + 1
        } is skipped.`;
        break;
      case "reverse":
        gameDirection *= -1;
        message = `${playerName} played a Reverse card. Play order is reversed.`;
        // In a 2-player game, reverse is effectively a skip
        if (players.length === 2) {
          skipTurn = true;
        }
        break;
      case "wild":
        isAwaitingColorChoice = true;
        if (players[currentPlayerIndex].isHuman) {
          promptPlayerForColor();
        } else {
          computerChooseColor();
        }
        return; // Don't switch turn yet, wait for color choice
      case "wild_draw4":
        isAwaitingColorChoice = true;
        drawCards(nextPlayerIndex, 4);
        if (players[currentPlayerIndex].isHuman) {
          promptPlayerForColor();
        } else {
          computerChooseColor();
        }
        skipTurn = true;
        return; // Don't switch turn yet
    }

    if (message) {
      showGameMessage(message, 3000);
      setTimeout(() => switchTurn(skipTurn), 3000);
    } else {
      // For regular number cards, switch turn immediately
      switchTurn(skipTurn);
    }
  }

  function switchTurn(skip = false) {
    const increment = skip ? 2 : 1;
    currentPlayerIndex =
      (currentPlayerIndex + gameDirection * increment + players.length) %
      players.length;

    renderHands();

    startTurnTimer();
    if (!players[currentPlayerIndex].isHuman) {
      setTimeout(computerTurn, 1200);
    }
  }

  function computerTurn() {
    if (players[currentPlayerIndex].isHuman) return;
    stopTurnTimer(); // The computer "thinks" instantly

    const topDiscard = discardPile[discardPile.length - 1];
    const hand = players[currentPlayerIndex].hand;
    const validMoves = hand.filter((card) => isValidMove(card, topDiscard));

    let cardToPlay;

    if (gameDifficulty === "easy" && validMoves.length > 0) {
      // Easy AI: Plays a random valid card, making it less strategic.
      cardToPlay = validMoves[Math.floor(Math.random() * validMoves.length)];
    } else {
      // Normal & Hard AI: Prioritize color match, then value match, then wild.
      // This logic is more effective.
      const colorMatch = validMoves.find(
        (card) => card.color === (chosenColor || topDiscard.color)
      );
      const valueMatch = validMoves.find(
        (card) => card.value === topDiscard.value
      );
      const wildCard = validMoves.find((card) => card.color === "black");
      cardToPlay = colorMatch || valueMatch || wildCard;
    }

    if (cardToPlay) {
      playCard(cardToPlay, currentPlayerIndex);
    } else {
      // Draw a card if no valid move
      drawCards(currentPlayerIndex, 1);
      switchTurn();
    }
  }

  function computerChooseColor() {
    const colorCounts = { red: 0, green: 0, blue: 0, yellow: 0 };
    const computerHand = players[currentPlayerIndex].hand;
    computerHand.forEach((card) => {
      if (card.color !== "black") {
        colorCounts[card.color]++;
      }
    });
    const bestColor = Object.keys(colorCounts).reduce((a, b) =>
      colorCounts[a] > colorCounts[b] ? a : b
    );
    handleColorChoice(bestColor);
  }

  function promptPlayerForColor() {
    colorPickerElement.classList.remove("hidden");
  }

  function handleColorChoice(color) {
    chosenColor = color;
    discardPileElement.className = `card ${chosenColor}`; // Visually update discard pile
    discardPileElement.dataset.color = chosenColor;
    colorPickerElement.classList.add("hidden");

    const lastPlayedCard = discardPile[discardPile.length - 1];
    const player = players[currentPlayerIndex];
    const playerName = player.isHuman ? "You" : `Player ${player.id + 1}`;
    const message = `${playerName} played a ${lastPlayedCard.value.replace(
      "_",
      " "
    )}.<br>The color is now ${color}.`;
    showGameMessage(message, 2500);

    isAwaitingColorChoice = false;
    const skip = lastPlayedCard.value === "wild_draw4";
    setTimeout(() => {
      switchTurn(skip);
    }, 500); // Short delay to let players read the message
  }

  function drawPlayerCard() {
    stopTurnTimer();
    if (!players[currentPlayerIndex].isHuman || isAwaitingColorChoice) return;
    drawCards(currentPlayerIndex, 1);
    switchTurn();
  }

  function showGameMessage(message, duration) {
    gameMessageElement.innerHTML = message;
    gameMessageElement.classList.remove("hidden");
    setTimeout(() => {
      gameMessageElement.classList.add("hidden");
    }, duration);
  }

  function startTurnTimer() {
    stopTurnTimer(); // Ensure no multiple timers are running
    let timeLeft = TURN_DURATION;
    timerDisplayElement.textContent = timeLeft;
    timerDisplayElement.style.color = "white";

    turnTimerId = setInterval(() => {
      timeLeft--;
      timerDisplayElement.textContent = timeLeft;
      if (timeLeft <= 10) {
        timerDisplayElement.style.color = "#ff5555"; // Turn red on low time
      }
      if (timeLeft <= 0) {
        stopTurnTimer();
        console.log(
          `Player ${currentPlayerIndex + 1}'s time ran out. Skipping turn.`
        );
        switchTurn(); // Skip turn
      }
    }, 1000);
  }

  function checkGameOver() {
    const winner = players.find((p) => p.hand.length === 0);
    if (winner) {
      const winnerName = winner.isHuman ? "You" : `Player ${winner.id + 1}`;
      endGame(winnerName);
      return true;
    }
    return false;
  }

  function stopTurnTimer() {
    clearInterval(turnTimerId);
    turnTimerId = null;
  }

  function endGame(winner) {
    gameOverElement.classList.remove("hidden");
    winnerMessageElement.textContent =
      winner === "You" ? "You win!" : `${winner} wins!`;
    currentPlayerIndex = -1; // Stop the game
    stopTurnTimer();
  }

  function reshuffleDiscardPile() {
    if (discardPile.length <= 1) return; // Can't reshuffle if there's nothing to take
    const topCard = discardPile.pop();
    deck = [...discardPile];
    discardPile = [topCard];
    shuffleDeck(deck);
    console.log("Deck reshuffled from discard pile.");
  }

  function initializeGame(numPlayers, difficulty) {
    document.body.classList.add("in-game");
    startScreenElement.classList.add("hidden");
    quitBtn.classList.remove("hidden");
    document.getElementById("game-board").classList.remove("hidden");
    difficultyDisplayElement.classList.remove("hidden");
    difficultyDisplayElement.textContent = `Difficulty: ${difficulty}`;

    gameDifficulty = difficulty;
    players = [];
    for (let i = 0; i < numPlayers; i++) {
      players.push({ id: i, hand: [], isHuman: i === 0 });
    }

    deck = createDeck();
    shuffleDeck(deck);
    discardPile = [];
    currentPlayerIndex = 0;
    gameDirection = 1;
    chosenColor = null;
    isAwaitingColorChoice = false;
    turnIndicatorElement.style.display = "block";
    timerDisplayElement.style.display = "flex";
    gameMessageElement.classList.add("hidden");

    dealCards();

    // Start the discard pile with a non-special card
    let firstCard = deck.pop();
    while (
      firstCard.color === "black" ||
      ["skip", "reverse", "draw2"].includes(firstCard.value)
    ) {
      deck.push(firstCard);
      shuffleDeck(deck);
      firstCard = deck.pop();
    }
    discardPile.push(firstCard);

    renderHands();
    startTurnTimer();
    gameOverElement.classList.add("hidden");
  }

  deckElement.addEventListener("click", drawPlayerCard);
  quitBtn.addEventListener("click", startGame);
  playAgainBtn.addEventListener("click", startGame);
  document.querySelectorAll(".player-option-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const numPlayers = parseInt(button.dataset.players, 10);
      const difficulty = difficultyLevelElement.value;
      initializeGame(numPlayers, difficulty);
    });
  });
  document.querySelectorAll(".color-box").forEach((box) => {
    box.addEventListener("click", (e) => {
      const color = e.target.dataset.color;
      handleColorChoice(color);
    });
  });

  unoButton.addEventListener("click", () => {
    hasPlayerCalledUno = true;
    unoButton.classList.add("called");
    showGameMessage("UNO!", 1500);
  });

  // Add an event listener for the difficulty dropdown to change its color
  difficultyLevelElement.addEventListener("change", (e) => {
    const difficulty = e.target.value;
    // Remove old classes and add the new one for styling
    e.target.classList.remove(
      "difficulty-easy",
      "difficulty-normal",
      "difficulty-hard"
    );
    e.target.classList.add(`difficulty-${difficulty}`);
  });

  function startGame() {
    document.body.classList.remove("in-game");
    startScreenElement.classList.remove("hidden");
    gameOverElement.classList.add("hidden");
    document.getElementById("game-board").classList.add("hidden");
    quitBtn.classList.add("hidden");
    turnIndicatorElement.style.display = "none";
    difficultyDisplayElement.classList.add("hidden");
    timerDisplayElement.style.display = "none";
    gameMessageElement.classList.add("hidden");

    // Set initial difficulty color on load/reset
    const initialDifficulty = difficultyLevelElement.value;
    difficultyLevelElement.classList.remove(
      "difficulty-easy",
      "difficulty-normal",
      "difficulty-hard"
    );
    difficultyLevelElement.classList.add(`difficulty-${initialDifficulty}`);
  }

  // Add a resize listener to handle responsive changes
  window.addEventListener("resize", () => {
    // If the game is running with more than 2 players on a small screen, restart.
    if (
      window.innerWidth <= 800 &&
      players.length > 2 &&
      document.body.classList.contains("in-game")
    ) {
      alert(
        "This mode is not supported on smaller screens. The game will restart."
      );
      startGame();
    }
  });
  // Initial setup
  startGame();
});
